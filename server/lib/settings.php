<?php
/**
 * 站点设置读写（settings 表，k/v 结构）。
 */
require_once __DIR__ . '/db.php';

function settings_all(bool $reload = false): array {
    static $s = null;
    if ($s === null || $reload) {
        $s = [];
        try {
            foreach (db()->query('SELECT k,v FROM settings')->fetchAll() as $r) {
                $s[$r['k']] = $r['v'];
            }
        } catch (Throwable $e) {
            $s = [];
        }
    }
    return $s;
}

function setting(string $k, $d = '') {
    $s = settings_all();
    return array_key_exists($k, $s) && $s[$k] !== null ? $s[$k] : $d;
}

function setting_bool(string $k, bool $d = false): bool {
    $v = setting($k, $d ? '1' : '0');
    return in_array((string)$v, ['1', 'true', 'on', 'yes'], true);
}

function settings_put(array $kv): void {
    $st = db()->prepare('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)');
    foreach ($kv as $k => $v) {
        $st->execute([(string)$k, (string)$v]);
    }
    settings_all(true);
}