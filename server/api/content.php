<?php
/**
 * 公开内容读取接口。
 * 核心：GET /api/bootstrap —— 一次返回前端所需的全部内容，结构与 src/data 对齐。
 */
return function (Router $r) {

    $r->get('/bootstrap', function () {
        require_once __DIR__ . '/../lib/cache.php';
        $data = cache_get('bootstrap');
        if ($data === null) {
            $data = assemble_bootstrap();
            cache_set('bootstrap', $data);
        }
        $json = json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $etag = '"' . md5($json) . '"';

        header('ETag: ' . $etag);
        header('Cache-Control: no-cache');
        header('Vary: Accept-Encoding');
        // 内容未变化时直接返回 304，避免重复传输整包
        if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
            http_response_code(304);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');
        // 支持 gzip（若 Web 服务器未压缩 JSON，则由 PHP 压缩一次）
        if (function_exists('gzencode') && str_contains($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip')) {
            header('Content-Encoding: gzip');
            echo gzencode($json, 6);
        } else {
            echo $json;
        }
        exit;
    });

    $r->get('/albums', function () {
        $rows = db()->query('SELECT * FROM albums ORDER BY sort, year, id')->fetchAll();
        json_ok(array_map('fmt_album', $rows));
    });

    $r->get('/albums/{id}', function ($p) {
        $st = db()->prepare('SELECT * FROM albums WHERE id=?');
        $st->execute([$p['id']]);
        $album = $st->fetch();
        if (!$album) json_err('专辑不存在', 404);
        $songs = db()->prepare('SELECT * FROM songs WHERE album_id=? ORDER BY track_no, sort, id');
        $songs->execute([$p['id']]);
        $out = fmt_album($album);
        $out['songs'] = array_map('fmt_song', $songs->fetchAll());
        json_ok($out);
    });

    $r->get('/songs', function () {
        $where = ['1=1']; $args = [];
        if (!empty($_GET['album'])) { $where[] = 'album_id=?'; $args[] = $_GET['album']; }
        if (!empty($_GET['city']))  { $where[] = 'city=?';    $args[] = $_GET['city']; }
        if (!empty($_GET['tag']))   { $where[] = 'JSON_CONTAINS(tags, JSON_QUOTE(?))'; $args[] = $_GET['tag']; }
        if (!empty($_GET['q']))     { $where[] = 'title LIKE ?'; $args[] = '%' . $_GET['q'] . '%'; }
        $sql = 'SELECT * FROM songs WHERE ' . implode(' AND ', $where) . ' ORDER BY sort, id';
        $st = db()->prepare($sql); $st->execute($args);
        json_ok(array_map('fmt_song', $st->fetchAll()));
    });

    $r->get('/songs/{id}', function ($p) {
        $st = db()->prepare('SELECT * FROM songs WHERE id=?');
        $st->execute([$p['id']]);
        $row = $st->fetch();
        if (!$row) json_err('曲目不存在', 404);
        $out = fmt_song($row);
        // 详情接口额外带上完整和弦谱（bootstrap 仅含轻量摘要）
        $ss = db()->prepare('SELECT data FROM chord_sheets WHERE song_id=?');
        $ss->execute([$p['id']]);
        if ($sh = $ss->fetch()) {
            $d = from_json($sh['data'], []);
            if (is_array($d)) { $d['songId'] = $p['id']; $out['sheet'] = $d; }
        }
        json_ok($out);
    });

    $r->get('/videos', function () {
        $rows = db()->query('SELECT * FROM videos ORDER BY sort, year DESC, id')->fetchAll();
        json_ok(array_map('fmt_video', $rows));
    });

    $r->get('/videos/{id}', function ($p) {
        $st = db()->prepare('SELECT * FROM videos WHERE id=?'); $st->execute([$p['id']]);
        $row = $st->fetch(); if (!$row) json_err('视频不存在', 404);
        json_ok(fmt_video($row));
    });

    $r->get('/shorts', function () {
        $rows = db()->query('SELECT * FROM shorts ORDER BY sort, id')->fetchAll();
        json_ok(array_map('fmt_short', $rows));
    });

    $r->get('/shorts/{id}', function ($p) {
        $st = db()->prepare('SELECT * FROM shorts WHERE id=?'); $st->execute([$p['id']]);
        $row = $st->fetch(); if (!$row) json_err('不存在', 404);
        json_ok(fmt_short($row));
    });

    $r->get('/search', function () {
        $q = trim($_GET['q'] ?? '');
        $out = ['songs' => [], 'albums' => [], 'videos' => [], 'shorts' => []];
        if ($q === '') { json_ok($out); }
        $like = '%' . $q . '%';
        $s = db()->prepare('SELECT * FROM songs WHERE title LIKE ? OR city LIKE ? ORDER BY id LIMIT 50');
        $s->execute([$like, $like]); $out['songs'] = array_map('fmt_song', $s->fetchAll());
        $a = db()->prepare('SELECT * FROM albums WHERE name LIKE ? OR description LIKE ? LIMIT 20');
        $a->execute([$like, $like]); $out['albums'] = array_map('fmt_album', $a->fetchAll());
        $v = db()->prepare('SELECT * FROM videos WHERE title LIKE ? OR city LIKE ? LIMIT 20');
        $v->execute([$like, $like]); $out['videos'] = array_map('fmt_video', $v->fetchAll());
        $sh = db()->prepare('SELECT * FROM shorts WHERE title LIKE ? OR author LIKE ? OR city LIKE ? LIMIT 20');
        $sh->execute([$like, $like, $like]); $out['shorts'] = array_map('fmt_short', $sh->fetchAll());
        json_ok($out);
    });
};

// ---------------- 格式化 ----------------

function fmt_album(array $a): array {
    static $songIdsMap = null;
    if ($songIdsMap === null) {
        $songIdsMap = [];
        foreach (db()->query('SELECT album_id, id FROM songs ORDER BY track_no, sort, id')->fetchAll() as $s) {
            $songIdsMap[$s['album_id']][] = $s['id'];
        }
    }
    return [
        'id' => $a['id'], 'name' => $a['name'], 'year' => (int)$a['year'],
        'date' => $a['date'], 'type' => $a['type'], 'description' => $a['description'] ?? '',
        'cover' => $a['cover'] ?? '',
        'songIds' => $songIdsMap[$a['id']] ?? [],
    ];
}

function fmt_song(array $s, bool $withLyrics = true): array {
    return [
        'id' => $s['id'], 'title' => $s['title'], 'albumId' => $s['album_id'],
        'duration' => (int)$s['duration'], 'audioUrl' => $s['audio_url'] ?? '',
        // bootstrap 为减小体积不下发歌词，详情页按 /api/songs/{id} 懒加载
        'lyrics' => $withLyrics ? ($s['lyrics'] ?? '') : '', 'bpm' => (int)$s['bpm'],
        'key' => $s['song_key'], 'capo' => (int)$s['capo'],
        'difficulty' => (int)$s['difficulty'],
        'tags' => from_json($s['tags'], []),
        'playCount' => (int)$s['play_count'], 'year' => (int)$s['year'],
        'city' => $s['city'] ?: null,
    ];
}

function fmt_video(array $v): array {
    return [
        'id' => $v['id'], 'title' => $v['title'], 'videoUrl' => $v['video_url'] ?? '',
        'poster' => $v['poster'] ?? '', 'duration' => (int)$v['duration'],
        'category' => $v['category'], 'year' => (int)$v['year'],
        'city' => $v['city'] ?: null,
        'relatedSongId' => $v['related_song_id'] ?: null,
        'description' => $v['description'] ?? '', 'views' => (int)$v['views'],
    ];
}

function fmt_short(array $s): array {
    return [
        'id' => $s['id'], 'title' => $s['title'], 'author' => $s['author'],
        'desc' => $s['desc'] ?? '', 'tags' => from_json($s['tags'], []),
        'city' => $s['city'] ?: null, 'duration' => (int)$s['duration'],
        'likes' => (int)$s['likes'], 'comments' => (int)$s['comments'],
        'saves' => (int)$s['saves'], 'views' => (int)$s['views'],
        'song' => $s['song'] ?: null,
        'videoUrl' => $s['video_url'] ?? '', 'poster' => $s['poster'] ?? '',
    ];
}

// ---------------- bootstrap 聚合 ----------------

function assemble_bootstrap(): array {
    $db = db();

    $albums = array_map('fmt_album', $db->query('SELECT * FROM albums ORDER BY sort, year, id')->fetchAll());
    $songs  = array_map(fn($s) => fmt_song($s, false), $db->query('SELECT * FROM songs ORDER BY sort, id')->fetchAll());
    $videos = array_map('fmt_video', $db->query('SELECT * FROM videos ORDER BY sort, year DESC, id')->fetchAll());
    $shorts = array_map('fmt_short', $db->query('SELECT * FROM shorts ORDER BY sort, id')->fetchAll());

    // 和弦库
    $chordLibrary = array_map(function ($c) {
        return [
            'name' => $c['name'], 'display' => $c['display'],
            'frets' => from_json($c['frets'], []), 'fingers' => from_json($c['fingers'], []),
            'rootString' => (int)$c['root_string'], 'quality' => $c['quality'],
        ];
    }, $db->query('SELECT * FROM chord_library ORDER BY sort, id')->fetchAll());

    $sheets = array_map(function ($s) {
        // 只下发摘要字段，完整段落/前奏/提示等由 /api/songs/{id} 提供
        $d = from_json($s['data'], []);
        $d = is_array($d) ? $d : [];
        return [
            'songId' => $s['song_id'],
            'tuning' => $d['tuning'] ?? '',
            'tempoMark' => $d['tempoMark'] ?? '',
            'levelText' => $d['levelText'] ?? '',
            'usedChords' => $d['usedChords'] ?? [],
        ];
    }, $db->query('SELECT song_id, data FROM chord_sheets ORDER BY id')->fetchAll());

    $progressions = array_map(function ($p) {
        return ['name' => $p['name'], 'roman' => $p['roman'],
            'degrees' => from_json($p['degrees'], []), 'example' => $p['example'], 'hint' => $p['hint']];
    }, $db->query('SELECT * FROM progressions ORDER BY sort, id')->fetchAll());

    $difficultyScale = array_map(function ($d) {
        return ['level' => (int)$d['level'], 'label' => $d['label'], 'desc' => $d['desc']];
    }, $db->query('SELECT * FROM difficulty_scale ORDER BY level')->fetchAll());

    // 百科
    $profile = null;
    $pf = $db->query('SELECT data FROM bio_profile WHERE id=1')->fetch();
    if ($pf) $profile = from_json($pf['data'], null);

    $facts = array_map(function ($f) {
        return ['label' => $f['label'], 'value' => $f['value'], 'note' => $f['note'] ?: null];
    }, $db->query('SELECT * FROM bio_facts ORDER BY sort, id')->fetchAll());

    $chapters = array_map(function ($c) {
        return ['title' => $c['title'], 'paras' => from_json($c['paras'], [])];
    }, $db->query('SELECT * FROM bio_chapters ORDER BY sort, id')->fetchAll());

    $bandMembers = array_map(function ($m) {
        return ['name' => $m['name'], 'instrument' => $m['instrument'],
            'since' => $m['since'], 'note' => $m['note']];
    }, $db->query('SELECT * FROM bio_band_members ORDER BY sort, id')->fetchAll());

    $faqs = array_map(function ($f) { return ['q' => $f['q'], 'a' => $f['a'] ?? '']; },
        $db->query('SELECT * FROM bio_faqs ORDER BY sort, id')->fetchAll());

    $awards = array_map(function ($a) { return ['year' => $a['year'], 'name' => $a['name'], 'note' => $a['note']]; },
        $db->query('SELECT * FROM bio_awards ORDER BY sort, id')->fetchAll());

    // 巡演
    $tourCities = array_map(function ($t) {
        return ['city' => $t['city'], 'province' => $t['province'], 'year' => (int)$t['year'],
            'venue' => $t['venue'], 'done' => (bool)$t['done']];
    }, $db->query('SELECT * FROM tour_cities ORDER BY sort, id')->fetchAll());

    $timeline = array_map(function ($t) {
        return ['date' => $t['date'], 'year' => (int)$t['year'], 'title' => $t['title'],
            'text' => $t['text'] ?? '', 'kind' => $t['kind']];
    }, $db->query('SELECT * FROM tour_timeline ORDER BY sort, id')->fetchAll());

    $tc = $db->query('SELECT * FROM tour_config WHERE id=1')->fetch() ?: [];
    $tourConfig = [
        'target' => (int)($tc['target'] ?? 334),
        'name' => $tc['name'] ?? '',
        'slogan' => $tc['slogan'] ?? '',
    ];

    // 赞助
    $sponsors = array_map(function ($s) {
        $o = ['id' => $s['id'], 'name' => $s['name'], 'icon' => $s['icon'],
            'amount' => (float)$s['amount'], 'benefits' => from_json($s['benefits'], []),
            'accent' => $s['accent']];
        if ($s['featured']) $o['featured'] = true;
        return $o;
    }, $db->query('SELECT * FROM sponsor_tiers ORDER BY sort, amount, id')->fetchAll());

    $payChannels = array_map(function ($c) {
        return ['key' => $c['code'], 'label' => $c['label'], 'hint' => $c['hint'],
            'qrImage' => $c['qr_image'] ?: null];
    }, $db->query('SELECT * FROM sponsor_channels ORDER BY sort, id')->fetchAll());

    $sponsorWall = array_map(function ($w) {
        return ['nick' => $w['nick'], 'tier' => $w['tier'], 'amount' => (float)$w['amount'],
            'date' => $w['date'], 'words' => $w['words']];
    }, $db->query('SELECT * FROM sponsor_wall ORDER BY sort, id DESC')->fetchAll());

    $sponsorStats = array_map(function ($s) { return ['label' => $s['label'], 'value' => $s['value']]; },
        $db->query('SELECT * FROM sponsor_stats ORDER BY sort, id')->fetchAll());

    $useCases = array_map(function ($u) { return ['title' => $u['title'], 'text' => $u['text']]; },
        $db->query('SELECT * FROM sponsor_use_cases ORDER BY sort, id')->fetchAll());

    // 语录 / 横幅
    $quotes = array_map(function ($q) { return ['text' => $q['text'], 'source' => $q['source']]; },
        $db->query('SELECT * FROM quotes ORDER BY sort, id')->fetchAll());

    $banners = array_map(function ($b) {
        $o = ['kicker' => $b['kicker'], 'title' => $b['title'], 'desc' => $b['desc'],
            'hue' => (int)$b['hue']];
        if (!empty($b['song_id'])) $o['songId'] = $b['song_id'];
        if (!empty($b['link_to'])) $o['to'] = $b['link_to'];
        if (!empty($b['image'])) $o['image'] = $b['image'];
        return $o;
    }, $db->query('SELECT * FROM banners ORDER BY sort, id')->fetchAll());

    // 成就 / 彩蛋
    $achievements = array_map(function ($a) {
        return ['id' => $a['id'], 'icon' => $a['icon'], 'name' => $a['name'], 'hint' => $a['hint'],
            'metric' => $a['metric'], 'threshold' => (int)$a['threshold']];
    }, $db->query('SELECT * FROM achievements ORDER BY sort, id')->fetchAll());

    $ee = $db->query('SELECT data FROM easter_eggs WHERE id=1')->fetch();
    $easterEggs = $ee ? from_json($ee['data'], (object)[]) : (object)[];

    // 导航
    $navRows = $db->query('SELECT * FROM nav_items WHERE visible=1 ORDER BY sort, id')->fetchAll();
    $navItems = []; $libItems = [];
    foreach ($navRows as $n) {
        $item = ['to' => $n['to'], 'label' => $n['label'], 'icon' => $n['icon']];
        if (!empty($n['desc'])) $item['desc'] = $n['desc'];
        if ($n['group'] === 'lib') $libItems[] = $item; else $navItems[] = $item;
    }

    return compact(
        'albums', 'songs', 'videos', 'shorts', 'chordLibrary', 'sheets', 'progressions',
        'difficultyScale', 'profile', 'facts', 'chapters', 'bandMembers', 'faqs', 'awards',
        'tourCities', 'timeline', 'tourConfig', 'sponsors', 'payChannels', 'sponsorWall',
        'sponsorStats', 'useCases', 'quotes', 'banners', 'achievements', 'easterEggs',
        'navItems', 'libItems'
    );
}
