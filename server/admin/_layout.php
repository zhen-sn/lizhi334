<?php
/**
 * 后台布局：页头 / 侧栏 / 顶栏 / 页脚 / 提示消息。
 */
require_once __DIR__ . '/tables.php';

function admin_flash(): void {
    if (empty($_SESSION['flash'])) return;
    foreach ($_SESSION['flash'] as $f) {
        echo '<div class="flash ' . htmlspecialchars($f['type']) . '">' . htmlspecialchars($f['msg']) . '</div>';
    }
    unset($_SESSION['flash']);
}
function flash(string $msg, string $type = 'ok'): void {
    $_SESSION['flash'][] = ['type' => $type, 'msg' => $msg];
}

function admin_head(string $title): void {
    $t = htmlspecialchars($title);
    echo <<<HTML
<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$t} · 后台管理</title>
<link rel="stylesheet" href="/admin/assets/admin.css?v=6">
</head><body>
HTML;
}

function admin_side(string $active): void {
    $specials = [
        'dashboard' => ['概览', '📊'],
        'stats' => ['数据看板', '📈'],
    ];
    $content = [];
    foreach (admin_modules() as $k => $m) { $content[$k] = [$m['title'], $m['icon']]; }
    $interact = ['comments' => ['评论审核', '💬'], 'uploads' => ['投稿审核', '📥'], 'orders' => ['订单管理', '🧾'], 'media' => ['媒体库', '🖼️']];
    $system = ['users' => ['用户管理', '👥'], 'system' => ['系统与备份', '🛠️'], 'seo' => ['SEO 与缓存', '🔍']];
    echo '<aside class="side"><div class="brand"><span class="logo">叁</span><div><b>叁叁肆</b><small>内容管理后台</small></div></div>';
    admin_nav_group('', $specials, $active);
    admin_nav_group('内容管理', $content, $active);
    admin_nav_group('互动与运营', $interact, $active);
    admin_nav_group('系统', $system, $active);
    // 站点设置（含二级菜单）
    $isSettings = str_starts_with($active, 'settings');
    $subs = ['settings' => '基础设置', 'settings/payment' => '支付设置', 'settings/storage' => '存储设置', 'settings/security' => '安全设置', 'settings/danger' => '敏感设置'];
    echo '<details class="nav-sub"' . ($isSettings ? ' open' : '') . '><summary' . ($isSettings ? ' class="active"' : '') . '><span class="ico">⚙️</span><span>站点设置</span><span class="chev">›</span></summary><div class="sub">';
    foreach ($subs as $k => $label) {
        echo '<a class="' . ($active === $k ? 'active' : '') . '" href="/admin/' . $k . '">' . $label . '</a>';
    }
    echo '</div></details>';
    admin_nav_group('', ['logs' => ['操作日志', '📜'], 'profile' => ['修改密码', '🔑']], $active);
    echo '<div class="side-foot"><a href="/" target="_blank">↗ 返回前台</a></div>';
    echo '</aside>';
}
function admin_nav_group(string $label, array $items, string $active): void {
    if ($label) echo '<div class="grp">' . htmlspecialchars($label) . '</div>';
    foreach ($items as $k => $v) {
        $cls = $active === $k ? 'active' : '';
        echo '<a class="' . $cls . '" href="/admin/' . $k . '"><span class="ico">' . $v[1] . '</span><span>' . htmlspecialchars($v[0]) . '</span></a>';
    }
}

function admin_topbar(string $title): void {
    $a = current_admin();
    $name = htmlspecialchars($a['name'] ?? 'admin');
    $initial = htmlspecialchars(mb_substr($a['name'] ?? 'A', 0, 1, 'UTF-8'));
    echo '<div class="topbar"><div style="display:flex;align-items:center;gap:12px">';
    echo '<label class="hamburger" for="nav-toggle" aria-label="菜单">☰</label>';
    echo '<div><div class="crumb">叁叁肆 · 内容管理</div><h1>' . htmlspecialchars($title) . '</h1></div></div>';
    echo '<div class="me"><span class="avatar">' . $initial . '</span><span>你好，<b>' . $name . '</b></span>';
    if (!empty($a['must_change_password'])) {
        echo '<span class="tag err">请先修改密码</span>';
    }
    echo '<a class="btn sm" href="/admin/profile">修改密码</a>';
    echo '<a class="btn sm" href="/admin/logout">退出</a></div></div>';
}

function admin_footer(): void {
    echo '<script>
document.querySelectorAll("[data-upload]").forEach(function(btn){
  btn.addEventListener("click", function(){
    var input=document.createElement("input");input.type="file";
    input.onchange=function(){
      var fd=new FormData();fd.append("file",input.files[0]);
      fetch("/admin/upload",{method:"POST",body:fd,credentials:"same-origin"})
        .then(function(r){return r.json();}).then(function(j){
          if(j.ok){var t=document.getElementById(btn.dataset.target);t.value=j.url;t.dispatchEvent(new Event("input"));}
          else alert(j.error||"上传失败");
        });
    };
    input.click();
  });
});
</script></body></html>';
}

function admin_page(string $title, string $active, callable $body): void {
    admin_head($title);
    echo '<div class="admin"><input type="checkbox" id="nav-toggle" class="nav-toggle">';
    admin_side($active);
    echo '<label class="nav-mask" for="nav-toggle"></label>';
    echo '<div class="main">';
    admin_topbar($title);
    echo '<div class="content">';
    admin_flash();
    $body();
    echo '</div></div></div>';
    admin_footer();
}
