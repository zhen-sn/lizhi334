<?php
/**
 * 用户投稿：提交 / 我的投稿列表 / 文件上传。
 * 提交后状态为 pending，由后台审核。
 */
return function (Router $r) {

    $r->post('/uploads', function () {
        csrf_check();
        $u = current_user();
        $author = trim(inp('author', ''));
        if (!$u && $author === '') json_err('请先登录或填写署名');
        $title = trim(inp('title', ''));
        if ($title === '') json_err('请填写标题');
        $type = inp('type', 'other');
        db()->prepare(
            'INSERT INTO uploads (user_id,type,title,song_ref,file_name,file_url,link,note,contact,author)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $u ? $u['id'] : null,
            in_array($type, ['audio','video','tab','photo','other'], true) ? $type : 'other',
            $title,
            inp('songRef', null) ?: null,
            inp('fileName', null) ?: null,
            inp('fileUrl', null) ?: null,
            inp('link', null) ?: null,
            inp('note', null) ?: null,
            inp('contact', null) ?: null,
            $u ? $u['name'] : $author,
        ]);
        json_ok(['id' => (int)db()->lastInsertId()]);
    });

    $r->get('/uploads/mine', function () {
        $u = require_user();
        $st = db()->prepare('SELECT id,type,title,song_ref,file_name,file_url,link,note,status,created_at
                             FROM uploads WHERE user_id=? ORDER BY created_at DESC');
        $st->execute([$u['id']]);
        $out = array_map(function ($r) {
            return [
                'id' => (int)$r['id'], 'type' => $r['type'], 'title' => $r['title'],
                'songRef' => $r['song_ref'], 'fileName' => $r['file_name'], 'fileUrl' => $r['file_url'],
                'link' => $r['link'], 'note' => $r['note'], 'status' => $r['status'],
                'createdAt' => strtotime($r['created_at']) * 1000,
            ];
        }, $st->fetchAll());
        json_ok($out);
    });

    $r->post('/uploads/file', function () {
        csrf_check();
        $u = current_user(); // 登录或游客都可上传
        if (empty($_FILES['file'])) json_err('未收到文件');
        $f = $_FILES['file'];
        if ($f['error'] !== UPLOAD_ERR_OK) json_err('上传失败，错误码 ' . $f['error']);
        if ($f['size'] > 100 * 1024 * 1024) json_err('文件过大（上限 100MB）');
        $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
        $allow = ['mp3','wav','flac','m4a','mp4','mov','pdf','jpg','jpeg','png','gif','webp','txt','zip'];
        if (!in_array($ext, $allow, true)) json_err('不支持的文件类型');
        require_once __DIR__ . '/../lib/storage.php';
        try {
            $saved = storage_put($f['tmp_name'], $ext);
        } catch (RuntimeException $e) {
            json_err('上传失败：' . $e->getMessage(), 500);
        }
        json_ok(['url' => $saved['url'], 'fileName' => $f['name'], 'size' => $f['size'], 'driver' => $saved['driver']]);
    });

    // 撤回自己未审核的投稿
    $r->delete('/uploads/{id}', function ($p) {
        csrf_check();
        $u = require_user();
        $st = db()->prepare("DELETE FROM uploads WHERE id=? AND user_id=? AND status='pending'");
        $st->execute([(int)$p['id'], $u['id']]);
        if ($st->rowCount() === 0) json_err('记录不存在或已审核，无法撤回', 404);
        json_ok();
    });
};
