<?php
/**
 * 生成 sitemap.xml 与 robots.txt（写入 server/public，供 Web 服务器直接访问）。
 * 前台使用 Hash 路由，因此页面地址形如 https://站点/#/songs。
 */
require_once __DIR__ . '/settings.php';

function seo_routes(): array {
    return [
        '/' => '1.0', '/songs' => '0.9', '/videos' => '0.9', '/shorts' => '0.7',
        '/tools/chords' => '0.7', '/more/biography' => '0.7', '/more/tour' => '0.8',
        '/sponsor' => '0.6', '/sponsor/wall' => '0.5', '/more/stats' => '0.6',
        '/upload' => '0.4',
    ];
}

function seo_sitemap_xml(): string {
    $base = app_base_url();
    $today = date('Y-m-d');
    $items = [];
    foreach (seo_routes() as $p => $prio) {
        $items[] = ['loc' => $base . ($p === '/' ? '/' : '/#' . $p), 'prio' => $prio];
    }
    try {
        foreach (db()->query('SELECT id FROM songs ORDER BY id LIMIT 1000')->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $items[] = ['loc' => $base . '/#/songs/' . rawurlencode((string)$id), 'prio' => '0.8'];
        }
    } catch (Throwable $e) {}
    try {
        foreach (db()->query('SELECT id FROM albums ORDER BY id LIMIT 200')->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $items[] = ['loc' => $base . '/#/songs/album/' . rawurlencode((string)$id), 'prio' => '0.7'];
        }
    } catch (Throwable $e) {}
    try {
        foreach (db()->query('SELECT id FROM videos ORDER BY id LIMIT 500')->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $items[] = ['loc' => $base . '/#/videos/' . rawurlencode((string)$id), 'prio' => '0.7'];
        }
    } catch (Throwable $e) {}

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($items as $it) {
        $xml .= '  <url><loc>' . htmlspecialchars($it['loc'], ENT_XML1) . '</loc>'
            . '<lastmod>' . $today . '</lastmod><priority>' . $it['prio'] . '</priority></url>' . "\n";
    }
    $xml .= '</urlset>' . "\n";
    return $xml;
}

function seo_robots_txt(): string {
    $base = app_base_url();
    $txt = "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n";
    $extra = trim((string)setting('robots_extra', ''));
    if ($extra !== '') $txt .= rtrim($extra, "\n") . "\n";
    $txt .= "\nSitemap: $base/sitemap.xml\n";
    return $txt;
}

/** 写入静态文件，返回 [sitemap 字节数, robots 字节数]；失败抛 RuntimeException。 */
function seo_generate(): array {
    $dir = dirname(__DIR__) . '/public';
    if (!is_dir($dir) || !is_writable($dir)) throw new RuntimeException('public 目录不可写：' . $dir);
    $xml = seo_sitemap_xml();
    $robots = seo_robots_txt();
    if (@file_put_contents($dir . '/sitemap.xml', $xml) === false) throw new RuntimeException('写入 sitemap.xml 失败');
    if (@file_put_contents($dir . '/robots.txt', $robots) === false) throw new RuntimeException('写入 robots.txt 失败');
    return [strlen($xml), strlen($robots)];
}