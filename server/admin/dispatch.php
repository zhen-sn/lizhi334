<?php
/**
 * 后台路由分发：登录 / 仪表盘 / 通用 CRUD / 评论审核 / 投稿审核 / 用户 / 日志 / 设置 / 上传。
 */
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/_layout.php';
require_once __DIR__ . '/_crud.php';
require_once __DIR__ . '/pages.php';

start_admin_session();

$path = route_path();
$rel = trim(substr($path, strlen(ADMIN_PATH)), '/');
$seg = $rel === '' ? [] : explode('/', $rel);
$seg0 = $seg[0] ?? '';
$seg1 = $seg[1] ?? '';

// 静态资源
if ($seg0 === 'assets') {
    $file = __DIR__ . '/assets/' . basename($rel);
    if (is_file($file)) {
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $types = ['css' => 'text/css', 'js' => 'application/javascript', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'svg' => 'image/svg+xml'];
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
        readfile($file); exit;
    }
    http_response_code(404); exit;
}

// 登录/登出（无需鉴权）
if ($seg0 === 'login') {
    if (method() === 'POST') {
        $ip = admin_client_ip();
        $email = strtolower(trim(inp('email', '')));
        $pass = (string)inp('password', '');
        $fails = admin_login_fails($ip);
        if ($fails >= 5) {
            flash('尝试次数过多，请 15 分钟后再试', 'err');
            header('Location: /admin/login'); exit;
        }
        if ($fails >= 3) {
            $sum = $_SESSION['login_captcha'] ?? null;
            unset($_SESSION['login_captcha']);
            if ($sum === null || (int)inp('captcha', -1) !== (int)$sum) {
                admin_record_login($ip, $email, false);
                flash('验证码不正确', 'err');
                header('Location: /admin/login'); exit;
            }
        }
        $st = db()->prepare('SELECT * FROM users WHERE email=? AND role="admin"');
        $st->execute([$email]);
        $u = $st->fetch();
        if ($u && password_verify($pass, $u['password_hash']) && (int)$u['status'] === 1) {
            admin_record_login($ip, $email, true);
            login_admin((int)$u['id']);
            header('Location: /admin');
        } else {
            admin_record_login($ip, $email, false);
            flash('账号或密码错误', 'err');
            header('Location: /admin/login');
        }
        exit;
    }
    admin_login_page();
    exit;
}
if ($seg0 === 'logout') { logout_admin(); header('Location: /admin/login'); exit; }

// 以下全部需要管理员登录
$admin = require_admin();

// IP 白名单（站点设置 → 安全设置）
if (admin_ip_blocked()) {
    logout_admin();
    http_response_code(403);
    admin_head('访问受限');
    echo '<div class="login-wrap"><div class="login-card"><h1>访问受限</h1><p class="muted">当前 IP（' . htmlspecialchars(admin_client_ip()) . '）不在后台白名单内。</p><a class="btn" href="/admin/login">返回登录</a></div></div></body></html>';
    exit;
}

// 强制改密：未改密只能访问 profile
if (!empty($admin['must_change_password']) && $seg0 !== 'profile') {
    header('Location: /admin/profile'); exit;
}

// ---- 上传（给表单图片字段用）----
if ($seg0 === 'upload' && method() === 'POST') {
    if (empty($_FILES['file'])) { json_err('未收到文件'); }
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > 50 * 1024 * 1024) { json_err('上传失败或过大'); }
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp3', 'mp4', 'pdf'], true)) json_err('不支持的类型');
    try {
        $saved = storage_put($f['tmp_name'], $ext);
    } catch (RuntimeException $e) {
        json_err('上传失败：' . $e->getMessage(), 500);
    }
    json_ok(['url' => $saved['url'], 'driver' => $saved['driver']]);
}

// ---- 仪表盘 ----
if ($seg0 === '' || $seg0 === 'dashboard') {
    admin_page('概览', 'dashboard', function () {
        $cnt = function ($t, $w = '') { try { return (int)db()->query("SELECT COUNT(*) FROM $t $w")->fetchColumn(); } catch (Throwable $e) { return 0; } };
        $stats = [
            ['专辑', $cnt('albums'), '💿'], ['曲目', $cnt('songs'), '🎵'], ['视频', $cnt('videos'), '🎬'], ['短视频', $cnt('shorts'), '📱'],
            ['巡演城市', $cnt('tour_cities'), '🗺️'], ['评论', $cnt('comments'), '💬'],
            ['待审评论', $cnt('comments', 'WHERE status=0'), '⏳'], ['待审投稿', $cnt('uploads', "WHERE status='pending'"), '📥'],
            ['用户', $cnt('users'), '👥'], ['成就', $cnt('achievements'), '🏅'],
        ];
        echo '<div class="grid stats">';
        foreach ($stats as $s) echo '<div class="stat"><div class="ico">' . $s[2] . '</div><div class="n">' . $s[1] . '</div><div class="l">' . $s[0] . '</div></div>';
        echo '</div>';
        echo '<div class="card"><h2>快速入口</h2><div class="row">';
        foreach (['albums' => '专辑', 'songs' => '曲目', 'videos' => '视频', 'shorts' => '短视频', 'tour' => '巡演', 'bio' => '百科', 'sponsors' => '赞助', 'comments' => '评论审核', 'uploads' => '投稿审核', 'settings' => '站点设置'] as $k => $v) {
            echo '<a class="btn" href="/admin/' . $k . '">' . $v . '</a>';
        }
        echo '</div></div>';
    });
    exit;
}

