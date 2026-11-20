<?php
/**
 * 后台扩展页面：数据看板 / 媒体库 / 订单 / 系统体检与备份 / SEO 与缓存。
 * 由 admin/dispatch.php 路由调用。
 */
require_once __DIR__ . '/../lib/settings.php';
require_once __DIR__ . '/../lib/cache.php';
require_once __DIR__ . '/../lib/payment.php';
require_once __DIR__ . '/../lib/storage.php';

// ---------------- 数据看板 ----------------
function admin_stats_page(): void {
    $daily = [];
    try {
        $rows = db()->query('SELECT DATE(created_at) d, COUNT(*) plays, SUM(finished) fin FROM play_events WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY DATE(created_at)')->fetchAll();
        foreach ($rows as $r) $daily[$r['d']] = ['plays' => (int)$r['plays'], 'fin' => (int)$r['fin']];
    } catch (Throwable $e) {}

    $days = [];
    for ($i = 13; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime("-$i day"));
        $days[] = ['d' => $d, 'plays' => $daily[$d]['plays'] ?? 0, 'fin' => $daily[$d]['fin'] ?? 0];
    }
    $maxPlays = max(1, max(array_column($days, 'plays')));

    $weekPlays = 0; $monthPlays = 0; $monthFin = 0;
    try {
        $weekPlays = (int)db()->query('SELECT COUNT(*) FROM play_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')->fetchColumn();
        $r = db()->query('SELECT COUNT(*) c, SUM(finished) f FROM play_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)')->fetch();
        $monthPlays = (int)$r['c']; $monthFin = (int)$r['f'];
    } catch (Throwable $e) {}

    $newUsers = 0; $new7 = 0;
    try {
        $newUsers = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $new7 = (int)db()->query('SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')->fetchColumn();
    } catch (Throwable $e) {}

    $revenue = 0; $paidOrders = 0;
    try {
        $r = db()->query("SELECT COUNT(*) c, COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetch();
        $paidOrders = (int)$r['c']; $revenue = (float)$r['s'];
    } catch (Throwable $e) {}

    $growth = [];
    try {
        $rows = db()->query('SELECT DATE(created_at) d, COUNT(*) c FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY DATE(created_at)')->fetchAll();
        foreach ($rows as $r) $growth[$r['d']] = (int)$r['c'];
    } catch (Throwable $e) {}
    $growthDays = [];
    for ($i = 13; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime("-$i day"));
        $growthDays[] = ['d' => $d, 'c' => $growth[$d] ?? 0];
    }
    $maxGrowth = max(1, max(array_column($growthDays, 'c')));

    $topSongs = [];
    try {
        $topSongs = db()->query('SELECT s.id,s.title,s.play_count,COUNT(e.id) plays FROM songs s LEFT JOIN play_events e ON e.song_id=s.id AND e.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY s.id ORDER BY plays DESC, s.play_count DESC LIMIT 8')->fetchAll();
    } catch (Throwable $e) {
        try { $topSongs = db()->query('SELECT id,title,play_count,play_count plays FROM songs ORDER BY play_count DESC LIMIT 8')->fetchAll(); } catch (Throwable $e2) {}
    }
    $topVideos = [];
    try { $topVideos = db()->query('SELECT id,title,views FROM videos ORDER BY views DESC LIMIT 8')->fetchAll(); } catch (Throwable $e) {}

    admin_page('数据看板', 'stats', function () use ($days, $maxPlays, $weekPlays, $monthPlays, $monthFin, $newUsers, $new7, $revenue, $paidOrders, $growthDays, $maxGrowth, $topSongs, $topVideos) {
        $rate = $monthPlays > 0 ? round($monthFin / $monthPlays * 100, 1) : 0;
        echo '<div class="grid stats">';
        foreach ([
            ['7 天播放', $weekPlays, '📈'],
            ['30 天播放', $monthPlays, '🎧'],
            ['完播率(30天)', $rate . '%', '✅'],
            ['新增用户(7天)', '+' . $new7 . ' / 共 ' . $newUsers, '👥'],
            ['付费金额(30天)', '¥' . number_format($revenue, 2), '💰'],
            ['已支付订单(30天)', $paidOrders, '🧾'],
        ] as $s) {
            echo '<div class="stat"><div class="ico">' . $s[2] . '</div><div class="n">' . $s[1] . '</div><div class="l">' . $s[0] . '</div></div>';
        }
        echo '</div>';

        echo '<div class="card"><div class="toolbar"><h2 style="margin:0">近 14 天播放趋势</h2><span class="muted">柱高=当日播放，浅色段=完播</span></div><div class="bars">';
        foreach ($days as $d) {
            $h = round($d['plays'] / $maxPlays * 100);
            $sub = $d['plays'] > 0 ? ($d['fin'] ? '完 ' . $d['fin'] : '') : '';
            echo '<div class="bar-col" title="' . $d['d'] . '：播放 ' . $d['plays'] . '，完播 ' . $d['fin'] . '">';
            echo '<div class="bar-val">' . ($d['plays'] ?: '') . '</div>';
            echo '<div class="bar"><i style="height:' . max($h, 2) . '%"></i></div>';
            echo '<div class="bar-x">' . substr($d['d'], 5) . '</div></div>';
        }
        echo '</div></div>';

        echo '<div class="grid two">';
        echo '<div class="card"><h2>热门曲目（30 天播放）</h2><div style="overflow-x:auto"><table><thead><tr><th>#</th><th>曲名</th><th>30 天</th><th>累计</th></tr></thead><tbody>';
        foreach ($topSongs as $i => $s) {
            echo '<tr><td>' . ($i + 1) . '</td><td>' . htmlspecialchars($s['title']) . '</td><td>' . (int)$s['plays'] . '</td><td>' . (int)$s['play_count'] . '</td></tr>';
        }
        if (!$topSongs) echo '<tr><td colspan="4" class="muted">暂无数据</td></tr>';
        echo '</tbody></table></div></div>';

        echo '<div class="card"><h2>热门视频（累计播放）</h2><div style="overflow-x:auto"><table><thead><tr><th>#</th><th>标题</th><th>播放</th></tr></thead><tbody>';
        foreach ($topVideos as $i => $v) {
            echo '<tr><td>' . ($i + 1) . '</td><td>' . htmlspecialchars($v['title']) . '</td><td>' . (int)$v['views'] . '</td></tr>';
        }
        if (!$topVideos) echo '<tr><td colspan="3" class="muted">暂无数据</td></tr>';
        echo '</tbody></table></div></div>';
        echo '</div>';

        echo '<div class="card"><h2>用户增长（近 14 天注册）</h2><div class="bars">';
        foreach ($growthDays as $g) {
            $h = round($g['c'] / $maxGrowth * 100);
            echo '<div class="bar-col" title="' . $g['d'] . '：' . $g['c'] . ' 人"><div class="bar-val">' . ($g['c'] ?: '') . '</div>';
            echo '<div class="bar small"><i style="height:' . max($h, 2) . '%"></i></div><div class="bar-x">' . substr($g['d'], 5) . '</div></div>';
        }
        echo '</div></div>';
    });
}

