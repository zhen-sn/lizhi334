<?php
/**
 * 会话与鉴权。
 * 前端用户与后台管理员使用不同的 session 名，互不干扰。
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

function start_user_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 86400 * 30,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function start_admin_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name(ADMIN_SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ---- 前端用户 ----
function current_user(): ?array {
    start_user_session();
    if (!empty($_SESSION['uid'])) {
        static $u = null;
        if ($u === null) {
            $st = db()->prepare('SELECT id,name,email,avatar,bio,role,must_change_password FROM users WHERE id=? AND status=1');
            $st->execute([$_SESSION['uid']]);
            $u = $st->fetch() ?: null;
            if ($u) $u['id'] = (int)$u['id'];
        }
        return $u;
    }
    return null;
}

function require_user(): array {
    $u = current_user();
    if (!$u) json_err('请先登录', 401);
    return $u;
}

function login_user(int $uid): void {
    start_user_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $uid;
    db()->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([$uid]);
}

function logout_user(): void {
    start_user_session();
    $_SESSION = [];
    session_destroy();
}

// ---- 后台管理员 ----
function current_admin(): ?array {
    start_admin_session();
    if (!empty($_SESSION['admin_id'])) {
        static $a = null;
        if ($a === null) {
            $st = db()->prepare('SELECT id,name,email,role,must_change_password FROM users WHERE id=? AND role="admin" AND status=1');
            $st->execute([$_SESSION['admin_id']]);
            $a = $st->fetch() ?: null;
            if ($a) $a['id'] = (int)$a['id'];
        }
        return $a;
    }
    return null;
}

function require_admin(): array {
    $a = current_admin();
    if (!$a) {
        if (str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            json_err('未登录或登录已过期', 401);
        }
        header('Location: ' . ADMIN_PATH . '/login');
        exit;
    }
    return $a;
}

function login_admin(int $id): void {
    start_admin_session();
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $id;
    db()->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([$id]);
}

function logout_admin(): void {
    start_admin_session();
    $_SESSION = [];
    session_destroy();
}

function log_admin(string $action, string $target = '', $detail = null): void {
    $a = current_admin();
    if (!$a) return;
    db()->prepare(
        'INSERT INTO admin_logs (admin_id,admin_name,action,target,detail,ip) VALUES (?,?,?,?,?,?)'
    )->execute([
        $a['id'], $a['name'], $action, $target,
        $detail === null ? null : to_json($detail),
        client_ip(),
    ]);
}
