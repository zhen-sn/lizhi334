<?php
/**
 * 前端用户：注册 / 登录 / 登出 / 当前用户 / 修改密码。
 */
return function (Router $r) {

    $r->post('/auth/register', function () {
        csrf_check();
        $name = trim(inp('name', ''));
        $email = strtolower(trim(inp('email', '')));
        $pass = (string)inp('password', '');
        $confirm = (string)inp('passwordConfirm', '');
        if (mb_strlen($name) < 2) json_err('昵称至少 2 个字符');
        if (mb_strlen($name) > 16) json_err('昵称最多 16 个字符');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('请输入有效的邮箱');
        if (strlen($pass) < 6) json_err('密码至少 6 位');
        if ($confirm !== '' && $confirm !== $pass) json_err('两次输入的密码不一致');
        $exists = db()->prepare('SELECT id FROM users WHERE email=?');
        $exists->execute([$email]);
        if ($exists->fetch()) json_err('该邮箱已注册，可直接登录');
        $hash = password_hash($pass, PASSWORD_BCRYPT);
        $st = db()->prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,"user")');
        $st->execute([$name, $email, $hash]);
        $uid = (int)db()->lastInsertId();
        // 初始化统计行
        db()->prepare('INSERT INTO user_profile_stats (user_id) VALUES (?)')->execute([$uid]);
        login_user($uid);
        log_user_in($uid, 'register');
        json_ok(public_user(current_user()));
    });

    $r->post('/auth/login', function () {
        csrf_check();
        $email = strtolower(trim(inp('email', '')));
        $pass = (string)inp('password', '');
        if ($email === '' || $pass === '') json_err('请填写邮箱和密码');
        $ip = client_ip();
        $recent = db()->prepare('SELECT COUNT(*) FROM login_attempts
                                 WHERE success=0 AND created_at > (NOW() - INTERVAL 15 MINUTE)
                                   AND (ip=? OR email=?)');
        $recent->execute([$ip, $email]);
        if ((int)$recent->fetchColumn() >= 6) json_err('尝试次数过多，请 15 分钟后再试', 429);

        $st = db()->prepare('SELECT * FROM users WHERE email=?');
        $st->execute([$email]);
        $u = $st->fetch();
        $ok = $u && password_verify($pass, $u['password_hash']);
        db()->prepare('INSERT INTO login_attempts (ip,email,success) VALUES (?,?,?)')
            ->execute([$ip, $email, $ok ? 1 : 0]);
        if (!$ok) json_err('邮箱或密码不正确');
        if ((int)$u['status'] !== 1) json_err('账号已被禁用');
        db()->prepare('DELETE FROM login_attempts WHERE success=0 AND ip=? AND email=?')->execute([$ip, $email]);
        login_user((int)$u['id']);
        log_user_in((int)$u['id'], 'login');
        json_ok(public_user(current_user()));
    });

    $r->post('/auth/logout', function () {
        logout_user();
        json_ok();
    });

    $r->get('/auth/me', function () {
        $u = current_user();
        json_ok($u ? public_user($u) : null);
    });

    // 前端写操作所需的 CSRF 令牌
    $r->get('/csrf', function () {
        json_ok(['token' => csrf_token()]);
    });

    // 编辑个人资料（昵称 / 头像 / 简介）
    $r->post('/auth/profile', function () {
        csrf_check();
        $u = require_user();
        $name = trim((string)inp('name', $u['name']));
        $avatar = trim((string)inp('avatar', $u['avatar'] ?? ''));
        $bio = trim((string)inp('bio', $u['bio'] ?? ''));
        if (mb_strlen($name) < 2) json_err('昵称至少 2 个字符');
        if (mb_strlen($name) > 16) json_err('昵称最多 16 个字符');
        if ($avatar !== '' && !preg_match('#^https?://#i', $avatar)) json_err('头像需填写 http(s) 图片地址');
        if (mb_strlen($avatar) > 255) json_err('头像地址过长');
        if (mb_strlen($bio) > 160) json_err('简介最多 160 个字符');
        db()->prepare('UPDATE users SET name=?, avatar=?, bio=? WHERE id=?')
            ->execute([$name, $avatar !== '' ? $avatar : null, $bio !== '' ? $bio : null, $u['id']]);
        json_ok(public_user(array_merge($u, ['name' => $name, 'avatar' => $avatar, 'bio' => $bio])));
    });

    $r->post('/auth/change-password', function () {
        csrf_check();
        $u = require_user();
        $old = inp('old', ''); $new = inp('new', '');
        if (strlen($new) < 6) json_err('新密码至少 6 位');
        $st = db()->prepare('SELECT password_hash FROM users WHERE id=?');
        $st->execute([$u['id']]);
        $row = $st->fetch();
        if (!$row || !password_verify($old, $row['password_hash'])) json_err('原密码不正确');
        db()->prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?')
            ->execute([password_hash($new, PASSWORD_BCRYPT), $u['id']]);
        json_ok();
    });
};

function public_user(?array $u): ?array {
    if (!$u) return null;
    return [
        'id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email'],
        'avatar' => $u['avatar'] ?? '', 'bio' => $u['bio'] ?? '', 'role' => $u['role'],
        'mustChangePassword' => !empty($u['must_change_password']),
    ];
}

function log_user_in(int $uid, string $action): void {
    // 留作扩展（登录日志）
}