// ---------------- 媒体库 ----------------
function admin_media_page(): void {
    $base = realpath(UPLOAD_DIR) ?: UPLOAD_DIR;
    $type = $_GET['type'] ?? 'all';
    $q = trim((string)($_GET['q'] ?? ''));
    $files = []; $totalSize = 0;
    if (is_dir($base)) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if (!$f->isFile()) continue;
            $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($base) + 1));
            $ext = strtolower($f->getExtension());
            $kind = in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'], true) ? 'image'
                : (in_array($ext, ['mp3', 'wav', 'flac', 'm4a'], true) ? 'audio'
                : (in_array($ext, ['mp4', 'mov', 'webm'], true) ? 'video' : 'other'));
            if ($type !== 'all' && $type !== $kind) continue;
            if ($q !== '' && stripos($rel, $q) === false) continue;
            $size = $f->getSize(); $totalSize += $size;
            $files[] = ['rel' => $rel, 'kind' => $kind, 'size' => $size, 'mtime' => $f->getMTime()];
        }
    }
    usort($files, fn($a, $b) => $b['mtime'] <=> $a['mtime']);
    $totalCount = count($files);
    $page = max(1, (int)($_GET['page'] ?? 1)); $per = 60;
    $slice = array_slice($files, ($page - 1) * $per, $per);
    $pages = max(1, (int)ceil($totalCount / $per));

    admin_page('媒体库', 'media', function () use ($slice, $type, $q, $totalCount, $totalSize, $page, $pages) {
        echo '<div class="card"><div class="toolbar"><h2 style="margin:0">媒体库</h2><span class="muted">共 ' . $totalCount . ' 个文件 · ' . format_bytes($totalSize) . '</span></div>';
        echo '<form class="toolbar" method="get" style="gap:8px"><input type="search" name="q" value="' . htmlspecialchars($q) . '" placeholder="按文件名搜索" style="max-width:240px;margin:0">';
        echo '<select name="type" style="max-width:140px;margin:0">';
        foreach (['all' => '全部类型', 'image' => '图片', 'audio' => '音频', 'video' => '视频', 'other' => '其它'] as $k => $v) {
            echo '<option value="' . $k . '"' . ($type === $k ? ' selected' : '') . '>' . $v . '</option>';
        }
        echo '</select><button class="btn" type="submit">筛选</button>';
        if ($q !== '' || $type !== 'all') echo '<a class="btn" href="/admin/media">重置</a>';
        echo '</form>';
        if (!$slice) {
            echo '<div class="muted" style="padding:40px;text-align:center">没有文件</div>';
        } else {
            echo '<div class="media-grid">';
            foreach ($slice as $f) {
                $url = UPLOAD_URL . '/' . $f['rel'];
                echo '<div class="media-card">';
                echo '<div class="thumb">';
                if ($f['kind'] === 'image') echo '<img src="' . htmlspecialchars($url) . '" loading="lazy" alt="">';
                elseif ($f['kind'] === 'video') echo '<span>🎬</span>';
                elseif ($f['kind'] === 'audio') echo '<span>🎵</span>';
                else echo '<span>📄</span>';
                echo '</div>';
                echo '<div class="mname" title="' . htmlspecialchars($f['rel']) . '">' . htmlspecialchars(basename($f['rel'])) . '</div>';
                echo '<div class="mmeta">' . format_bytes($f['size']) . ' · ' . date('m-d H:i', $f['mtime']) . '</div>';
                echo '<div class="mops"><button class="btn sm" data-copy="' . htmlspecialchars($url) . '">复制链接</button>';
                echo '<a class="btn sm" href="' . htmlspecialchars($url) . '" target="_blank">打开</a>';
                echo '<form method="post" action="/admin/media/delete" onsubmit="return confirm(\'删除文件？不可恢复\')"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="path" value="' . htmlspecialchars($f['rel']) . '"><button class="btn sm danger">删除</button></form></div>';
                echo '</div>';
            }
            echo '</div>';
        }
        if ($pages > 1) {
            echo '<div class="pager" style="margin-top:12px">第 ' . $page . '/' . $pages . ' 页';
            $qs = fn($p) => '/admin/media?type=' . urlencode($type) . '&q=' . urlencode($q) . '&page=' . $p;
            if ($page > 1) echo ' <a class="btn sm" href="' . $qs($page - 1) . '">上一页</a>';
            if ($page < $pages) echo ' <a class="btn sm" href="' . $qs($page + 1) . '">下一页</a>';
            echo '</div>';
        }
        echo '</div>';
        echo '<script>document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){navigator.clipboard&&navigator.clipboard.writeText(b.dataset.copy).then(function(){b.textContent="已复制";setTimeout(function(){b.textContent="复制链接"},1200);});});});</script>';
    });
}

