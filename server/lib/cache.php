<?php
/**
 * 极简文件缓存。TTL 由站点设置 cache_ttl（秒）控制，0 表示关闭。
 * 后台保存内容 / 修改设置 / 手动清理时调用 cache_clear()。
 */
require_once __DIR__ . '/settings.php';

function cache_dir(): string {
    $d = dirname(__DIR__) . '/storage/cache';
    if (!is_dir($d)) @mkdir($d, 0775, true);
    return $d;
}

function cache_get(string $key) {
    if ((int)setting('cache_ttl', '0') <= 0) return null;
    $f = cache_dir() . '/' . md5($key) . '.cache';
    if (!is_file($f)) return null;
    $ttl = (int)setting('cache_ttl', '0');
    if (time() - (int)filemtime($f) > $ttl) return null;
    $raw = @file_get_contents($f);
    if ($raw === false) return null;
    $data = @unserialize($raw, ['allowed_classes' => false]);
    return $data === false ? null : $data;
}

function cache_set(string $key, $data): void {
    if ((int)setting('cache_ttl', '0') <= 0) return;
    @file_put_contents(cache_dir() . '/' . md5($key) . '.cache', serialize($data), LOCK_EX);
}

function cache_clear(): int {
    $n = 0;
    foreach (glob(cache_dir() . '/*.cache') ?: [] as $f) {
        if (@unlink($f)) $n++;
    }
    return $n;
}