<?php
/**
 * 通用 CRUD：列表 / 表单 / 保存 / 删除，由 admin/tables.php 配置驱动。
 */
require_once __DIR__ . '/../lib/helpers.php';

function admin_table(string $module, ?string $sub): ?array {
    $mods = admin_modules();
    if (!isset($mods[$module])) return null;
    $tables = $mods[$module]['tables'];
    if ($sub) {
        foreach ($tables as $t) if ($t['key'] === $sub) return $t;
        return null;
    }
    return $tables[0] ?? null;
}

function resolve_options(array $field): array {
    $opts = $field['options'] ?? [];
    if (is_string($opts) && str_starts_with($opts, '@')) {
        $table = substr($opts, 1);
        try {
            $labelCol = in_array($table, ['songs', 'albums', 'videos', 'shorts']) ? 'title' : 'name';
            if ($table === 'songs') $labelCol = 'title';
            $rows = db()->query("SELECT id, $labelCol AS label FROM `$table` ORDER BY sort, id")->fetchAll();
            $out = []; foreach ($rows as $r) $out[$r['id']] = $r['label'];
            return $out;
        } catch (Throwable $e) { return []; }
    }
    return $opts;
}

function field_value(array $row, string $name) {
    return $row[$name] ?? '';
}

// ---------------- 列表 ----------------
function crud_list(string $module, ?string $sub): void {
    $t = admin_table($module, $sub);
    if (!$t) { flash('模块不存在', 'err'); header('Location: /admin'); exit; }
    $mods = admin_modules(); $mod = $mods[$module];
    $table = $t['table']; $pk = $t['pk'];
    // 单记录表可不配 list，回退用字段定义生成展示列
    $list = $t['list'] ?? array_map(fn($f) => [$f['name'], $f['label']], $t['fields'] ?? []);
    $q = trim((string)($_GET['q'] ?? ''));

    $page = max(1, (int)($_GET['page'] ?? 1));
    $per = 50;
    $where = ''; $args = [];
    if ($q !== '') {
        $cols = [];
        foreach ($list as $col) {
            $name = $col[0];
            foreach (($t['fields'] ?? []) as $f) {
                if ($f['name'] === $name && in_array($f['type'], ['image', 'json'], true)) continue 2;
            }
            $cols[] = $name;
        }
        if ($cols) {
            $conds = array_map(fn($c) => "`$c` LIKE ?", $cols);
            $where = 'WHERE (' . implode(' OR ', $conds) . ')';
            $args = array_fill(0, count($cols), '%' . $q . '%');
        }
    }

    if ($t['id_type'] === 'single') {
        $rows = db()->query("SELECT * FROM `$table` WHERE `$pk`=1")->fetchAll();
    } else {
        $st = db()->prepare("SELECT COUNT(*) FROM `$table` $where");
        $st->execute($args);
        $total = (int)$st->fetchColumn();
        $offset = ($page - 1) * $per;
        $order = in_array('sort', array_column($t['fields'] ?? [], 'name'), true) || in_array('sort', array_column($t['list'] ?? [], 'name'), true) ? "ORDER BY sort, `$pk`" : "ORDER BY `$pk` DESC";
        $st = db()->prepare("SELECT * FROM `$table` $where $order LIMIT $per OFFSET $offset");
        $st->execute($args);
        $rows = $st->fetchAll();
        $totalPages = max(1, (int)ceil($total / $per));
    }

    $qs = fn(array $extra = []) => '?' . http_build_query(array_merge(['sub' => $t['key']], $q !== '' ? ['q' => $q] : [], $extra));

    echo '<div class="card">';
    echo '<div class="toolbar"><h2 style="margin:0">' . htmlspecialchars($mod['title']) . ' · ' . htmlspecialchars($t['title']) . '</h2><div>';
    if ($t['id_type'] !== 'single') {
        echo '<a class="btn primary" href="/admin/' . $module . '/edit?sub=' . urlencode($t['key']) . '">+ 新增</a>';
    }
    echo ' <a class="btn" href="/admin/' . $module . '/edit?sub=' . urlencode($t['key']) . '&id=1">编辑</a>';
    echo '</div></div>';

    // 子表标签
    if (count($mod['tables']) > 1) {
        echo '<div class="tabs">';
        foreach ($mod['tables'] as $tb) {
            $cls = $tb['key'] === $t['key'] ? 'active' : '';
            echo '<a class="' . $cls . '" href="/admin/' . $module . '?sub=' . urlencode($tb['key']) . '">' . htmlspecialchars($tb['title']) . '</a>';
        }
        echo '</div>';
    }

    if ($t['id_type'] !== 'single') {
        echo '<form class="toolbar" method="get" action="/admin/' . $module . '" style="gap:8px">';
        echo '<input type="hidden" name="sub" value="' . htmlspecialchars($t['key']) . '">';
        echo '<input type="search" name="q" value="' . htmlspecialchars($q) . '" placeholder="搜索关键字…" style="max-width:260px;margin:0">';
        echo '<button class="btn" type="submit">搜索</button>';
        if ($q !== '') echo '<a class="btn" href="/admin/' . $module . '?sub=' . urlencode($t['key']) . '">清除</a>';
        echo '<span class="muted" style="margin-left:auto">共 ' . ($total ?? 0) . ' 条' . ($q !== '' ? '，匹配「' . htmlspecialchars($q) . '」' : '') . '</span>';
        echo '</form>';
        echo '<form id="batchForm" method="post" action="/admin/' . $module . '/batch">';
        echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
        echo '<input type="hidden" name="sub" value="' . htmlspecialchars($t['key']) . '">';
        echo '</form>';
    }

    echo '<div style="overflow-x:auto"><table><thead><tr>';
    if ($t['id_type'] !== 'single') echo '<th style="width:34px"><input type="checkbox" onclick="document.querySelectorAll(\'.batch-id\').forEach(c=>c.checked=this.checked)"></th>';
    foreach ($list as $col) echo '<th>' . htmlspecialchars($col[1]) . '</th>';
    echo '<th>操作</th></tr></thead><tbody>';
    foreach ($rows as $row) {
        echo '<tr>';
        if ($t['id_type'] !== 'single') echo '<td><input type="checkbox" class="batch-id" form="batchForm" name="ids[]" value="' . htmlspecialchars((string)$row[$pk]) . '"></td>';
        foreach ($list as $col) {
            $name = $col[0]; $v = field_value($row, $name);
            echo '<td>' . htmlspecialchars(list_display($t, $name, $v)) . '</td>';
        }
        echo '<td>';
        echo '<a class="btn sm" href="/admin/' . $module . '/edit?sub=' . urlencode($t['key']) . '&id=' . urlencode((string)$row[$pk]) . '">编辑</a> ';
        if ($t['id_type'] !== 'single') {
            echo '<form method="post" action="/admin/' . $module . '/delete" style="display:inline" onsubmit="return confirm(\'确认删除？\')">';
            echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
            echo '<input type="hidden" name="sub" value="' . htmlspecialchars($t['key']) . '">';
            echo '<input type="hidden" name="id" value="' . htmlspecialchars((string)$row[$pk]) . '">';
            echo '<button class="btn sm danger" type="submit">删除</button></form>';
        }
        echo '</td></tr>';
    }
    if (!$rows) echo '<tr><td colspan="99" class="muted" style="text-align:center;padding:30px">' . ($q !== '' ? '没有匹配的记录' : '暂无数据') . '</td></tr>';
    echo '</tbody></table></div>';

    if ($t['id_type'] !== 'single' && $rows) {
        echo '<div class="toolbar" style="margin-top:12px"><div><button form="batchForm" class="btn danger" type="submit" onclick="return confirm(\'确认删除选中的记录？\')">批量删除选中</button></div>';
        if (!empty($totalPages) && $totalPages > 1) {
            echo '<div class="muted">第 ' . $page . '/' . $totalPages . ' 页 ';
            if ($page > 1) echo ' <a class="btn sm" href="/admin/' . $module . $qs(['page' => $page - 1]) . '">上一页</a>';
            if ($page < $totalPages) echo ' <a class="btn sm" href="/admin/' . $module . $qs(['page' => $page + 1]) . '">下一页</a>';
            echo '</div>';
        }
        echo '</div>';
    }
    echo '</div>';
}