function media_delete(): void {
    csrf_check();
    $rel = str_replace('\\', '/', (string)inp('path', ''));
    $base = realpath(UPLOAD_DIR);
    $full = realpath($base . '/' . $rel);
    if (!$base || !$full || !str_starts_with($full, $base . DIRECTORY_SEPARATOR) || !is_file($full)) {
        flash('文件不存在或路径非法', 'err');
        header('Location: /admin/media'); exit;
    }
    if (!@unlink($full)) { flash('删除失败，请检查文件权限', 'err'); }
    else { log_admin('media_delete', $rel); flash('已删除 ' . basename($rel), 'ok'); }
    header('Location: /admin/media'); exit;
}

function format_bytes(int $n): string {
    if ($n >= 1073741824) return round($n / 1073741824, 2) . ' GB';
    if ($n >= 1048576) return round($n / 1048576, 2) . ' MB';
    if ($n >= 1024) return round($n / 1024, 1) . ' KB';
    return $n . ' B';
}

// ---------------- 订单管理 ----------------
function admin_orders_page(): void {
    $status = $_GET['status'] ?? 'all';
    $q = trim((string)($_GET['q'] ?? ''));
    $page = max(1, (int)($_GET['page'] ?? 1)); $per = 50; $off = ($page - 1) * $per;
    $where = []; $args = [];
    if (in_array($status, ['pending', 'paid', 'cancelled'], true)) { $where[] = 'status=?'; $args[] = $status; }
    if ($q !== '') { $where[] = '(order_no LIKE ? OR subject LIKE ? OR contact LIKE ?)'; $like = '%' . $q . '%'; array_push($args, $like, $like, $like); }
    $w = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $st = db()->prepare("SELECT COUNT(*) FROM orders $w"); $st->execute($args); $total = (int)$st->fetchColumn();
    $st = db()->prepare("SELECT * FROM orders $w ORDER BY id DESC LIMIT $per OFFSET $off"); $st->execute($args); $rows = $st->fetchAll();
    $sum = db()->query("SELECT COALESCE(SUM(amount),0) FROM orders WHERE status='paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $pending = (int)db()->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();

    admin_page('订单管理', 'orders', function () use ($rows, $status, $q, $total, $page, $per, $sum, $pending) {
        echo '<div class="grid stats">';
        echo '<div class="stat"><div class="ico">🧾</div><div class="n">' . $total . '</div><div class="l">当前筛选订单</div></div>';
        echo '<div class="stat"><div class="ico">⏳</div><div class="n">' . $pending . '</div><div class="l">待支付</div></div>';
        echo '<div class="stat"><div class="ico">💰</div><div class="n">¥' . number_format((float)$sum, 2) . '</div><div class="l">30 天已支付</div></div>';
        echo '</div>';
        echo '<div class="card"><div class="tabs">';
        foreach (['all' => '全部', 'pending' => '待支付', 'paid' => '已支付', 'cancelled' => '已关闭'] as $k => $v) {
            echo '<a class="' . ($status === $k ? 'active' : '') . '" href="/admin/orders?status=' . $k . '">' . $v . '</a>';
        }
        echo '</div>';
        echo '<form class="toolbar" method="get" style="gap:8px"><input type="hidden" name="status" value="' . htmlspecialchars($status) . '">';
        echo '<input type="search" name="q" value="' . htmlspecialchars($q) . '" placeholder="订单号 / 主题 / 联系方式" style="max-width:280px;margin:0"><button class="btn">搜索</button>';
        if ($q !== '') echo '<a class="btn" href="/admin/orders?status=' . urlencode($status) . '">清除</a>';
        echo '</form>';
        echo '<div style="overflow-x:auto"><table><thead><tr><th>订单号</th><th>用户</th><th>主题</th><th>金额</th><th>通道</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>';
        foreach ($rows as $r) {
            $tag = ['pending' => '<span class="tag pending">待支付</span>', 'paid' => '<span class="tag ok">已支付</span>', 'cancelled' => '<span class="tag err">已关闭</span>'][$r['status']] ?? htmlspecialchars($r['status']);
            echo '<tr><td style="font-family:Consolas,monospace">' . htmlspecialchars($r['order_no']) . '</td>';
            echo '<td>' . ($r['user_id'] ? '#' . $r['user_id'] : '-') . '</td><td>' . htmlspecialchars($r['subject']) . '</td>';
            echo '<td>¥' . number_format((float)$r['amount'], 2) . '</td>';
            echo '<td>' . htmlspecialchars($r['provider'] . '/' . $r['channel']) . '</td><td>' . $tag . '</td>';
            echo '<td>' . htmlspecialchars($r['created_at']) . ($r['paid_at'] ? '<br><small class="muted">付 ' . htmlspecialchars($r['paid_at']) . '</small>' : '') . '</td><td>';
            if ($r['status'] !== 'paid') {
                echo '<form method="post" action="/admin/orders/action" style="display:inline" onsubmit="return confirm(\'确认手动补单？\')"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" value="' . $r['id'] . '"><input type="hidden" name="action" value="paid"><button class="btn sm">手动补单</button></form> ';
            }
            if ($r['status'] === 'pending') {
                echo '<form method="post" action="/admin/orders/action" style="display:inline"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="id" value="' . $r['id'] . '"><input type="hidden" name="action" value="cancel"><button class="btn sm danger">关闭</button></form>';
            }
            echo '</td></tr>';
        }
        if (!$rows) echo '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">暂无订单</td></tr>';
        echo '</tbody></table></div>';
        if ($total > $per) {
            echo '<div class="pager" style="margin-top:12px">第 ' . $page . '/' . max(1, (int)ceil($total / $per)) . ' 页';
            $qs = fn($p) => '/admin/orders?status=' . urlencode($status) . '&q=' . urlencode($q) . '&page=' . $p;
            if ($page > 1) echo ' <a class="btn sm" href="' . $qs($page - 1) . '">上一页</a>';
            if ($page * $per < $total) echo ' <a class="btn sm" href="' . $qs($page + 1) . '">下一页</a>';
            echo '</div>';
        }
        echo '</div>';
    });
}

function admin_order_action(): void {
    csrf_check();
    $id = (int)inp('id'); $act = inp('action');
    if ($act === 'paid') {
        db()->prepare("UPDATE orders SET status='paid', trade_no=?, paid_at=NOW(), remark='后台手动补单' WHERE id=? AND status<>'paid'")
            ->execute(['manual-' . date('YmdHis'), $id]);
        log_admin('order_manual_paid', '#' . $id);
        flash('已标记为已支付', 'ok');
    } elseif ($act === 'cancel') {
        db()->prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'")->execute([$id]);
        log_admin('order_cancel', '#' . $id);
        flash('订单已关闭', 'ok');
    }
    header('Location: /admin/orders'); exit;
}

// ---------------- 系统体检与备份 ----------------
function admin_system_page(): void {
    $checks = [];
    $checks[] = ['PHP 版本', PHP_VERSION, version_compare(PHP_VERSION, '8.0.0', '>=')];
    foreach (['pdo_mysql', 'curl', 'mbstring', 'fileinfo', 'json'] as $ext) {
        $checks[] = ['扩展 ' . $ext, extension_loaded($ext) ? '已启用' : '未启用', extension_loaded($ext)];
    }
    $checks[] = ['ZIP 备份', class_exists('ZipArchive') ? '可用' : '不可用', class_exists('ZipArchive')];
    $upWritable = is_dir(UPLOAD_DIR) ? is_writable(UPLOAD_DIR) : @mkdir(UPLOAD_DIR, 0775, true);
    $checks[] = ['上传目录', UPLOAD_DIR . '（' . ($upWritable ? '可写' : '不可写') . '）', (bool)$upWritable];
    $cacheWritable = is_dir(cache_dir()) || @mkdir(cache_dir(), 0775, true);
    $checks[] = ['缓存目录', cache_dir() . '（' . ($cacheWritable ? '可写' : '不可写') . '）', (bool)$cacheWritable];

    $dbVersion = '-'; $dbSize = '-';
    try {
        $dbVersion = (string)db()->query('SELECT VERSION()')->fetchColumn();
        $size = db()->query('SELECT ROUND(SUM(data_length+index_length)/1024/1024,2) FROM information_schema.tables WHERE table_schema=DATABASE()')->fetchColumn();
        if ($size !== false && $size !== null) $dbSize = $size . ' MB';
    } catch (Throwable $e) {}

    $free = @disk_free_space(UPLOAD_DIR);
    $total = @disk_total_space(UPLOAD_DIR);
    $uploadsSize = 0;
    if (is_dir(UPLOAD_DIR)) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(UPLOAD_DIR, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::LEAVES_ONLY);
        foreach ($it as $f) if ($f->isFile()) $uploadsSize += $f->getSize();
    }
    $sitemap = file_exists(dirname(__DIR__) . '/public/sitemap.xml');

    admin_page('系统与备份', 'system', function () use ($checks, $dbVersion, $dbSize, $free, $total, $uploadsSize, $sitemap) {
        echo '<div class="grid two">';
        echo '<div class="card"><h2>环境体检</h2><table><thead><tr><th>项目</th><th>状态</th></tr></thead><tbody>';
        foreach ($checks as $c) {
            echo '<tr><td>' . htmlspecialchars($c[0]) . '</td><td><span class="tag ' . ($c[2] ? 'ok' : 'err') . '">' . htmlspecialchars($c[1]) . '</span></td></tr>';
        }
        echo '</tbody></table></div>';
        echo '<div class="card"><h2>运行信息</h2><table><tbody>';
        echo '<tr><td>数据库版本</td><td>' . htmlspecialchars($dbVersion) . '</td></tr>';
        echo '<tr><td>数据库大小</td><td>' . htmlspecialchars($dbSize) . '</td></tr>';
        echo '<tr><td>上传文件占用</td><td>' . format_bytes((int)$uploadsSize) . '</td></tr>';
        echo '<tr><td>磁盘可用 / 总量</td><td>' . ($free !== false ? format_bytes((int)$free) : '-') . ' / ' . ($total !== false ? format_bytes((int)$total) : '-') . '</td></tr>';
        echo '<tr><td>上传大小上限</td><td>' . ini_get('upload_max_filesize') . ' / POST ' . ini_get('post_max_size') . '</td></tr>';
        echo '<tr><td>脚本超时</td><td>' . ini_get('max_execution_time') . ' 秒</td></tr>';
        echo '<tr><td>服务器时间</td><td>' . date('Y-m-d H:i:s') . '</td></tr>';
        echo '<tr><td>sitemap.xml</td><td>' . ($sitemap ? '<span class="tag ok">已生成</span>' : '<span class="tag pending">未生成</span>') . '</td></tr>';
        echo '</tbody></table></div>';
        echo '</div>';

        echo '<div class="card"><h2>数据备份</h2>';
        echo '<p class="muted" style="margin-top:0">数据库导出为 .sql；上传目录打包为 .zip。备份文件会直接下载，不落盘保存。</p>';
        echo '<form method="post" action="/admin/system/backup" style="display:inline"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="what" value="db"><button class="btn primary" type="submit">⬇ 导出数据库</button></form> ';
        echo '<form method="post" action="/admin/system/backup" style="display:inline" onsubmit="return confirm(\'上传目录较大时打包需要一些时间，继续？\')"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><input type="hidden" name="what" value="uploads"><button class="btn" type="submit">⬇ 打包上传目录</button></form>';
        echo '</div>';
    });
}

