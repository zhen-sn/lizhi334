<?php
/**
 * 订单：创建支付 / 我的订单 / 支付异步通知与同步返回。
 */
require_once __DIR__ . '/../lib/payment.php';

return function (Router $r) {

    $r->post('/orders/create', function () {
        csrf_check();
        $u = current_user();
        try {
            $o = order_create(
                $u ? (int)$u['id'] : null,
                (string)inp('subject', ''),
                (string)inp('amount', ''),
                (string)inp('channel', 'alipay'),
                trim((string)inp('contact', ''))
            );
        } catch (RuntimeException $e) {
            json_err($e->getMessage());
        }
        json_ok($o);
    });

    $r->get('/orders/mine', function () {
        $u = require_user();
        $st = db()->prepare('SELECT order_no,subject,amount,provider,channel,status,created_at,paid_at
                             FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 50');
        $st->execute([$u['id']]);
        json_ok(array_map(fn($r) => [
            'orderNo' => $r['order_no'], 'subject' => $r['subject'], 'amount' => (float)$r['amount'],
            'provider' => $r['provider'], 'channel' => $r['channel'], 'status' => $r['status'],
            'createdAt' => strtotime($r['created_at']) * 1000,
            'paidAt' => $r['paid_at'] ? strtotime($r['paid_at']) * 1000 : null,
        ], $st->fetchAll()));
    });

    $r->get('/payment/info', function () {
        $p = payment_provider();
        json_ok(['enabled' => $p !== '', 'provider' => $p]);
    });

    $r->get('/orders/status/{no}', function ($p) {
        $o = order_find($p['no']);
        if (!$o) json_err('订单不存在', 404);
        json_ok([
            'orderNo' => $o['order_no'], 'status' => $o['status'],
            'subject' => $o['subject'], 'amount' => (float)$o['amount'],
            'paidAt' => $o['paid_at'] ? strtotime($o['paid_at']) * 1000 : null,
        ]);
    });

    $notify = function ($p) {
        $provider = $p['provider'] ?? '';
        if (!in_array($provider, ['codepay', 'epay'], true)) json_err('未知支付通道', 404);
        $data = array_merge($_GET, $_POST);
        if (!pay_verify_notify($data, $provider)) {
            error_log('payment notify sign error: ' . $provider . ' ' . json_encode($data, JSON_UNESCAPED_UNICODE));
            http_response_code(400);
            echo 'sign error';
            exit;
        }
        $outNo = (string)($data['out_trade_no'] ?? '');
        $status = strtoupper((string)($data['trade_status'] ?? ''));
        if ($outNo === '' || !in_array($status, ['TRADE_SUCCESS', 'SUCCESS'], true)) {
            echo 'success';
            exit;
        }
        $order = order_find($outNo);
        if (!$order) {
            error_log('payment notify: order not found ' . $outNo);
            echo 'success';
            exit;
        }
        $money = (float)($data['money'] ?? $data['price'] ?? 0);
        if ($money > 0 && abs($money - (float)$order['amount']) > 0.01) {
            error_log('payment notify: amount mismatch ' . $outNo . ' ' . $money);
            echo 'fail';
            exit;
        }
        order_mark_paid($outNo, (string)($data['trade_no'] ?? $data['pay_no'] ?? ''), $data);
        echo 'success';
        exit;
    };
    $r->post('/payment/notify/{provider}', $notify);
    $r->get('/payment/notify/{provider}', $notify);

    $r->get('/payment/return/{provider}', function () {
        header('Location: /?pay=success');
        exit;
    });
};