/** 批量删除（勾选 ids[]）。 */
function crud_batch_delete(string $module, ?string $sub): void {
    $t = admin_table($module, $sub);
    if (!$t) { flash('模块不存在', 'err'); header('Location: /admin'); exit; }
    csrf_check();
    if ($t['id_type'] === 'single') { flash('该表不支持批量删除', 'err'); header('Location: /admin/' . $module); exit; }
    $ids = $_POST['ids'] ?? [];
    if (!is_array($ids)) $ids = [$ids];
    $ids = array_values(array_filter(array_map('strval', $ids), fn($v) => $v !== ''));
    if (!$ids) { flash('未选择记录', 'err'); header('Location: /admin/' . $module . '?sub=' . urlencode($t['key'])); exit; }
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("DELETE FROM `{$t['table']}` WHERE `{$t['pk']}` IN ($ph)");
    $st->execute($ids);
    log_admin('batch_delete', $module . '/' . $t['key'] . ' x' . $st->rowCount());
    cache_clear();
    flash('已删除 ' . $st->rowCount() . ' 条记录', 'ok');
    header('Location: /admin/' . $module . '?sub=' . urlencode($t['key']));
    exit;
}

function list_display(array $t, string $name, $v): string {
    $field = null;
    foreach (($t['fields'] ?? []) as $f) if ($f['name'] === $name) { $field = $f; break; }
    if ($field) {
        if ($field['type'] === 'bool') return $v ? '是' : '否';
        if ($field['type'] === 'image' && $v) return '[图] ' . $v;
        if ($field['type'] === 'json' && $v) {
            $d = from_json($v);
            return is_array($d) ? ('[' . count($d) . '项]') : mb_substr((string)$v, 0, 40);
        }
        if ($field['type'] === 'tags' && $v) {
            $d = from_json($v, []);
            return is_array($d) ? implode(', ', $d) : (string)$v;
        }
    }
    if (strlen((string)$v) > 60) return mb_substr((string)$v, 0, 58) . '…';
    return (string)$v;
}