function admin_backup(): void {
    csrf_check();
    @set_time_limit(600);
    $what = inp('what', 'db');
    if ($what === 'uploads') {
        if (!class_exists('ZipArchive')) { flash('当前 PHP 未启用 zip 扩展，无法打包', 'err'); header('Location: /admin/system'); exit; }
        $tmp = tempnam(sys_get_temp_dir(), 'sqyzip');
        $zip = new ZipArchive();
        if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) { flash('创建压缩包失败', 'err'); header('Location: /admin/system'); exit; }
        $n = 0;
        if (is_dir(UPLOAD_DIR)) {
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(UPLOAD_DIR, FilesystemIterator::SKIP_DOTS));
            $base = realpath(UPLOAD_DIR);
            foreach ($it as $f) {
                if (!$f->isFile()) continue;
                $zip->addFile($f->getPathname(), str_replace('\\', '/', substr($f->getPathname(), strlen($base) + 1)));
                $n++;
            }
        }
        $zip->close();
        log_admin('backup_uploads', $n . ' files');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="uploads_' . date('Ymd_His') . '.zip"');
        header('Content-Length: ' . filesize($tmp));
        readfile($tmp);
        @unlink($tmp);
        exit;
    }

    $file = 'db_' . date('Ymd_His') . '.sql';
    log_admin('backup_db');
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $file . '"');
    $out = fopen('php://output', 'w');
    fwrite($out, "-- 叁叁肆数据库备份 " . date('Y-m-d H:i:s') . "\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");
    $tables = db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        $row = db()->query('SHOW CREATE TABLE `' . str_replace('`', '', $t) . '`')->fetch();
        $create = $row['Create Table'] ?? ($row[1] ?? '');
        fwrite($out, "DROP TABLE IF EXISTS `$t`;\n" . $create . ";\n\n");
        $data = db()->query('SELECT * FROM `' . str_replace('`', '', $t) . '`');
        $cols = null; $batch = [];
        while ($r = $data->fetch(PDO::FETCH_ASSOC)) {
            if ($cols === null) $cols = array_keys($r);
            $vals = array_map(fn($v) => $v === null ? 'NULL' : db()->quote((string)$v), array_values($r));
            $batch[] = '(' . implode(',', $vals) . ')';
            if (count($batch) >= 200) {
                fwrite($out, "INSERT INTO `$t` (`" . implode('`,`', $cols) . "`) VALUES\n" . implode(",\n", $batch) . ";\n");
                $batch = [];
            }
        }
        if ($batch) fwrite($out, "INSERT INTO `$t` (`" . implode('`,`', $cols) . "`) VALUES\n" . implode(",\n", $batch) . ";\n");
        fwrite($out, "\n");
    }
    fwrite($out, "SET FOREIGN_KEY_CHECKS=1;\n");
    fclose($out);
    exit;
}