// ---- 评论审核 ----
if ($seg0 === 'comments') {
    if ($seg1 === 'moderate' && method() === 'POST') {
        csrf_check();
        $id = (int)inp('id'); $act = inp('action');
        if ($act === 'approve') db()->prepare('UPDATE comments SET status=1 WHERE id=?')->execute([$id]);
        elseif ($act === 'hide') db()->prepare('UPDATE comments SET status=0 WHERE id=?')->execute([$id]);
        elseif ($act === 'delete') { db()->prepare('DELETE FROM comments WHERE id=? OR parent_id=?')->execute([$id, $id]); }
        log_admin('comment_' . $act, '#' . $id);
        flash('操作成功', 'ok');
        header('Location: /admin/comments'); exit;
    }
    admin_comments_page();
    exit;
}

// ---- 投稿审核 ----
if ($seg0 === 'uploads') {
    if ($seg1 === 'review' && method() === 'POST') {
        csrf_check();
        $id = (int)inp('id'); $act = inp('action'); $note = inp('note', '');
        $status = $act === 'approve' ? 'approved' : ($act === 'reject' ? 'rejected' : 'pending');
        db()->prepare('UPDATE uploads SET status=?, reviewer_note=?, reviewer_id=?, reviewed_at=NOW() WHERE id=?')
            ->execute([$status, $note, $admin['id'], $id]);
        log_admin('upload_' . $act, '#' . $id);
        flash('已' . ($status === 'approved' ? '通过' : ($status === 'rejected' ? '拒绝' : '标记')), 'ok');
        header('Location: /admin/uploads'); exit;
    }
    admin_uploads_page();
    exit;
}

// ---- 用户管理 ----
if ($seg0 === 'users') {
    if ($seg1 === 'save' && method() === 'POST') {
        csrf_check();
        $id = (int)inp('id'); $name = trim(inp('name', '')); $email = strtolower(trim(inp('email', '')));
        $role = inp('role', 'user'); $status = (int)inp('status', 1); $pass = inp('password', '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { flash('姓名或邮箱不合法', 'err'); header('Location: /admin/users'); exit; }
        if ($id) {
            if ($pass) db()->prepare('UPDATE users SET name=?,email=?,role=?,status=?,password_hash=? WHERE id=?')
                ->execute([$name, $email, $role, $status, password_hash($pass, PASSWORD_BCRYPT), $id]);
            else db()->prepare('UPDATE users SET name=?,email=?,role=?,status=? WHERE id=?')->execute([$name, $email, $role, $status, $id]);
        } else {
            if ($pass === '') { flash('新建用户需要密码', 'err'); header('Location: /admin/users'); exit; }
            db()->prepare('INSERT INTO users (name,email,password_hash,role,status) VALUES (?,?,?,?,?)')
                ->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $role, $status]);
            $id = (int)db()->lastInsertId();
            db()->prepare('INSERT INTO user_profile_stats (user_id) VALUES (?)')->execute([$id]);
        }
        log_admin('user_save', '#' . $id);
        flash('保存成功', 'ok'); header('Location: /admin/users'); exit;
    }
    if ($seg1 === 'delete' && method() === 'POST') {
        csrf_check(); $id = (int)inp('id');
        if ($id === (int)$admin['id']) { flash('不能删除自己', 'err'); header('Location: /admin/users'); exit; }
        db()->prepare('DELETE FROM users WHERE id=?')->execute([$id]);
        log_admin('user_delete', '#' . $id); flash('已删除', 'ok'); header('Location: /admin/users'); exit;
    }
    admin_users_page();
    exit;
}

// ---- 数据看板 ----
if ($seg0 === 'stats') {
    admin_stats_page();
    exit;
}

// ---- 媒体库 ----
if ($seg0 === 'media') {
    if ($seg1 === 'delete' && method() === 'POST') media_delete();
    admin_media_page();
    exit;
}

// ---- 订单管理 ----
if ($seg0 === 'orders') {
    if ($seg1 === 'action' && method() === 'POST') admin_order_action();
    admin_orders_page();
    exit;
}

// ---- 系统与备份 ----
if ($seg0 === 'system') {
    if ($seg1 === 'backup' && method() === 'POST') admin_backup();
    admin_system_page();
    exit;
}

