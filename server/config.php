<?php
/**
 * 全局配置。位于 public 之上，不会被 Web 直接访问。
 * 可在同目录下创建 .env 覆盖（KEY=VALUE 格式，# 开头为注释）。
 */

// ---- 读取可选的 .env ----
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $eq = strpos($line, '=');
        if ($eq === false) continue;
        $k = trim(substr($line, 0, $eq));
        $v = trim(substr($line, $eq + 1));
        if ($v !== '' && $v[0] === '"' && substr($v, -1) === '"') $v = substr($v, 1, -1);
        if (getenv($k) === false) putenv("$k=$v");
    }
}

function env($k, $d = '') {
    $v = getenv($k);
    return $v === false || $v === '' ? $d : $v;
}

// ---- 数据库（凭据放在 server/.env，不要写进本文件或提交到仓库） ----
define('DB_HOST', env('DB_HOST', '127.0.0.1'));
define('DB_PORT', env('DB_PORT', '3306'));
define('DB_NAME', env('DB_NAME', 'lizhi_music'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', 'utf8mb4');

// ---- 应用 ----
define('APP_NAME', '李志 · 叁叁肆');
define('APP_URL', env('APP_URL', ''));
define('ADMIN_PATH', '/admin');
define('API_PREFIX', '/api');

// 上传目录（放在 public 下，浏览器可访问）
define('UPLOAD_DIR', __DIR__ . '/public/uploads');
define('UPLOAD_URL', '/uploads');

// Session
define('SESSION_NAME', 'lizhi_session');
define('ADMIN_SESSION_NAME', 'lizhi_admin');

// 时区
date_default_timezone_set('Asia/Shanghai');

// 错误显示（生产可关）
ini_set('display_errors', env('APP_DEBUG', '1') ? '1' : '0');
error_reporting(E_ALL);