// ---------------- SEO 与缓存 ----------------
function admin_seo_page(): void {
    $s = settings_all();
    $sitemapFile = dirname(__DIR__) . '/public/sitemap.xml';
    $robotsFile = dirname(__DIR__) . '/public/robots.txt';
    admin_page('SEO 与缓存', 'seo', function () use ($s, $sitemapFile, $robotsFile) {
        echo '<div class="grid two">';
        echo '<div class="card"><h2>SEO 设置</h2><form method="post" action="/admin/seo/save">';
        echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
        foreach ([
            'seo_keywords' => ['关键词', '多个关键词用英文逗号分隔'],
            'seo_description' => ['站点描述', '建议 80~160 字'],
            'seo_og_image' => ['分享图 URL', '社交平台分享卡片图片'],
            'robots_extra' => ['robots.txt 追加规则', '每行一条，如 Disallow: /me'],
        ] as $k => $f) {
            echo '<div class="form-row"><label>' . $f[0] . '</label>';
            if ($k === 'robots_extra' || $k === 'seo_description') {
                echo '<textarea name="' . $k . '" placeholder="' . $f[1] . '">' . htmlspecialchars($s[$k] ?? '') . '</textarea>';
            } else {
                echo '<input type="text" name="' . $k . '" value="' . htmlspecialchars($s[$k] ?? '') . '" placeholder="' . $f[1] . '">';
            }
            echo '</div>';
        }
        echo '<button class="btn primary" type="submit">保存 SEO 设置</button></form></div>';

        echo '<div class="card"><h2>sitemap / robots</h2>';
        echo '<p class="muted" style="margin-top:0">生成静态文件到站点根目录，Web 服务器可直接访问。前台为 Hash 路由，sitemap 收录的是 <code>/#/路径</code> 形式。</p>';
        echo '<table><tbody>';
        echo '<tr><td>sitemap.xml</td><td>' . (is_file($sitemapFile) ? '<span class="tag ok">' . date('Y-m-d H:i', filemtime($sitemapFile)) . '</span>' : '<span class="tag pending">未生成</span>') . '</td></tr>';
        echo '<tr><td>robots.txt</td><td>' . (is_file($robotsFile) ? '<span class="tag ok">' . date('Y-m-d H:i', filemtime($robotsFile)) . '</span>' : '<span class="tag pending">未生成</span>') . '</td></tr>';
        echo '</tbody></table>';
        echo '<form method="post" action="/admin/seo/generate" style="margin-top:10px"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><button class="btn primary" type="submit">重新生成 sitemap / robots</button></form>';
        echo '<div class="hint">访问：<a href="' . htmlspecialchars(app_base_url()) . '/sitemap.xml" target="_blank">/sitemap.xml</a> · <a href="' . htmlspecialchars(app_base_url()) . '/robots.txt" target="_blank">/robots.txt</a></div>';
        echo '</div></div>';

        echo '<div class="card"><h2>内容缓存</h2>';
        echo '<p class="muted" style="margin-top:0">缓存前台 <code>/api/bootstrap</code> 内容接口。后台保存内容或修改设置时会自动清理；TTL 设为 0 表示关闭缓存。</p>';
        echo '<form method="post" action="/admin/seo/cache" class="row" style="align-items:flex-end;gap:10px">';
        echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
        echo '<div class="form-row" style="max-width:220px;margin:0"><label>缓存有效期（秒）</label><input type="number" name="cache_ttl" min="0" value="' . (int)($s['cache_ttl'] ?? 0) . '"></div>';
        echo '<button class="btn primary" type="submit">保存并清理缓存</button></form>';
        $n = count(glob(cache_dir() . '/*.cache') ?: []);
        echo '<div class="hint">当前缓存文件：' . $n . ' 个</div>';
        echo '<form method="post" action="/admin/seo/clear" style="margin-top:8px"><input type="hidden" name="_csrf" value="' . csrf_token() . '"><button class="btn" type="submit">立即清空缓存</button></form>';
        echo '</div>';
    });
}