// ---- SEO 与缓存 ----
if ($seg0 === 'seo') {
    if ($seg1 === 'save' && method() === 'POST') {
        csrf_check();
        settings_put([
            'seo_keywords' => trim((string)inp('seo_keywords', '')),
            'seo_description' => trim((string)inp('seo_description', '')),
            'seo_og_image' => trim((string)inp('seo_og_image', '')),
            'robots_extra' => trim((string)inp('robots_extra', '')),
        ]);
        log_admin('seo_save');
        flash('SEO 设置已保存', 'ok');
        header('Location: /admin/seo'); exit;
    }
    if ($seg1 === 'generate' && method() === 'POST') {
        csrf_check();
        require_once __DIR__ . '/../lib/seo.php';
        try {
            [$x, $r] = seo_generate();
            log_admin('seo_generate');
            flash('已生成 sitemap.xml（' . $x . ' 字节）与 robots.txt（' . $r . ' 字节）', 'ok');
        } catch (RuntimeException $e) {
            flash('生成失败：' . $e->getMessage(), 'err');
        }
        header('Location: /admin/seo'); exit;
    }
    if ($seg1 === 'cache' && method() === 'POST') {
        csrf_check();
        settings_put(['cache_ttl' => max(0, (int)inp('cache_ttl', 0))]);
        cache_clear();
        log_admin('cache_config');
        flash('缓存设置已保存，缓存已清空', 'ok');
        header('Location: /admin/seo'); exit;
    }
    if ($seg1 === 'clear' && method() === 'POST') {
        csrf_check();
        $n = cache_clear();
        log_admin('cache_clear');
        flash('已清空 ' . $n . ' 个缓存文件', 'ok');
        header('Location: /admin/seo'); exit;
    }
    admin_seo_page();
    exit;
}

// ---- 操作日志 ----
if ($seg0 === 'logs') {
    admin_page('操作日志', 'logs', function () {
        $page = max(1, (int)($_GET['page'] ?? 1)); $per = 50; $off = ($page - 1) * $per;
        $total = (int)db()->query('SELECT COUNT(*) FROM admin_logs')->fetchColumn();
        $rows = db()->query("SELECT * FROM admin_logs ORDER BY id DESC LIMIT $per OFFSET $off")->fetchAll();
        echo '<div class="card"><div style="overflow-x:auto"><table><thead><tr><th>ID</th><th>时间</th><th>管理员</th><th>操作</th><th>对象</th><th>IP</th></tr></thead><tbody>';
        foreach ($rows as $r) {
            echo '<tr><td>' . $r['id'] . '</td><td>' . $r['created_at'] . '</td><td>' . htmlspecialchars($r['admin_name']) . '</td>';
            echo '<td>' . htmlspecialchars($r['action']) . '</td><td>' . htmlspecialchars($r['target']) . '</td><td>' . htmlspecialchars($r['ip']) . '</td></tr>';
        }
        echo '</tbody></table></div><div class="pager">共 ' . $total . ' 条' . ($page > 1 ? ' <a class="btn sm" href="?page=' . ($page - 1) . '">上一页</a>' : '') . ($page * $per < $total ? ' <a class="btn sm" href="?page=' . ($page + 1) . '">下一页</a>' : '') . '</div></div>';
    });
    exit;
}

