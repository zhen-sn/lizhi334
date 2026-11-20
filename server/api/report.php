<?php
/**
 * 播放 / 观看上报。匿名也可上报（有 user 则记到用户名下）。
 */
return function (Router $r) {

    $r->post('/report/play', function () {
        $sid = inp('songId', '');
        if ($sid === '') json_err('缺少歌曲');
        $u = current_user();
        $uid = $u ? (int)$u['id'] : null;
        db()->prepare('UPDATE songs SET play_count=play_count+1 WHERE id=?')->execute([$sid]);
        db()->prepare('INSERT INTO play_events (song_id,user_id,ip) VALUES (?,?,?)')
            ->execute([$sid, $uid, client_ip()]);
        if ($uid) {
            db()->prepare('INSERT INTO user_play_counts (user_id,song_id,count) VALUES (?,?,1)
                           ON DUPLICATE KEY UPDATE count=count+1')->execute([$uid, $sid]);
            db()->prepare('INSERT INTO play_history (user_id,song_id) VALUES (?,?)')->execute([$uid, $sid]);
            touch_active_day($uid);
        }
        json_ok();
    });

    $r->post('/report/finish', function () {
        $sid = inp('songId', ''); $seconds = (int)inp('seconds', 0);
        $u = current_user(); $uid = $u ? (int)$u['id'] : null;
        db()->prepare('INSERT INTO play_events (song_id,user_id,seconds,finished,ip) VALUES (?,?,?,?,?)')
            ->execute([$sid, $uid, $seconds, 1, client_ip()]);
        if ($uid) {
            $day = date('Y-m-d');
            db()->prepare('INSERT INTO user_daily_stats (user_id,stat_date,seconds) VALUES (?,?,?)
                           ON DUPLICATE KEY UPDATE seconds=seconds+?')
                ->execute([$uid, $day, $seconds, $seconds]);
            db()->prepare('INSERT INTO user_profile_stats (user_id,total_seconds,completed_songs) VALUES (?,?,1)
                           ON DUPLICATE KEY UPDATE total_seconds=total_seconds+?, completed_songs=completed_songs+1')
                ->execute([$uid, $seconds, $seconds]);
        }
        json_ok();
    });

    $r->post('/report/night', function () {
        $u = current_user(); $uid = $u ? (int)$u['id'] : null;
        if ($uid) {
            $day = date('Y-m-d');
            db()->prepare('INSERT INTO user_daily_stats (user_id,stat_date,night_count) VALUES (?,?,1)
                           ON DUPLICATE KEY UPDATE night_count=night_count+1')
                ->execute([$uid, $day]);
        }
        json_ok();
    });

    $r->post('/report/video', function () {
        $id = inp('videoId', '');
        if ($id) db()->prepare('UPDATE videos SET views=views+1 WHERE id=?')->execute([$id]);
        json_ok();
    });

    $r->post('/report/short', function () {
        $id = inp('shortId', '');
        if ($id) db()->prepare('UPDATE shorts SET views=views+1 WHERE id=?')->execute([$id]);
        json_ok();
    });
};

function touch_active_day(int $uid): void {
    $today = date('Y-m-d');
    $ps = db()->prepare('SELECT active_days FROM user_profile_stats WHERE user_id=?');
    $ps->execute([$uid]);
    $row = $ps->fetch();
    if (!$row) {
        db()->prepare('INSERT INTO user_profile_stats (user_id,active_days) VALUES (?,?)')
            ->execute([$uid, to_json([$today])]);
        return;
    }
    $days = from_json($row['active_days'], []);
    if (!in_array($today, $days, true)) {
        $days[] = $today;
        if (count($days) > 400) $days = array_slice($days, -400);
        db()->prepare('UPDATE user_profile_stats SET active_days=? WHERE user_id=?')
            ->execute([to_json($days), $uid]);
    }
}
