<?php
/**
 * 评论：列表 / 发表 / 删除 / 点赞。target_type: song | video | short。
 * 写操作需要登录 + CSRF。
 */
return function (Router $r) {

    $r->get('/comments/{type}/{id}', function ($p) {
        $type = $p['type']; $tid = $p['id'];
        if (!in_array($type, ['song', 'video', 'short'], true)) json_err('非法的评论对象类型');
        $me = current_user();
        $st = db()->prepare(
            'SELECT c.*, (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id=c.id) AS like_count
             FROM comments c
             WHERE c.target_type=? AND c.target_id=? AND c.status=1
             ORDER BY c.created_at DESC'
        );
        $st->execute([$type, $tid]);
        $list = $st->fetchAll();

        // 组装二级回复
        $roots = []; $children = [];
        foreach ($list as $c) {
            $item = [
                'id' => (int)$c['id'], 'userId' => (int)$c['user_id'],
                'userName' => $c['user_name'], 'text' => $c['text'],
                'createdAt' => strtotime($c['created_at']) * 1000,
                'likes' => (int)$c['like_count'],
                'liked' => false,
                'canDelete' => $me && (int)$me['id'] === (int)$c['user_id'],
            ];
            if (!empty($c['reply_to_name'])) $item['replyToName'] = $c['reply_to_name'];
            if ($c['parent_id']) $children[(int)$c['parent_id']][] = $item;
            else $roots[] = $item + ['replies' => []];
        }
        // 我点赞过的评论
        if ($me) {
            $ids = array_column($list, 'id');
            if ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                $lk = db()->prepare("SELECT comment_id FROM comment_likes WHERE user_id=? AND comment_id IN ($in)");
                $lk->execute(array_merge([$me['id']], $ids));
                $likedIds = array_flip(array_column($lk->fetchAll(), 'comment_id'));
                foreach ($roots as &$root) {
                    $root['liked'] = isset($likedIds[$root['id']]);
                    foreach ($children[$root['id']] ?? [] as &$rep) {
                        $rep['liked'] = isset($likedIds[$rep['id']]);
                    }
                    $root['replies'] = $children[$root['id']] ?? [];
                }
                unset($root, $rep);
            }
        } else {
            foreach ($roots as &$root) { $root['replies'] = $children[$root['id']] ?? []; }
            unset($root);
        }
        json_ok($roots);
    });

    // 注意：点赞路由必须注册在 /comments/{type}/{id} 之前，否则会先被后者匹配
    $r->post('/comments/{id}/like', function ($p) {
        csrf_check();
        $u = require_user();
        $cid = (int)$p['id'];
        $st = db()->prepare('SELECT id FROM comments WHERE id=?'); $st->execute([$cid]);
        if (!$st->fetch()) json_err('评论不存在', 404);
        $del = db()->prepare('DELETE FROM comment_likes WHERE comment_id=? AND user_id=?');
        $del->execute([$cid, $u['id']]);
        $liked = $del->rowCount() === 0;
        if ($liked) {
            db()->prepare('INSERT INTO comment_likes (comment_id,user_id) VALUES (?,?)')->execute([$cid, $u['id']]);
        }
        $cnt = db()->prepare('SELECT COUNT(*) FROM comment_likes WHERE comment_id=?'); $cnt->execute([$cid]);
        json_ok(['liked' => $liked, 'likes' => (int)$cnt->fetchColumn()]);
    });

    $r->post('/comments/{type}/{id}', function ($p) {
        csrf_check();
        $u = require_user();
        $type = $p['type']; $tid = $p['id'];
        if (!in_array($type, ['song', 'video', 'short'], true)) json_err('非法的评论对象类型');
        $text = trim(inp('text', ''));
        if ($text === '') json_err('评论内容不能为空');
        $text = mb_substr($text, 0, 500);
        $parentId = inp('parentId', null);
        $replyToName = inp('replyToName', null);
        if ($parentId) {
            $parent = db()->prepare('SELECT id,user_name FROM comments WHERE id=? AND target_type=? AND target_id=?');
            $parent->execute([$parentId, $type, $tid]);
            $pr = $parent->fetch();
            if (!$pr) json_err('回复的评论不存在');
            $replyToName = $pr['user_name'];
            // 二级回复都挂到根评论
            $root = db()->prepare('SELECT parent_id FROM comments WHERE id=?');
            $root->execute([$parentId]);
            $rp = $root->fetch();
            if ($rp['parent_id']) $parentId = $rp['parent_id'];
        }
        db()->prepare(
            'INSERT INTO comments (target_type,target_id,user_id,user_name,text,parent_id,reply_to_name,ip)
             VALUES (?,?,?,?,?,?,?,?)'
        )->execute([$type, $tid, $u['id'], $u['name'], $text, $parentId ?: null, $replyToName, client_ip()]);
        json_ok(['id' => (int)db()->lastInsertId()]);
    });

    $r->delete('/comments/{id}', function ($p) {
        csrf_check();
        $u = require_user();
        $st = db()->prepare('SELECT user_id,parent_id FROM comments WHERE id=?');
        $st->execute([$p['id']]);
        $c = $st->fetch();
        if (!$c) json_err('评论不存在', 404);
        $isAdmin = !empty($u['role']) && $u['role'] === 'admin';
        if ((int)$c['user_id'] !== (int)$u['id'] && !$isAdmin) json_err('无权删除', 403);
        // 删除根评论连带其回复
        db()->prepare('DELETE FROM comments WHERE id=? OR parent_id=?')->execute([$p['id'], $p['id']]);
        json_ok();
    });
};