// ---- 站点设置（基础 / 支付 / 存储） ----
if ($seg0 === 'settings') {
    $section = $seg1 ?: 'base';
    $keyMap = [
        'base' => ['site_name', 'site_logo', 'site_desc', 'footer_text', 'icp', 'contact_email'],
        'payment' => ['pay_provider', 'pay_codepay_url', 'pay_codepay_id', 'pay_codepay_key', 'pay_codepay_type', 'pay_epay_url', 'pay_epay_pid', 'pay_epay_key', 'pay_epay_type', 'donate_wechat_qr', 'donate_alipay_qr', 'donate_text'],
        'storage' => ['storage_driver', 'r2_endpoint', 'r2_account_id', 'r2_access_key', 'r2_secret_key', 'r2_bucket', 'r2_public_url', 'r2_prefix'],
        'security' => ['admin_ip_whitelist'],
        'danger' => [],
    ];
    if (!isset($keyMap[$section])) $section = 'base';

    // 敏感设置：清空站点数据（独立处理，不走通用保存）
    if ($section === 'danger') {
        if (method() === 'POST') admin_danger_clear($admin);
        admin_danger_page();
        exit;
    }

    // R2 连接测试（必须在保存处理之前）
    if ($section === 'storage' && ($seg[2] ?? '') === 'test' && method() === 'POST') {
        csrf_check();
        try {
            $url = r2_test();
            flash('R2 连接成功，测试文件：' . $url, 'ok');
        } catch (RuntimeException $e) {
            flash('R2 连接失败：' . $e->getMessage(), 'err');
        }
        header('Location: /admin/settings/storage'); exit;
    }

    if (method() === 'POST') {
        csrf_check();
        foreach ($keyMap[$section] as $k) {
            db()->prepare('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)')->execute([$k, (string)inp($k, '')]);
        }
        settings_all(true);
        cache_clear();
        log_admin('settings_' . $section);
        flash('设置已保存', 'ok');
        header('Location: /admin/settings' . ($section === 'base' ? '' : '/' . $section)); exit;
    }
    $s = [];
    foreach (db()->query('SELECT k,v FROM settings')->fetchAll() as $r) $s[$r['k']] = $r['v'];
    $csrf = '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';

    if ($section === 'payment') {
        admin_page('支付设置', 'settings/payment', function () use ($s, $csrf) {
            echo '<form method="post" action="/admin/settings/payment">' . $csrf;
            echo '<div class="card"><h2>通用</h2>';
            setting_field('启用通道', 'pay_provider', 'select', $s['pay_provider'] ?? '', ['options' => ['' => '关闭在线支付', 'codepay' => '码支付', 'epay' => '易支付'], 'hint' => '前台下单与赞助页将使用所选通道']);
            echo '</div>';
            echo '<div class="card"><h2>码支付</h2>';
            setting_field('接口地址', 'pay_codepay_url', 'text', $s['pay_codepay_url'] ?? '', ['placeholder' => 'https://codepay.fateqq.com/']);
            setting_field('商户 ID', 'pay_codepay_id', 'text', $s['pay_codepay_id'] ?? '');
            setting_field('通信密钥', 'pay_codepay_key', 'password', $s['pay_codepay_key'] ?? '');
            setting_field('默认支付方式', 'pay_codepay_type', 'select', $s['pay_codepay_type'] ?? 'alipay', ['options' => ['alipay' => '支付宝', 'wxpay' => '微信支付']]);
            echo '</div>';
            echo '<div class="card"><h2>易支付</h2>';
            setting_field('接口地址', 'pay_epay_url', 'text', $s['pay_epay_url'] ?? '', ['placeholder' => 'https://pay.example.com/']);
            setting_field('商户 PID', 'pay_epay_pid', 'text', $s['pay_epay_pid'] ?? '');
            setting_field('商户密钥', 'pay_epay_key', 'password', $s['pay_epay_key'] ?? '');
            setting_field('默认支付方式', 'pay_epay_type', 'select', $s['pay_epay_type'] ?? 'alipay', ['options' => ['alipay' => '支付宝', 'wxpay' => '微信支付']]);
            echo '</div>';
            echo '<div class="card"><h2>赞赏二维码</h2>';
            setting_field('微信赞赏码', 'donate_wechat_qr', 'image', $s['donate_wechat_qr'] ?? '');
            setting_field('支付宝收款码', 'donate_alipay_qr', 'image', $s['donate_alipay_qr'] ?? '');
            setting_field('赞赏说明', 'donate_text', 'textarea', $s['donate_text'] ?? '', ['placeholder' => '展示在赞赏区的说明文字']);
            echo '</div>';
            echo '<div class="row"><button class="btn primary" type="submit">保存支付设置</button></div></form>';
        });
        exit;
    }

    if ($section === 'storage') {
        admin_page('存储设置', 'settings/storage', function () use ($s, $csrf) {
            echo '<form method="post" action="/admin/settings/storage">' . $csrf;
            echo '<div class="card"><h2>存储方式</h2>';
            setting_field('当前驱动', 'storage_driver', 'select', $s['storage_driver'] ?? 'local', ['options' => ['local' => '本地存储', 'r2' => 'Cloudflare R2'], 'hint' => '选择 R2 后，前台与后台上传将直接写入对象存储']);
            echo '</div>';
            echo '<div class="card"><h2>本地存储</h2>';
            echo '<div class="hint" style="line-height:2">文件目录：<code>' . htmlspecialchars(UPLOAD_DIR) . '</code><br>访问地址：<code>' . htmlspecialchars(UPLOAD_URL) . '</code></div>';
            echo '</div>';
            echo '<div class="card"><h2>Cloudflare R2</h2>';
            setting_field('S3 接口地址', 'r2_endpoint', 'text', $s['r2_endpoint'] ?? '', ['placeholder' => 'https://<账户ID>.r2.cloudflarestorage.com']);
            setting_field('账户 ID', 'r2_account_id', 'text', $s['r2_account_id'] ?? '');
            setting_field('Access Key ID', 'r2_access_key', 'text', $s['r2_access_key'] ?? '');
            setting_field('Secret Access Key', 'r2_secret_key', 'password', $s['r2_secret_key'] ?? '');
            setting_field('Bucket 名称', 'r2_bucket', 'text', $s['r2_bucket'] ?? '', ['placeholder' => 'my-bucket']);
            setting_field('公开访问域名', 'r2_public_url', 'text', $s['r2_public_url'] ?? '', ['placeholder' => 'https://cdn.example.com', 'hint' => 'R2 自定义域名或 r2.dev 公共域名，用于拼接文件访问地址']);
            setting_field('对象前缀', 'r2_prefix', 'text', $s['r2_prefix'] ?? 'uploads', ['placeholder' => 'uploads']);
            echo '</div>';
            echo '<div class="row"><button class="btn primary" type="submit">保存存储设置</button></div></form>';
            echo '<div class="card"><h2>连接测试</h2><p class="muted" style="margin-top:0">保存上方配置后点击测试，会向 R2 上传一个 <code>_healthcheck.txt</code> 校验签名与权限。</p>';
            echo '<form method="post" action="/admin/settings/storage/test"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><button class="btn" type="submit">测试 R2 连接</button></form></div>';
        });
        exit;
    }

    if ($section === 'security') {
        admin_page('安全设置', 'settings/security', function () use ($s, $csrf) {
            echo '<form method="post" action="/admin/settings/security">' . $csrf;
            echo '<div class="card"><h2>后台 IP 白名单</h2>';
            echo '<div class="form-row"><label>允许访问后台的 IP</label><textarea name="admin_ip_whitelist" placeholder="每行一个，或用逗号分隔；留空表示不限制">' . htmlspecialchars($s['admin_ip_whitelist'] ?? '') . '</textarea>';
            echo '<div class="hint">支持完整 IP（如 1.2.3.4）与通配前缀（如 192.168.1.*）。当前访问 IP：<code>' . htmlspecialchars(admin_client_ip()) . '</code></div></div>';
            echo '<button class="btn primary" type="submit">保存白名单</button></div></form>';
            echo '<div class="card"><h2>登录防护</h2><p class="muted" style="margin-top:0">同一 IP 15 分钟内失败 3 次后需要填写算术验证码，失败 5 次后锁定 15 分钟。最近登录记录：</p>';
            try {
                $rows = db()->query('SELECT ip,email,success,created_at FROM login_attempts ORDER BY id DESC LIMIT 10')->fetchAll();
            } catch (Throwable $e) { $rows = []; }
            echo '<table><thead><tr><th>时间</th><th>IP</th><th>账号</th><th>结果</th></tr></thead><tbody>';
            foreach ($rows as $r) {
                echo '<tr><td>' . htmlspecialchars($r['created_at']) . '</td><td>' . htmlspecialchars($r['ip']) . '</td><td>' . htmlspecialchars($r['email']) . '</td><td>' . ((int)$r['success'] ? '<span class="tag ok">成功</span>' : '<span class="tag err">失败</span>') . '</td></tr>';
            }
            if (!$rows) echo '<tr><td colspan="4" class="muted">暂无记录</td></tr>';
            echo '</tbody></table></div>';
        });
        exit;
    }

    admin_page('站点设置', 'settings', function () use ($s, $csrf) {
        $fields = ['site_name' => '站点名称', 'site_logo' => 'Logo 地址', 'site_desc' => '站点描述', 'footer_text' => '页脚文字', 'icp' => '备案号', 'contact_email' => '联系邮箱'];
        echo '<div class="card"><h2>基础设置</h2><form method="post">' . $csrf;
        foreach ($fields as $k => $label) {
            echo '<div class="form-row"><label>' . $label . '</label><input type="text" name="' . $k . '" value="' . htmlspecialchars($s[$k] ?? '') . '"></div>';
        }
        echo '<button class="btn primary" type="submit">保存</button></form></div>';
    });
    exit;
}