// ---------------- 敏感设置：清空站点数据 ----------------
/** 可清空的数据分组；tables 为数据库表，files/cache 为特殊项 */
function admin_danger_groups(): array {
    return [
        'content' => [
            'label' => '内容数据',
            'hint' => '专辑、曲目、视频、短视频、和弦工具、百科、巡演、赞助、语录、横幅、成就、彩蛋、导航',
            'tables' => [
                'albums', 'songs', 'videos', 'shorts', 'chord_library', 'chord_sheets', 'progressions', 'difficulty_scale',
                'bio_profile', 'bio_facts', 'bio_chapters', 'bio_band_members', 'bio_faqs', 'bio_awards',
                'tour_config', 'tour_cities', 'tour_timeline',
                'sponsor_tiers', 'sponsor_channels', 'sponsor_wall', 'sponsor_stats', 'sponsor_use_cases',
                'quotes', 'banners', 'achievements', 'easter_eggs', 'nav_items',
            ],
        ],
        'user_data' => [
            'label' => '用户互动数据',
            'hint' => '评论、点赞、收藏、歌单、播放历史与统计、投稿、订单、登录记录（保留用户账号）',
            'tables' => [
                'comments', 'comment_likes', 'favorites', 'playlists', 'playlist_songs', 'play_history', 'play_positions',
                'user_play_counts', 'user_daily_stats', 'user_profile_stats', 'uploads',
                'short_likes', 'short_saves', 'short_downloads', 'play_events', 'orders', 'login_attempts',
            ],
        ],
        'files' => ['label' => '上传文件', 'hint' => '删除 uploads 目录下的所有文件（本地存储）', 'files' => true],
        'cache' => ['label' => '内容缓存', 'hint' => '清空 /api/bootstrap 的文件缓存', 'cache' => true],
        'logs' => ['label' => '操作日志', 'hint' => '清空后台操作日志', 'tables' => ['admin_logs']],
    ];
}