// ---------------- 表单 ----------------
function crud_form(string $module, ?string $sub, ?string $id): void {
    $t = admin_table($module, $sub);
    if (!$t) { flash('模块不存在', 'err'); header('Location: /admin'); exit; }
    $mods = admin_modules(); $mod = $mods[$module];
    $table = $t['table']; $pk = $t['pk'];

    $row = [];
    if ($id !== null && $id !== '') {
        $st = db()->prepare("SELECT * FROM `$table` WHERE `$pk`=?");
        $st->execute([$id]);
        $row = $st->fetch() ?: [];
    }
    if (!$row) {
        foreach ($t['fields'] as $f) $row[$f['name']] = $f['default'] ?? '';
    }

    echo '<div class="card">';
    echo '<div class="toolbar"><h2 style="margin:0">' . htmlspecialchars($mod['title']) . ' · ' . htmlspecialchars($t['title']) . ' · ' . ($id ? '编辑' : '新增') . '</h2><a class="btn" href="/admin/' . $module . '?sub=' . urlencode($t['key']) . '">← 返回列表</a></div>';
    echo '<form method="post" action="/admin/' . $module . '/save">';
    echo '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
    echo '<input type="hidden" name="sub" value="' . htmlspecialchars($t['key']) . '">';
    echo '<input type="hidden" name="id" value="' . htmlspecialchars((string)($row[$pk] ?? '')) . '">';
    foreach ($t['fields'] as $f) {
        render_form_field($f, $row[$f['name']] ?? '');
    }
    echo '<div class="form-row"><button class="btn primary" type="submit">💾 保存</button> <a class="btn" href="/admin/' . $module . '?sub=' . urlencode($t['key']) . '">取消</a></div>';
    echo '</form></div>';
}

