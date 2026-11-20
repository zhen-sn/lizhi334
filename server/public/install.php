<?php
/**
 * 一键安装器：建表 + 导入种子数据 + 创建管理员。
 * 运行方式：
 *   1) 浏览器访问 /install.php
 *   2) 或命令行：php server/public/install.php
 * 已安装后会生成 server/installed.lock；加 ?reseed=1 可强制重新灌入（会清空内容表）。
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/helpers.php';

$lockFile = __DIR__ . '/../installed.lock';
$reseed = isset($_GET['reseed']) || (isset($argv) && in_array('reseed', $argv, true));
$isCli = PHP_SAPI === 'cli';

if (!$isCli) { header('Content-Type: text/html; charset=utf-8'); }
function out($msg) { global $isCli; if ($isCli) { echo $msg . "\n"; } else { echo htmlspecialchars($msg) . "<br>\n"; } }

if (is_file($lockFile) && !$reseed) {
    out('已安装。如需重新灌入种子数据，请访问 /install.php?reseed=1');
    exit;
}

try {
    $db = db();
    out('数据库连接成功：' . DB_NAME . ' @ ' . DB_HOST . ':' . DB_PORT);
} catch (Throwable $e) {
    out('数据库连接失败：' . $e->getMessage());
    out('请检查 server/.env 或 server/config.php 中的 DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS');
    exit;
}

// ---------- 1. 建表 ----------
$sql = file_get_contents(__DIR__ . '/../sql/schema.sql');
// 去掉注释行
$sql = preg_replace('/^\s*--.*$/m', '', $sql);
$statements = array_filter(array_map('trim', explode(';', $sql)));
foreach ($statements as $stmt) {
    if ($stmt === '') continue;
    try { $db->exec($stmt); } catch (Throwable $e) { out('建表警告：' . $e->getMessage()); }
}
out('表结构就绪。');

// ---------- 2. 种子数据 ----------
$jsonPath = __DIR__ . '/../seed/data.json';
if (!is_file($jsonPath)) {
    out('缺少 seed/data.json，跳过种子导入（可运行 node scripts/export-seed.mjs 生成）。');
} else {
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!$data) { out('data.json 解析失败，跳过。'); }
    else {
        $db->beginTransaction();
        try {
            seed_all($db, $data, $reseed);
            $db->commit();
            out('种子数据导入完成。');
        } catch (Throwable $e) {
            $db->rollBack();
            out('种子导入失败：' . $e->getMessage());
        }
    }
}

// ---------- 3. 管理员 ----------
$adminEmail = 'admin@lizhi.local';
$exists = $db->prepare('SELECT id FROM users WHERE email=?'); $exists->execute([$adminEmail]);
if (!$exists->fetch()) {
    $hash = password_hash('admin123', PASSWORD_BCRYPT);
    $db->prepare('INSERT INTO users (name,email,password_hash,role,must_change_password) VALUES (?,?,?,"admin",1)')
       ->execute(['admin', $adminEmail, $hash]);
    out('已创建管理员：admin / admin123 （首次登录后请修改密码）');
} else {
    out('管理员已存在，跳过。');
}

@file_put_contents($lockFile, date('c'));
out('安装完成！访问 /admin 进入后台。');

// =====================================================================
function seed_all(PDO $db, array $data, bool $reseed): void {
    // 专辑与曲目顺序
    $track = []; // songId => [albumId, trackNo]
    foreach (($data['albums'] ?? []) as $a) {
        foreach (($a['songIds'] ?? []) as $i => $sid) { $track[$sid] = [$a['id'], $i + 1]; }
    }

    $ins = function (string $table, array $cols, array $rows, bool $truncate) use ($db) {
        if ($truncate) $db->exec("DELETE FROM `$table`");
        if (!$rows) return;
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $colsSql = '`' . implode('`,`', $cols) . '`';
        $st = $db->prepare("INSERT INTO `$table` ($colsSql) VALUES ($ph)");
        foreach ($rows as $row) { $st->execute($row); }
    };

    // albums
    $rows = []; $i = 0;
    foreach (($data['albums'] ?? []) as $a) {
        $rows[] = [$a['id'], $a['name'], (int)$a['year'], $a['date'] ?? '', $a['type'] ?? 'studio',
            $a['description'] ?? '', $a['cover'] ?? '', $i++];
    }
    $ins('albums', ['id','name','year','date','type','description','cover','sort'], $rows, $reseed);

    // songs
    $rows = []; $i = 0;
    foreach (($data['songs'] ?? []) as $s) {
        $t = $track[$s['id']] ?? [null, 0];
        $rows[] = [$s['id'], $s['title'], $t[0], $t[1], (int)($s['duration'] ?? 0),
            $s['audioUrl'] ?? '', $s['lyrics'] ?? '', (int)($s['bpm'] ?? 0), $s['key'] ?? '',
            (int)($s['capo'] ?? 0), (int)($s['difficulty'] ?? 0),
            to_json($s['tags'] ?? []), (int)($s['playCount'] ?? 0), (int)($s['year'] ?? 0),
            $s['city'] ?? null, $i++];
    }
    $ins('songs', ['id','title','album_id','track_no','duration','audio_url','lyrics','bpm','song_key',
        'capo','difficulty','tags','play_count','year','city','sort'], $rows, $reseed);

    // videos
    $rows = []; $i = 0;
    foreach (($data['videos'] ?? []) as $v) {
        $rows[] = [$v['id'], $v['title'], $v['videoUrl'] ?? '', $v['poster'] ?? '', (int)($v['duration'] ?? 0),
            $v['category'] ?? 'live', (int)($v['year'] ?? 0), $v['city'] ?? null,
            $v['relatedSongId'] ?? null, $v['description'] ?? '', (int)($v['views'] ?? 0), $i++];
    }
    $ins('videos', ['id','title','video_url','poster','duration','category','year','city',
        'related_song_id','description','views','sort'], $rows, $reseed);

    // shorts
    $rows = []; $i = 0;
    foreach (($data['shorts'] ?? []) as $s) {
        $rows[] = [$s['id'], $s['title'], $s['author'] ?? '', $s['desc'] ?? '',
            to_json($s['tags'] ?? []), $s['city'] ?? null, (int)($s['duration'] ?? 0),
            (int)($s['likes'] ?? 0), (int)($s['comments'] ?? 0), (int)($s['saves'] ?? 0),
            (int)($s['views'] ?? 0), $s['song'] ?? null, $s['videoUrl'] ?? '', $s['poster'] ?? '', $i++];
    }
    $ins('shorts', ['id','title','author','desc','tags','city','duration','likes','comments','saves',
        'views','song','video_url','poster','sort'], $rows, $reseed);

    // chord_library
    $rows = []; $i = 0;
    foreach (($data['chordLibrary'] ?? []) as $c) {
        $rows[] = [$c['name'], $c['display'] ?? $c['name'], to_json($c['frets'] ?? []),
            to_json($c['fingers'] ?? []), (int)($c['rootString'] ?? 0), $c['quality'] ?? '', $i++];
    }
    $ins('chord_library', ['name','display','frets','fingers','root_string','quality','sort'], $rows, $reseed);

    // chord_sheets
    if ($reseed) $db->exec('DELETE FROM chord_sheets');
    $st = $db->prepare('INSERT INTO chord_sheets (song_id,data) VALUES (?,?)');
    foreach (($data['sheets'] ?? []) as $sh) { $st->execute([$sh['songId'], to_json($sh)]); }

    // progressions
    $rows = []; $i = 0;
    foreach (($data['progressions'] ?? []) as $p) {
        $rows[] = [$p['name'], $p['roman'] ?? '', to_json($p['degrees'] ?? []), $p['example'] ?? '',
            $p['hint'] ?? '', $i++];
    }
    $ins('progressions', ['name','roman','degrees','example','hint','sort'], $rows, $reseed);

    // difficulty_scale
    $rows = [];
    foreach (($data['difficultyScale'] ?? []) as $d) { $rows[] = [(int)$d['level'], $d['label'], $d['desc'] ?? '']; }
    $ins('difficulty_scale', ['level','label','desc'], $rows, $reseed);

    // bio_profile
    if ($reseed || !$db->query('SELECT 1 FROM bio_profile')->fetch()) {
        $db->exec('DELETE FROM bio_profile');
        $db->prepare('INSERT INTO bio_profile (id,data) VALUES (1,?)')->execute([to_json($data['profile'] ?? new stdClass())]);
    }
    // bio facts/chapters/members/faqs/awards
    $rows = []; $i = 0;
    foreach (($data['facts'] ?? []) as $f) { $rows[] = [$f['label'], $f['value'], $f['note'] ?? null, $i++]; }
    $ins('bio_facts', ['label','value','note','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['chapters'] ?? []) as $c) { $rows[] = [$c['title'], to_json($c['paras'] ?? []), $i++]; }
    $ins('bio_chapters', ['title','paras','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['bandMembers'] ?? []) as $m) { $rows[] = [$m['name'], $m['instrument'], $m['since'] ?? '', $m['note'] ?? '', $i++]; }
    $ins('bio_band_members', ['name','instrument','since','note','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['faqs'] ?? []) as $f) { $rows[] = [$f['q'], $f['a'] ?? '', $i++]; }
    $ins('bio_faqs', ['q','a','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['awards'] ?? []) as $a) { $rows[] = [$a['year'], $a['name'], $a['note'] ?? '', $i++]; }
    $ins('bio_awards', ['year','name','note','sort'], $rows, $reseed);

    // tour
    $rows = []; $i = 0;
    foreach (($data['tourCities'] ?? []) as $t) {
        $rows[] = [$t['city'], $t['province'], (int)$t['year'], $t['venue'] ?? '', (int)!empty($t['done']), $i++];
    }
    $ins('tour_cities', ['city','province','year','venue','done','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['timeline'] ?? []) as $t) {
        $rows[] = [$t['date'], (int)$t['year'], $t['title'], $t['text'] ?? '', $t['kind'] ?? 'other', $i++];
    }
    $ins('tour_timeline', ['date','year','title','text','kind','sort'], $rows, $reseed);
    $tc = $data['tourConfig'] ?? [];
    if ($reseed || !$db->query('SELECT 1 FROM tour_config')->fetch()) {
        $db->exec('DELETE FROM tour_config');
        $db->prepare('INSERT INTO tour_config (id,target,name,slogan) VALUES (1,?,?,?)')
           ->execute([(int)($tc['target'] ?? 334), $tc['name'] ?? '', $tc['slogan'] ?? '']);
    }

    // sponsors
    $rows = []; $i = 0;
    foreach (($data['sponsors'] ?? []) as $s) {
        $rows[] = [$s['id'], $s['name'], $s['icon'] ?? '', (float)($s['amount'] ?? 0),
            to_json($s['benefits'] ?? []), (int)!empty($s['featured']), $s['accent'] ?? '', $i++];
    }
    $ins('sponsor_tiers', ['id','name','icon','amount','benefits','featured','accent','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['payChannels'] ?? []) as $c) {
        $rows[] = [$c['key'], $c['label'], $c['hint'] ?? '', $c['qrImage'] ?? '', $i++];
    }
    $ins('sponsor_channels', ['code','label','hint','qr_image','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['sponsorWall'] ?? []) as $w) {
        $rows[] = [$w['nick'], $w['tier'] ?? '', (float)($w['amount'] ?? 0), $w['date'] ?? '', $w['words'] ?? '', $i++];
    }
    $ins('sponsor_wall', ['nick','tier','amount','date','words','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['sponsorStats'] ?? []) as $s) { $rows[] = [$s['label'], $s['value'], $i++]; }
    $ins('sponsor_stats', ['label','value','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['useCases'] ?? []) as $u) { $rows[] = [$u['title'], $u['text'] ?? '', $i++]; }
    $ins('sponsor_use_cases', ['title','text','sort'], $rows, $reseed);

    // quotes / banners
    $rows = []; $i = 0;
    foreach (($data['quotes'] ?? []) as $q) { $rows[] = [$q['text'], $q['source'] ?? '', $i++]; }
    $ins('quotes', ['text','source','sort'], $rows, $reseed);
    $rows = []; $i = 0;
    foreach (($data['banners'] ?? []) as $b) {
        $rows[] = [$b['kicker'] ?? '', $b['title'], $b['desc'] ?? '', $b['songId'] ?? null,
            $b['to'] ?? null, $b['image'] ?? '', (int)($b['hue'] ?? 0), $i++];
    }
    $ins('banners', ['kicker','title','desc','song_id','link_to','image','hue','sort'], $rows, $reseed);

    // achievements
    $rows = []; $i = 0;
    foreach (($data['achievements'] ?? []) as $a) {
        $rule = $a['rule'] ?? ['metric' => 'playCount', 'threshold' => 1];
        $rows[] = [$a['id'], $a['icon'] ?? '', $a['name'], $a['hint'] ?? '', $rule['metric'] ?? 'playCount',
            (int)($rule['threshold'] ?? 1), $i++];
    }
    $ins('achievements', ['id','icon','name','hint','metric','threshold','sort'], $rows, $reseed);

    // easter_eggs
    if ($reseed || !$db->query('SELECT 1 FROM easter_eggs')->fetch()) {
        $db->exec('DELETE FROM easter_eggs');
        $db->prepare('INSERT INTO easter_eggs (id,data) VALUES (1,?)')->execute([to_json($data['easterEggs'] ?? new stdClass())]);
    }

    // nav (main + lib)
    if ($reseed) $db->exec('DELETE FROM nav_items');
    $st = $db->prepare('INSERT INTO nav_items (`to`,`label`,`icon`,`desc`,`group`,`sort`,`visible`) VALUES (?,?,?,?,?,?,1)');
    $i = 0; foreach (($data['navItems'] ?? []) as $n) {
        $st->execute([$n['to'], $n['label'], $n['icon'], $n['desc'] ?? null, 'main', $i++]);
    }
    $i = 0; foreach (($data['libItems'] ?? []) as $n) {
        $st->execute([$n['to'], $n['label'], $n['icon'], null, 'lib', $i++]);
    }
}
