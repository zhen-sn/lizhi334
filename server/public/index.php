<?php
/**
 * 前端控制器（同域部署的唯一入口）。
 *  /api/*   → JSON 接口（React 前端）
 *  /admin*  → 后台页面与表单（PHP 渲染）
 *  其它     → 静态资源（返回 false 交由 Web 服务器直接读取）
 */
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/router.php';

$path = route_path();

// API
if ($path === API_PREFIX || str_starts_with($path, API_PREFIX . '/')) {
    require __DIR__ . '/../api/dispatch.php';
    exit;
}

// 后台
if ($path === ADMIN_PATH || str_starts_with($path, ADMIN_PATH . '/')) {
    require __DIR__ . '/../admin/dispatch.php';
    exit;
}

// 静态文件交给服务器直接处理
return false;