// ---- 修改密码 ----
if ($seg0 === 'profile') {
    if (method() === 'POST') {
        csrf_check();
        $old = inp('old', ''); $new = inp('new', ''); $name = trim(inp('name', ''));
        $st = db()->prepare('SELECT password_hash FROM users WHERE id=?'); $st->execute([$admin['id']]);
        $row = $st->fetch();
        if (!$row || !password_verify($old, $row['password_hash'])) { flash('原密码错误', 'err'); header('Location: /admin/profile'); exit; }
        if ($name !== '') db()->prepare('UPDATE users SET name=? WHERE id=?')->execute([$name, $admin['id']]);
        if ($new !== '') {
            if (strlen($new) < 6) { flash('新密码至少 6 位', 'err'); header('Location: /admin/profile'); exit; }
            db()->prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?')
                ->execute([password_hash($new, PASSWORD_BCRYPT), $admin['id']]);
        }
        log_admin('profile'); flash('已更新', 'ok'); header('Location: /admin'); exit;
    }
    admin_page('修改密码', 'profile', function () use ($admin) {
        echo '<div class="card" style="max-width:420px"><form method="post">';
        echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
        echo '<div class="form-row"><label>显示名称</label><input type="text" name="name" value="' . htmlspecialchars($admin['name']) . '"></div>';
        echo '<div class="form-row"><label>原密码</label><input type="password" name="old" required></div>';
        echo '<div class="form-row"><label>新密码（留空则不改）</label><input type="password" name="new"></div>';
        echo '<button class="btn primary" type="submit">保存</button></form></div>';
    });
    exit;
}

