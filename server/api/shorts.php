<?php
/**
 * 短视频互动：点赞 / 收藏 / 下载（需登录）。
 */
return function (Router $r) {

    $r->get('/shorts/interactions', function () {
        $u = current_user();
        if (!$u) { json_ok(['liked' => [], 'saved' => [], 'downloaded' => []]); }
        $liked = db()->prepare('SELECT short_id FROM short_likes WHERE user_id=?'); $liked->execute([$u['id']]);
        $saved = db()->prepare('SELECT short_id FROM short_saves WHERE user_id=?'); $saved->execute([$u['id']]);
        $down  = db()->prepare('SELECT short_id FROM short_downloads WHERE user_id=?'); $down->execute([$u['id']]);
        json_ok([
            'liked' => array_column($liked->fetchAll(), 'short_id'),
            'saved' => array_column($saved->fetchAll(), 'short_id'),
            'downloaded' => array_column($down->fetchAll(), 'short_id'),
        ]);
    });

    $toggle = function (string $table, string $col) {
        return function ($p) use ($table, $col) {
            csrf_check();
            $u = require_user();
            $sid = $p['id'];
            $exists = db()->prepare("SELECT 1 FROM $table WHERE user_id=? AND short_id=?");
            $exists->execute([$u['id'], $sid]);
            $active = !$exists->fetch();
            if ($active) {
                db()->prepare("INSERT INTO $table (user_id,short_id) VALUES (?,?)")->execute([$u['id'], $sid]);
                db()->prepare("UPDATE shorts SET $col=$col+1 WHERE id=?")->execute([$sid]);
            } else {
                db()->prepare("DELETE FROM $table WHERE user_id=? AND short_id=?")->execute([$u['id'], $sid]);
                db()->prepare("UPDATE shorts SET $col=GREATEST($col-1,0) WHERE id=?")->execute([$sid]);
            }
            $cnt = db()->prepare("SELECT $col FROM shorts WHERE id=?"); $cnt->execute([$sid]);
            json_ok(['active' => $active, 'count' => (int)$cnt->fetchColumn()]);
        };
    };

    $r->post('/shorts/{id}/like', $toggle('short_likes', 'likes'));
    $r->post('/shorts/{id}/save', $toggle('short_saves', 'saves'));
    $r->post('/shorts/{id}/download', $toggle('short_downloads', 'downloads'));
};