function admin_danger_page(): void {
    $groups = admin_danger_groups();
    admin_page('敏感设置', 'settings/danger', function () use ($groups) {
        echo '<div class="danger-warn"><b>危险操作：</b>此页用于清空站点数据，删除后不可恢复，请务必先备份（系统与备份 → 导出数据库 / 打包上传目录）。</div>';
        echo '<form method="post" action="/admin/settings/danger">';
        echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
        echo '<div class="card"><h2>选择要清空的数据</h2>';
        foreach ($groups as $k => $g) {
            echo '<label class="dgroup"><input type="checkbox" name="groups[]" value="' . $k . '"><div><b>' . $g['label'] . '</b><p class="hint" style="margin:2px 0 0">' . $g['hint'] . '</p></div></label>';
        }
        echo '</div>';
        echo '<div class="card"><h2>安全校验</h2>';
        echo '<div class="form-row"><label>当前管理员密码<span class="req">*</span></label><input type="password" name="password" required autocomplete="current-password"></div>';
        echo '<div class="form-row"><label>确认短语<span class="req">*</span></label><input type="text" name="confirm" required placeholder="请输入：清空数据" autocomplete="off"></div>';
        echo '<button class="btn danger" type="submit" onclick="return confirm(\'确定清空所选数据？此操作不可恢复！\')">确认清空</button>';
        echo '</div></form>';
        echo '<div class="card"><h2>说明</h2><ul class="muted" style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.9">';
        echo '<li>管理员账号、站点设置（含支付/存储/安全配置）不会被清空。</li>';
        echo '<li>清空内容数据后，前台将回退到默认静态数据（若前端内置了回退）。</li>';
        echo '<li>清空后会自动清除内容缓存，操作会写入操作日志。</li>';
        echo '</ul></div>';
    });
}