// ---- 通用模块 CRUD ----
$module = $seg0;
if ($module && isset(admin_modules()[$module])) {
    $sub = $_GET['sub'] ?? $_POST['sub'] ?? null;
    if ($seg1 === 'edit') { admin_page(admin_modules()[$module]['title'], $module, fn() => crud_form($module, $sub, $_GET['id'] ?? null)); exit; }
    if ($seg1 === 'save' && method() === 'POST') { crud_save($module, $sub); exit; }
    if ($seg1 === 'delete' && method() === 'POST') { crud_delete($module, $sub); exit; }
    if ($seg1 === 'batch' && method() === 'POST') { crud_batch_delete($module, $sub); exit; }
    admin_page(admin_modules()[$module]['title'], $module, fn() => crud_list($module, $sub));
    exit;
}

http_response_code(404);
admin_page('页面不存在', '', fn() => print('<div class="card">未找到该页面。<a href="/admin">返回首页</a></div>'));

// =====================================================================
function admin_login_page(): void {
    admin_head('登录');
    $flash = $_SESSION['flash'] ?? []; unset($_SESSION['flash']);
    echo '<div class="login-wrap"><div class="login-shell">';
    echo '<div class="login-aside"><div class="lg"><span>叁</span>叁叁肆</div>';
    echo '<div><h2>内容管理后台<br>让每次更新都更简单</h2><p>集中管理专辑、曲目、巡演、评论与投稿，所有改动实时生效。</p>';
    echo '<ul><li>内容与互动一站式管理</li><li>评论 / 投稿审核流</li><li>多用户与操作日志</li></ul></div>';
    echo '<div style="font-size:11.5px;color:rgba(255,255,255,.55);position:relative">© ' . date('Y') . ' 叁叁肆 · Admin Console</div></div>';
    echo '<div class="login-card">';
    echo '<div class="logo">叁</div>';
    echo '<h1>欢迎回来</h1><p>请登录你的管理员账号</p>';
    foreach ($flash as $f) echo '<div class="flash ' . $f['type'] . '">' . htmlspecialchars($f['msg']) . '</div>';
    echo '<form method="post">';
    echo '<div class="form-row"><label>邮箱</label><input type="email" name="email" required autofocus value="admin@lizhi.local"></div>';
    echo '<div class="form-row"><label>密码</label><input type="password" name="password" required placeholder="请输入密码"></div>';
    if (admin_login_fails(admin_client_ip()) >= 3) {
        $a = random_int(1, 9); $b = random_int(1, 9);
        $_SESSION['login_captcha'] = $a + $b;
        echo '<div class="form-row"><label>安全验证</label><input type="number" name="captcha" required placeholder="' . $a . ' + ' . $b . ' = ?"></div>';
    }
    echo '<button class="btn primary" type="submit">登 录</button>';
    echo '</form><div class="hint">初始账号 admin@lizhi.local / admin123<br>登录后可在「修改密码」中更换密码。</div></div></div></div></body></html>';
}

/** 设置页字段渲染 */
function setting_field(string $label, string $name, string $type, $val, array $args = []): void {
    $id = 'f_' . $name;
    echo '<div class="form-row"><label>' . htmlspecialchars($label) . '</label>';
    if ($type === 'select') {
        echo '<select id="' . $id . '" name="' . $name . '">';
        foreach ($args['options'] ?? [] as $k => $v) {
            $sel = ((string)$val === (string)$k) ? ' selected' : '';
            echo '<option value="' . htmlspecialchars((string)$k) . '"' . $sel . '>' . htmlspecialchars((string)$v) . '</option>';
        }
        echo '</select>';
    } elseif ($type === 'textarea') {
        echo '<textarea id="' . $id . '" name="' . $name . '" placeholder="' . htmlspecialchars($args['placeholder'] ?? '') . '">' . htmlspecialchars((string)$val) . '</textarea>';
    } elseif ($type === 'image') {
        echo '<div class="row" style="align-items:center"><input type="text" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars((string)$val) . '" placeholder="可填外链 URL，或点击上传">';
        echo '<button type="button" class="btn" data-upload data-target="' . $id . '">上传</button></div>';
        if ($val) echo '<div class="hint">预览：<img class="img-thumb" src="' . htmlspecialchars((string)$val) . '" onerror="this.style.display=\'none\'"></div>';
    } elseif ($type === 'password') {
        echo '<input type="password" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars((string)$val) . '" autocomplete="new-password">';
    } else {
        echo '<input type="text" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars((string)$val) . '" placeholder="' . htmlspecialchars($args['placeholder'] ?? '') . '">';
    }
    if (!empty($args['hint'])) echo '<div class="hint">' . htmlspecialchars($args['hint']) . '</div>';
    echo '</div>';
}

