<?php
/**
 * 我的库：收藏 / 歌单 / 历史 / 播放位置 / 统计 / 成就。
 * 全部需要登录。
 */
return function (Router $r) {

    // ---- 收藏 ----
    $r->get('/library/favorites', function () {
        $u = require_user();
        $st = db()->prepare('SELECT song_id FROM favorites WHERE user_id=? ORDER BY created_at DESC');
        $st->execute([$u['id']]);
        json_ok(array_column($st->fetchAll(), 'song_id'));
    });

    $r->post('/library/favorites/{songId}', function ($p) {
        csrf_check();
        $u = require_user();
        $sid = $p['songId'];
        $del = db()->prepare('DELETE FROM favorites WHERE user_id=? AND song_id=?');
        $del->execute([$u['id'], $sid]);
        $fav = $del->rowCount() === 0;
        if ($fav) db()->prepare('INSERT INTO favorites (user_id,song_id) VALUES (?,?)')->execute([$u['id'], $sid]);
        json_ok(['fav' => $fav]);
    });

    // ---- 歌单 ----
    $r->get('/library/playlists', function () {
        $u = require_user();
        $st = db()->prepare('SELECT * FROM playlists WHERE user_id=? ORDER BY created_at DESC');
        $st->execute([$u['id']]);
        $lists = $st->fetchAll();
        $out = [];
        foreach ($lists as $l) {
            $ps = db()->prepare('SELECT song_id FROM playlist_songs WHERE playlist_id=? ORDER BY sort, added_at');
            $ps->execute([$l['id']]);
            $out[] = [
                'id' => 'p' . $l['id'], 'name' => $l['name'], 'desc' => $l['desc'],
                'songIds' => array_column($ps->fetchAll(), 'song_id'),
                'createdAt' => strtotime($l['created_at']) * 1000,
            ];
        }
        json_ok($out);
    });

    $r->post('/library/playlists', function () {
        csrf_check();
        $u = require_user();
        $name = trim(inp('name', ''));
        if ($name === '') json_err('歌单名不能为空');
        db()->prepare('INSERT INTO playlists (user_id,name,`desc`) VALUES (?,?,?)')
            ->execute([$u['id'], $name, inp('desc', '')]);
        $id = (int)db()->lastInsertId();
        json_ok(['id' => 'p' . $id]);
    });

    $r->put('/library/playlists/{id}', function ($p) {
        csrf_check();
        $u = require_user();
        $id = (int)ltrim($p['id'], 'p');
        $st = db()->prepare('UPDATE playlists SET name=?, `desc`=? WHERE id=? AND user_id=?');
        $st->execute([inp('name', ''), inp('desc', ''), $id, $u['id']]);
        json_ok();
    });

    $r->delete('/library/playlists/{id}', function ($p) {
        csrf_check();
        $u = require_user();
        $id = (int)ltrim($p['id'], 'p');
        db()->prepare('DELETE FROM playlists WHERE id=? AND user_id=?')->execute([$id, $u['id']]);
        db()->prepare('DELETE FROM playlist_songs WHERE playlist_id=?')->execute([$id]);
        json_ok();
    });

    $r->post('/library/playlists/{id}/songs', function ($p) {
        csrf_check();
        $u = require_user();
        $id = (int)ltrim($p['id'], 'p');
        $sid = inp('songId', '');
        if ($sid === '') json_err('缺少歌曲');
        // 校验归属
        $own = db()->prepare('SELECT id FROM playlists WHERE id=? AND user_id=?'); $own->execute([$id, $u['id']]);
        if (!$own->fetch()) json_err('歌单不存在', 404);
        db()->prepare('INSERT IGNORE INTO playlist_songs (playlist_id,song_id,sort) VALUES (?,?,?)')
            ->execute([$id, $sid, time()]);
        json_ok();
    });

    $r->delete('/library/playlists/{id}/songs/{songId}', function ($p) {
        csrf_check();
        $u = require_user();
        $id = (int)ltrim($p['id'], 'p');
        db()->prepare('DELETE ps FROM playlist_songs ps JOIN playlists p ON p.id=ps.playlist_id
                       WHERE ps.playlist_id=? AND ps.song_id=? AND p.user_id=?')
            ->execute([$id, $p['songId'], $u['id']]);
        json_ok();
    });

    // ---- 历史 ----
    $r->get('/library/history', function () {
        $u = require_user();
        $st = db()->prepare('SELECT song_id, MAX(played_at) AS at FROM play_history WHERE user_id=?
                             GROUP BY song_id ORDER BY at DESC LIMIT 100');
        $st->execute([$u['id']]);
        $out = [];
        foreach ($st->fetchAll() as $h) {
            $out[] = ['songId' => $h['song_id'], 'at' => strtotime($h['at']) * 1000];
        }
        json_ok($out);
    });

    $r->post('/library/history/clear', function () {
        csrf_check();
        $u = require_user();
        db()->prepare('DELETE FROM play_history WHERE user_id=?')->execute([$u['id']]);
        json_ok();
    });

    // ---- 播放位置 ----
    $r->get('/library/positions', function () {
        $u = require_user();
        $st = db()->prepare('SELECT song_id, position FROM play_positions WHERE user_id=?');
        $st->execute([$u['id']]);
        $map = [];
        foreach ($st->fetchAll() as $row) $map[$row['song_id']] = (int)$row['position'];
        json_ok($map);
    });

    $r->post('/library/position', function () {
        csrf_check();
        $u = require_user();
        $sid = inp('songId', ''); $sec = (int)inp('seconds', inp('sec', 0));
        if ($sid === '') json_err('缺少歌曲');
        db()->prepare('INSERT INTO play_positions (user_id,song_id,position) VALUES (?,?,?)
                       ON DUPLICATE KEY UPDATE position=VALUES(position)')
            ->execute([$u['id'], $sid, $sec]);
        json_ok();
    });

    // ---- 统计 ----
    $r->get('/library/stats', function () {
        $u = require_user();
        json_ok(compute_stats($u['id']));
    });

    $r->post('/library/capo', function () {
        csrf_check();
        $u = require_user();
        db()->prepare('INSERT INTO user_profile_stats (user_id,capo_calcs) VALUES (?,1)
                       ON DUPLICATE KEY UPDATE capo_calcs=capo_calcs+1')->execute([$u['id']]);
        json_ok();
    });

    $r->post('/library/achievements/check', function () {
        csrf_check();
        $u = require_user();
        $snap = compute_stats($u['id']);
        $ps = db()->prepare('SELECT unlocked_achievements FROM user_profile_stats WHERE user_id=?');
        $ps->execute([$u['id']]);
        $row = $ps->fetch();
        $unlocked = from_json($row['unlocked_achievements'] ?? null, []);
        $ach = db()->query('SELECT id,metric,threshold FROM achievements')->fetchAll();
        $fresh = [];
        foreach ($ach as $a) {
            if (in_array($a['id'], $unlocked, true)) continue;
            if ($a['metric'] === 'easterEgg') continue; // 彩蛋由前端触发
            $val = $snap[$a['metric']] ?? 0;
            if ($val >= (int)$a['threshold']) $fresh[] = $a['id'];
        }
        if ($fresh) {
            $merged = array_values(array_unique(array_merge($unlocked, $fresh)));
            db()->prepare('UPDATE user_profile_stats SET unlocked_achievements=? WHERE user_id=?')
                ->execute([to_json($merged), $u['id']]);
        }
        json_ok(['unlocked' => $fresh, 'all' => array_values(array_unique(array_merge($unlocked, $fresh)))]);
    });
};

/**
 * 计算与前端 StatSnapshot 同构的统计快照。
 */
function compute_stats(int $uid): array {
    $db = db();
    // 播放次数明细
    $pc = $db->prepare('SELECT song_id, count FROM user_play_counts WHERE user_id=? AND count>0');
    $pc->execute([$uid]);
    $counts = []; $playCount = 0;
    foreach ($pc->fetchAll() as $r) { $counts[$r['song_id']] = (int)$r['count']; $playCount += (int)$r['count']; }
    $playedIds = array_keys($counts);

    // 收藏数
    $fc = $db->prepare('SELECT COUNT(*) FROM favorites WHERE user_id=?'); $fc->execute([$uid]);
    $favoriteCount = (int)$fc->fetchColumn();

    // 档案统计
    $ps = $db->prepare('SELECT * FROM user_profile_stats WHERE user_id=?'); $ps->execute([$uid]);
    $p = $ps->fetch() ?: [];
    $totalSeconds = (int)($p['total_seconds'] ?? 0);
    $completedSongs = (int)($p['completed_songs'] ?? 0);
    $capoCalcs = (int)($p['capo_calcs'] ?? 0);
    $activeDays = from_json($p['active_days'] ?? null, []);

    // 专辑覆盖度：完整听完的专辑数
    $albumCoverage = 0;
    if ($playedIds) {
        $allSongs = $db->query('SELECT id, album_id FROM songs')->fetchAll();
        $byAlbum = [];
        foreach ($allSongs as $s) { if (!empty($s['album_id'])) $byAlbum[$s['album_id']][] = $s['id']; }
        $playedSet = array_flip($playedIds);
        foreach ($byAlbum as $aid => $sids) {
            $all = true;
            foreach ($sids as $sid) { if (!isset($playedSet[$sid])) { $all = false; break; } }
            if ($all) $albumCoverage++;
        }
    }

    // 连续天数
    $days = $activeDays; sort($days);
    $streak = 0;
    for ($i = count($days) - 1; $i >= 0; $i--) {
        $want = date('Y-m-d', time() - $streak * 86400);
        if ($days[$i] === $want) $streak++;
        elseif ($days[$i] < $want) break;
    }

    // 深夜播放次数
    $nc = $db->prepare('SELECT COALESCE(SUM(night_count),0) FROM user_daily_stats WHERE user_id=?'); $nc->execute([$uid]);
    $nightPlays = (int)$nc->fetchColumn();

    return [
        'playedIds' => $playedIds, 'playCount' => $playCount,
        'totalSeconds' => $totalSeconds, 'favoriteCount' => $favoriteCount,
        'albumCoverage' => $albumCoverage, 'completedSongs' => $completedSongs,
        'consecutiveDays' => $streak, 'unlockedKeys' => $capoCalcs, 'nightPlays' => $nightPlays,
    ];
}