function admin_danger_clear(array $admin): void {
    csrf_check();
    $groups = admin_danger_groups();
    $picked = array_values(array_intersect(array_keys($groups), (array)inp('groups', [])));
    if (!$picked) { flash('请至少选择一项要清空的数据', 'err'); header('Location: /admin/settings/danger'); exit; }
    if (trim((string)inp('confirm', '')) !== '清空数据') { flash('确认短语不正确，请输入「清空数据」', 'err'); header('Location: /admin/settings/danger'); exit; }
    $st = db()->prepare('SELECT password_hash FROM users WHERE id=?');
    $st->execute([(int)$admin['id']]);
    $hash = (string)$st->fetchColumn();
    if (!$hash || !password_verify((string)inp('password', ''), $hash)) {
        flash('管理员密码不正确', 'err'); header('Location: /admin/settings/danger'); exit;
    }

    $result = [];
    try {
        $tables = [];
        foreach ($picked as $k) {
            foreach ($groups[$k]['tables'] ?? [] as $t) $tables[] = $t;
        }
        $tables = array_unique($tables);
        if ($tables) {
            db()->beginTransaction();
            $sum = 0;
            foreach ($tables as $t) {
                if (!preg_match('/^[a-z_]+$/', $t)) continue;
                try { $sum += (int)db()->exec('DELETE FROM `' . $t . '`'); } catch (Throwable $e) { /* 表不存在则跳过 */ }
            }
            db()->commit();
            $result[] = '数据库 ' . count($tables) . ' 张表共 ' . $sum . ' 行';
        }
        if (in_array('files', $picked, true)) {
            $n = 0;
            if (is_dir(UPLOAD_DIR)) {
                $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(UPLOAD_DIR, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::LEAVES_ONLY);
                foreach ($it as $f) {
                    if ($f->isFile() && @unlink($f->getPathname())) $n++;
                }
            }
            $result[] = '上传文件 ' . $n . ' 个';
        }
        if (in_array('logs', $picked, true)) $result[] = '操作日志已清空';
        cache_clear();
        log_admin('danger_clear', implode(',', $picked));
        if (in_array('cache', $picked, true)) $result[] = '内容缓存已清空';
        flash('已清空：' . implode('；', $result), 'ok');
    } catch (Throwable $e) {
        if (db()->inTransaction()) db()->rollBack();
        flash('清空失败：' . $e->getMessage(), 'err');
    }
    header('Location: /admin/settings/danger'); exit;
}