function admin_comments_page(): void {
    $status = $_GET['status'] ?? 'all';
    $where = $status === 'pending' ? 'WHERE status=0' : ($status === 'published' ? 'WHERE status=1' : '');
    $page = max(1, (int)($_GET['page'] ?? 1)); $per = 50; $off = ($page - 1) * $per;
    $total = (int)db()->query("SELECT COUNT(*) FROM comments $where")->fetchColumn();
    $rows = db()->query("SELECT * FROM comments $where ORDER BY id DESC LIMIT $per OFFSET $off")->fetchAll();
    admin_page('评论审核', 'comments', function () use ($rows, $status, $total, $page, $per) {
        echo '<div class="card"><div class="tabs">';
        foreach (['all' => '全部', 'pending' => '待审核', 'published' => '已通过'] as $k => $v) {
            $cls = $status === $k ? 'active' : '';
            echo '<a class="' . $cls . '" href="/admin/comments?status=' . $k . '">' . $v . '</a>';
        }
        echo '</div><div style="overflow-x:auto"><table><thead><tr><th>ID</th><th>对象</th><th>用户</th><th>内容</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>';
        foreach ($rows as $r) {
            $tag = (int)$r['status'] === 1 ? '<span class="tag ok">已通过</span>' : '<span class="tag pending">待审</span>';
            echo '<tr><td>' . $r['id'] . '</td><td>' . htmlspecialchars($r['target_type'] . ':' . $r['target_id']) . '</td>';
            echo '<td>' . htmlspecialchars($r['user_name']) . '</td><td>' . htmlspecialchars($r['text']) . '</td><td>' . $tag . '</td><td>' . $r['created_at'] . '</td><td>';
            foreach (['approve' => '通过', 'hide' => '隐藏', 'delete' => '删除'] as $a => $lbl) {
                echo '<form method="post" action="/admin/comments/moderate" style="display:inline"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" value="' . $r['id'] . '"><input type="hidden" name="action" value="' . $a . '"><button class="btn sm" type="submit">' . $lbl . '</button></form> ';
            }
            echo '</td></tr>';
        }
        if (!$rows) echo '<tr><td colspan="7" class="muted" style="text-align:center;padding:30px">暂无评论</td></tr>';
        echo '</tbody></table></div><div class="pager">共 ' . $total . ' 条' . ($page > 1 ? ' <a class="btn sm" href="?status=' . $status . '&page=' . ($page - 1) . '">上一页</a>' : '') . ($page * $per < $total ? ' <a class="btn sm" href="?status=' . $status . '&page=' . ($page + 1) . '">下一页</a>' : '') . '</div></div>';
    });
}

function admin_uploads_page(): void {
    $status = $_GET['status'] ?? 'pending';
    $w = $status === 'all' ? '' : "WHERE status='$status'";
    $rows = db()->query("SELECT * FROM uploads $w ORDER BY id DESC LIMIT 200")->fetchAll();
    admin_page('投稿审核', 'uploads', function () use ($rows, $status) {
        echo '<div class="card"><div class="tabs">';
        foreach (['pending' => '待审核', 'approved' => '已通过', 'rejected' => '已拒绝', 'all' => '全部'] as $k => $v) {
            $cls = $status === $k ? 'active' : '';
            echo '<a class="' . $cls . '" href="/admin/uploads?status=' . $k . '">' . $v . '</a>';
        }
        echo '</div><div style="overflow-x:auto"><table><thead><tr><th>ID</th><th>类型</th><th>标题</th><th>提交人</th><th>文件/链接</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>';
        foreach ($rows as $r) {
            $tag = ['pending' => '<span class="tag pending">待审</span>', 'approved' => '<span class="tag ok">通过</span>', 'rejected' => '<span class="tag err">拒绝</span>'][$r['status']] ?? $r['status'];
            $file = $r['file_url'] ? '<a href="' . htmlspecialchars($r['file_url']) . '" target="_blank">文件</a>' : ($r['link'] ? '<a href="' . htmlspecialchars($r['link']) . '" target="_blank">链接</a>' : '-');
            echo '<tr><td>' . $r['id'] . '</td><td>' . htmlspecialchars($r['type']) . '</td><td>' . htmlspecialchars($r['title']) . '</td>';
            echo '<td>' . htmlspecialchars($r['author'] ?? '-') . '</td><td>' . $file . '</td><td>' . $tag . '</td><td>' . $r['created_at'] . '</td><td>';
            echo '<form method="post" action="/admin/uploads/review" style="display:inline"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" value="' . $r['id'] . '"><input type="hidden" name="action" value="approve"><button class="btn sm" type="submit">通过</button></form> ';
            echo '<form method="post" action="/admin/uploads/review" style="display:inline"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" value="' . $r['id'] . '"><input type="hidden" name="action" value="reject"><input name="note" placeholder="拒绝原因" style="width:120px"><button class="btn sm danger" type="submit">拒绝</button></form>';
            echo '</td></tr>';
        }
        if (!$rows) echo '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">暂无投稿</td></tr>';
        echo '</tbody></table></div></div>';
    });
}

