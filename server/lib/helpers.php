<?php
/**
 * 通用辅助：JSON 响应、输入读取、CSRF、分页等。
 */

function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_ok($data = null): void {
    json_out(['ok' => true, 'data' => $data]);
}

function json_err(string $msg, int $code = 400, $extra = null): void {
    $body = ['ok' => false, 'error' => $msg];
    if ($extra !== null) $body['detail'] = $extra;
    json_out($body, $code);
}

/** 读取 JSON body 或表单 */
function input(): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $raw = file_get_contents('php://input');
    $data = [];
    if ($raw !== '' && $raw !== false) {
        $json = json_decode($raw, true);
        if (is_array($json)) $data = $json;
    }
    if (!empty($_POST)) $data = array_merge($data, $_POST);
    $cache = $data;
    return $data;
}

function inp(string $k, $d = '') {
    $data = input();
    return array_key_exists($k, $data) ? $data[$k] : $d;
}

function client_ip(): string {
    foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $h) {
        if (!empty($_SERVER[$h])) {
            $ip = trim(explode(',', $_SERVER[$h])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// ---- CSRF（用在 API 写操作与后台表单）----
function csrf_token(): string {
    if (empty($_SESSION['_csrf'])) {
        $_SESSION['_csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['_csrf'];
}

function csrf_check(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? inp('_csrf', '');
    if (empty($_SESSION['_csrf']) || !hash_equals($_SESSION['_csrf'], (string)$token)) {
        json_err('CSRF 令牌无效，请刷新页面重试', 419);
    }
}

// JSON 列编解码（MySQL JSON 取出是字符串）
function from_json($v, $d = null) {
    if ($v === null || $v === '') return $d;
    if (is_array($v)) return $v;
    $dec = json_decode($v, true);
    return $dec === null ? $d : $dec;
}

function to_json($v): string {
    return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
