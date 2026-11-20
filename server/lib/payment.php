<?php
/**
 * 订单与支付：码支付 / 易支付（MD5 签名），后台可手动补单。
 * 表：orders（见 schema.sql）
 */
require_once __DIR__ . '/settings.php';

function payment_provider(): string {
    $p = (string)setting('pay_provider', '');
    return in_array($p, ['codepay', 'epay'], true) ? $p : '';
}

function app_base_url(): string {
    if (defined('APP_URL') && APP_URL !== '') return rtrim(APP_URL, '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') === '443';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return ($https ? 'https' : 'http') . '://' . $host;
}

function pay_notify_url(string $provider): string {
    return app_base_url() . API_PREFIX . '/payment/notify/' . $provider;
}

function pay_return_url(string $orderNo): string {
    return app_base_url() . '/?pay=1&out_trade_no=' . rawurlencode($orderNo);
}

function order_new_no(): string {
    return date('YmdHis') . str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

/** 创建订单并返回支付跳转地址；未开启支付或参数错误时抛 RuntimeException。 */
function order_create(?int $uid, string $subject, string $amount, string $channel = 'alipay', string $contact = ''): array {
    $provider = payment_provider();
    if ($provider === '') throw new RuntimeException('站点未开启在线支付');
    $amount = number_format((float)$amount, 2, '.', '');
    if ((float)$amount < 0.01 || (float)$amount > 50000) throw new RuntimeException('金额需在 0.01 ~ 50000 之间');
    if (!in_array($channel, ['alipay', 'wxpay'], true)) throw new RuntimeException('不支持的支付方式');
    $subject = trim($subject) !== '' ? mb_substr(trim($subject), 0, 60) : '赞助支持';
    $orderNo = order_new_no();
    $gateway = rtrim((string)setting('pay_' . $provider . '_url', ''), '/');
    if ($gateway === '') throw new RuntimeException('支付接口地址未配置');
    if (!str_ends_with($gateway, '.php')) $gateway .= '/submit.php';

    db()->prepare('INSERT INTO orders (order_no,user_id,subject,amount,provider,channel,status,contact) VALUES (?,?,?,?,?,?,\'pending\',?)')
        ->execute([$orderNo, $uid, $subject, $amount, $provider, $channel, $contact !== '' ? mb_substr($contact, 0, 60) : null]);

    if ($provider === 'epay') {
        $pid = (string)setting('pay_epay_pid', '');
        $key = (string)setting('pay_epay_key', '');
        $params = [
            'pid' => $pid,
            'type' => $channel,
            'out_trade_no' => $orderNo,
            'notify_url' => pay_notify_url($provider),
            'return_url' => pay_return_url($orderNo),
            'name' => $subject,
            'money' => $amount,
            'sign_type' => 'MD5',
        ];
        $params['sign'] = md5($pid . $orderNo . $params['notify_url'] . $params['return_url'] . $subject . $amount . $key);
    } else {
        $pid = (string)setting('pay_codepay_id', '');
        $key = (string)setting('pay_codepay_key', '');
        $sitename = (string)setting('site_name', '叁叁肆');
        $params = [
            'pid' => $pid,
            'type' => $channel === 'wxpay' ? '2' : '1',
            'out_trade_no' => $orderNo,
            'notify_url' => pay_notify_url($provider),
            'return_url' => pay_return_url($orderNo),
            'name' => $subject,
            'money' => $amount,
            'sitename' => $sitename,
            'sign_type' => 'MD5',
        ];
        $params['sign'] = md5($pid . $params['type'] . $orderNo . $params['notify_url'] . $params['return_url'] . $subject . $amount . $sitename . $key);
    }

    return [
        'orderNo' => $orderNo,
        'amount' => $amount,
        'provider' => $provider,
        'payUrl' => $gateway . '?' . http_build_query($params),
    ];
}

/** 校验异步回调签名（兼容排序拼接与码支付顺序拼接两种常见实现）。 */
function pay_verify_notify(array $p, string $provider): bool {
    $key = (string)setting('pay_' . $provider . '_key', '');
    $sign = strtolower((string)($p['sign'] ?? ''));
    if ($key === '' || $sign === '') return false;

    $data = $p;
    unset($data['sign'], $data['sign_type']);
    ksort($data);
    $pairs = [];
    foreach ($data as $k => $v) {
        if (is_array($v) || $v === '') continue;
        $pairs[] = $k . '=' . $v;
    }
    $q = implode('&', $pairs);
    $cands = [md5($q . $key), md5($q . '&key=' . $key)];

    if ($provider === 'codepay') {
        foreach ([
            ['pid', 'type', 'out_trade_no', 'notify_url', 'return_url', 'name', 'money', 'sitename'],
            ['pay_no', 'pay_id', 'price', 'money', 'out_trade_no', 'trade_status'],
            ['pay_id', 'pay_no', 'price', 'money', 'out_trade_no', 'trade_status'],
        ] as $fields) {
            $str = '';
            foreach ($fields as $f) $str .= (string)($p[$f] ?? '');
            $cands[] = md5($str . $key);
        }
    }
    foreach ($cands as $c) {
        if (hash_equals($c, $sign)) return true;
    }
    return false;
}

/** 按订单号置为已支付（幂等），返回是否本次真正更新。 */
function order_mark_paid(string $orderNo, string $tradeNo = '', ?array $raw = null): bool {
    $st = db()->prepare("UPDATE orders SET status='paid', trade_no=?, paid_at=NOW(), raw=? WHERE order_no=? AND status<>'paid'");
    $st->execute([$tradeNo !== '' ? $tradeNo : null, $raw === null ? null : json_encode($raw, JSON_UNESCAPED_UNICODE), $orderNo]);
    return $st->rowCount() > 0;
}

function order_find(string $orderNo): ?array {
    $st = db()->prepare('SELECT * FROM orders WHERE order_no=?');
    $st->execute([$orderNo]);
    $r = $st->fetch();
    return $r ?: null;
}