function admin_users_page(): void {
    $rows = db()->query('SELECT id,name,email,role,status,last_login_at,created_at FROM users ORDER BY id DESC')->fetchAll();
    admin_page('用户管理', 'users', function () use ($rows) {
        echo '<div class="card"><div class="toolbar"><h2 style="margin:0">用户列表</h2></div>';
        echo '<div style="overflow-x:auto"><table><thead><tr><th>ID</th><th>姓名</th><th>邮箱</th><th>角色</th><th>状态</th><th>最后登录</th><th>注册时间</th><th>操作</th></tr></thead><tbody>';
        foreach ($rows as $r) {
            $roleTag = $r['role'] === 'admin' ? '<span class="tag">管理员</span>' : '用户';
            $stTag = (int)$r['status'] === 1 ? '<span class="tag ok">正常</span>' : '<span class="tag err">禁用</span>';
            echo '<tr><td>' . $r['id'] . '</td><td>' . htmlspecialchars($r['name']) . '</td><td>' . htmlspecialchars($r['email']) . '</td><td>' . $roleTag . '</td><td>' . $stTag . '</td><td>' . ($r['last_login_at'] ?? '-') . '</td><td>' . $r['created_at'] . '</td><td>';
            echo '<button class="btn sm" onclick="editUser(' . $r['id'] . ',\'' . htmlspecialchars($r['name'], ENT_QUOTES) . '\',\'' . htmlspecialchars($r['email'], ENT_QUOTES) . '\',\'' . $r['role'] . '\',' . (int)$r['status'] . ')">编辑</button> ';
            echo '<form method="post" action="/admin/users/delete" style="display:inline" onsubmit="return confirm(\'确认删除该用户？\')"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" value="' . $r['id'] . '"><button class="btn sm danger">删除</button></form>';
            echo '</td></tr>';
        }
        echo '</tbody></table></div></div>';
        echo '<div class="card"><h2>新增 / 编辑用户</h2><form id="userForm" method="post" action="/admin/users/save">';
        echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" id="u_id" value="">';
        echo '<div class="row"><div class="form-row" style="flex:1"><label>姓名</label><input type="text" name="name" id="u_name" required></div>';
        echo '<div class="form-row" style="flex:1"><label>邮箱</label><input type="email" name="email" id="u_email" required></div></div>';
        echo '<div class="row"><div class="form-row" style="flex:1"><label>角色</label><select name="role" id="u_role"><option value="user">用户</option><option value="admin">管理员</option></select></div>';
        echo '<div class="form-row" style="flex:1"><label>状态</label><select name="status" id="u_status"><option value="1">正常</option><option value="0">禁用</option></select></div>';
        echo '<div class="form-row" style="flex:1"><label>密码（新建必填/编辑留空不改）</label><input type="password" name="password" id="u_pass"></div></div>';
        echo '<button class="btn primary" type="submit">保存</button> <button type="button" class="btn" onclick="clearUser()">清空</button></form></div>';
        echo '<script>function editUser(id,n,e,r,s){document.getElementById("u_id").value=id;document.getElementById("u_name").value=n;document.getElementById("u_email").value=e;document.getElementById("u_role").value=r;document.getElementById("u_status").value=s;window.scrollTo(0,document.body.scrollHeight);}function clearUser(){document.getElementById("userForm").reset();document.getElementById("u_id").value="";}</script>';
    });
}

// =====================================================================
// 登录防护 helper：IP 获取 / 失败计数 / 登录记录 / IP 白名单
// =====================================================================
function admin_client_ip(): string {
    return client_ip();
}

/** 15 分钟内的失败次数（用于决定验证码与锁定） */
function admin_login_fails(string $ip): int {
    try {
        $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip=? AND success=0 AND created_at > (NOW() - INTERVAL 15 MINUTE)');
        $st->execute([$ip]);
        return (int)$st->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

/** 记录一次登录尝试；成功时清空该 IP 的失败记录 */
function admin_record_login(string $ip, string $email, bool $ok): void {
    try {
        db()->prepare('INSERT INTO login_attempts (ip,email,success) VALUES (?,?,?)')->execute([$ip, $email, $ok ? 1 : 0]);
        if ($ok) db()->prepare('DELETE FROM login_attempts WHERE ip=? AND success=0')->execute([$ip]);
        if (random_int(1, 20) === 1) db()->exec('DELETE FROM login_attempts WHERE created_at < (NOW() - INTERVAL 7 DAY)');
    } catch (Throwable $e) {
        // 审计失败不阻断登录
    }
}

/** 当前 IP 是否被白名单拦截（白名单为空表示不限制） */
function admin_ip_blocked(): bool {
    $raw = trim((string)setting('admin_ip_whitelist', ''));
    if ($raw === '') return false;
    $ip = admin_client_ip();
    foreach (preg_split('/[\s,，]+/u', $raw, -1, PREG_SPLIT_NO_EMPTY) as $rule) {
        $rule = trim($rule);
        if ($rule === '') continue;
        if (str_ends_with($rule, '*')) {
            if (str_starts_with($ip, substr($rule, 0, -1))) return false;
        } elseif ($rule === $ip) {
            return false;
        }
    }
    return true;
}
