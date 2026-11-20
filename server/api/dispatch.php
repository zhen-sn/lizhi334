<?php
/**
 * API 分发：把各模块的路由注册到同一个 Router。
 */
require_once __DIR__ . '/../lib/router.php';

start_user_session(); // 保证 session / csrf 可用

// 统一异常出口：任何未捕获错误都返回 JSON，避免前端拿到 HTML
set_exception_handler(function (Throwable $e) {
    error_log((string)$e);
    $debug = env('APP_DEBUG', '1') === '1';
    json_err($debug ? $e->getMessage() : '服务器内部错误', 500);
});

$router = new Router();

// 短视频互动路由需先注册，避免被 content.php 的 /shorts/{id} 抢先匹配
(require __DIR__ . '/orders.php')($router);
(require __DIR__ . '/shorts.php')($router);
(require __DIR__ . '/content.php')($router);
(require __DIR__ . '/auth.php')($router);
(require __DIR__ . '/comments.php')($router);
(require __DIR__ . '/library.php')($router);
(require __DIR__ . '/uploads.php')($router);
(require __DIR__ . '/report.php')($router);

$sub = substr(route_path(), strlen(API_PREFIX));
$router->dispatch(method(), $sub ?: '/');