function render_form_field(array $f, $val): void {
    $name = $f['name']; $label = $f['label']; $type = $f['type'];
    $req = !empty($f['required']) ? '<span class="req">*</span>' : '';
    echo '<div class="form-row"><label>' . htmlspecialchars($label) . $req . '</label>';
    $id = 'f_' . $name;
    switch ($type) {
        case 'textarea':
            echo '<textarea id="' . $id . '" name="' . $name . '">' . htmlspecialchars((string)$val) . '</textarea>';
            break;
        case 'select':
            echo '<select id="' . $id . '" name="' . $name . '"><option value="">—</option>';
            foreach (resolve_options($f) as $k => $v2) {
                $sel = ((string)$val === (string)$k) ? 'selected' : '';
                echo '<option value="' . htmlspecialchars((string)$k) . '" ' . $sel . '>' . htmlspecialchars((string)$v2) . '</option>';
            }
            echo '</select>';
            break;
        case 'bool':
            $chk = $val ? 'checked' : '';
            echo '<label style="display:flex;align-items:center;gap:8px;font-weight:400;color:var(--ink)"><input type="checkbox" name="' . $name . '" value="1" ' . $chk . '> 启用</label>';
            break;
        case 'json':
            $pretty = $val ? json_encode(from_json($val, null), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
            echo '<textarea id="' . $id . '" name="' . $name . '" style="min-height:160px;font-family:Consolas,monospace;font-size:12px">' . htmlspecialchars((string)$pretty) . '</textarea>';
            echo '<div class="hint">原始 JSON，保存时会校验格式</div>';
            break;
        case 'tags':
            $arr = from_json($val, []);
            $str = is_array($arr) ? implode(', ', $arr) : '';
            echo '<input type="text" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars($str) . '" placeholder="用英文逗号分隔，如：民谣, 现场">';
            break;
        case 'image':
            echo '<div class="row" style="align-items:center">';
            echo '<input type="text" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars((string)$val) . '" placeholder="可填外链 URL，或点右侧上传">';
            echo '<button type="button" class="btn" data-upload data-target="' . $id . '">上传</button>';
            echo '</div>';
            if ($val) echo '<div class="hint">预览：<img class="img-thumb" src="' . htmlspecialchars((string)$val) . '" onerror="this.style.display=\'none\'"></div>';
            break;
        case 'number':
            echo '<input type="number" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars((string)$val) . '">';
            break;
        default:
            echo '<input type="text" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars((string)$val) . '">';
    }
    echo '</div>';
}

// ---------------- 保存 ----------------
function crud_save(string $module, ?string $sub): void {
    $t = admin_table($module, $sub);
    if (!$t) { flash('模块不存在', 'err'); header('Location: /admin'); exit; }
    csrf_check();
    $table = $t['table']; $pk = $t['pk'];
    $sets = []; $args = []; $jsonErr = null;
    foreach ($t['fields'] as $f) {
        $name = $f['name']; $type = $f['type'];
        $raw = $_POST[$name] ?? '';
        $val = null;
        switch ($type) {
            case 'bool': $val = isset($_POST[$name]) ? 1 : 0; break;
            case 'number': $val = $raw === '' ? (str_ends_with($name, '_id') || in_array($name, ['city']) ? null : 0) : (int)$raw; break;
            case 'json':
                if (trim((string)$raw) === '') { $val = null; break; }
                $dec = json_decode((string)$raw, true);
                if ($dec === null && json_last_error() !== JSON_ERROR_NONE) { $jsonErr = $f['label'] . ' 的 JSON 格式错误：' . json_last_error_msg(); $val = $raw; }
                else $val = to_json($dec);
                break;
            case 'tags':
                $arr = array_values(array_filter(array_map('trim', explode(',', (string)$raw))));
                $val = to_json($arr);
                break;
            case 'select':
            case 'image':
                $val = $raw === '' ? null : (string)$raw;
                break;
            default: $val = trim((string)$raw);
        }
        if (!empty($f['required']) && ($val === '' || $val === null)) {
            flash($f['label'] . ' 不能为空', 'err');
            header('Location: /admin/' . $module . '/edit?sub=' . urlencode($t['key']) . '&id=' . urlencode((string)($_POST['id'] ?? '')));
            exit;
        }
        $sets[] = "`$name`=?"; $args[] = $val;
    }
    if ($jsonErr) { flash($jsonErr, 'err'); header('Location: /admin/' . $module . '/edit?sub=' . urlencode($t['key']) . '&id=' . urlencode((string)($_POST['id'] ?? ''))); exit; }

    $id = $_POST['id'] ?? '';
    if ($t['id_type'] === 'single') {
        $exists = db()->query("SELECT 1 FROM `$table` WHERE `$pk`=1")->fetch();
        if ($exists) {
            $st = db()->prepare("UPDATE `$table` SET " . implode(',', $sets) . " WHERE `$pk`=1");
            $st->execute($args);
        } else {
            $cols = array_map(fn($f) => "`" . $f['name'] . "`", $t['fields']);
            $ph = implode(',', array_fill(0, count($t['fields']), '?'));
            $st = db()->prepare("INSERT INTO `$table` (`$pk`," . implode(',', $cols) . ") VALUES (1,$ph)");
            $st->execute($args);
        }
    } elseif ($id !== '') {
        $st = db()->prepare("UPDATE `$table` SET " . implode(',', $sets) . " WHERE `$pk`=?");
        $st->execute(array_merge($args, [$id]));
    } else {
        $cols = array_map(fn($f) => "`" . $f['name'] . "`", $t['fields']);
        if ($t['id_type'] === 'text') {
            // pk 是其中一个字段，已在 sets 里；需单独取 pk 值
            $pkVal = $_POST[$pk] ?? '';
            if ($pkVal === '') { flash('ID 不能为空', 'err'); header('Location: /admin/' . $module . '/edit?sub=' . urlencode($t['key'])); exit; }
        }
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $st = db()->prepare("INSERT INTO `$table` (" . implode(',', $cols) . ") VALUES ($ph)");
        $st->execute($args);
    }
    log_admin('edit', $module . '/' . $t['key'] . ($id !== '' ? '#' . $id : '#new'));
    cache_clear();
    flash('保存成功', 'ok');
    header('Location: /admin/' . $module . '?sub=' . urlencode($t['key']));
    exit;
}

function crud_delete(string $module, ?string $sub): void {
    $t = admin_table($module, $sub);
    if (!$t) { flash('模块不存在', 'err'); header('Location: /admin'); exit; }
    csrf_check();
    $id = $_POST['id'] ?? '';
    if ($id === '' || $t['id_type'] === 'single') { flash('无法删除', 'err'); header('Location: /admin/' . $module); exit; }
    db()->prepare("DELETE FROM `{$t['table']}` WHERE `{$t['pk']}`=?")->execute([$id]);
    log_admin('delete', $module . '/' . $t['key'] . '#' . $id);
    cache_clear();
    flash('已删除', 'ok');
    header('Location: /admin/' . $module . '?sub=' . urlencode($t['key']));
    exit;
}
