<?php
/**
 * 文件存储：本地目录 / Cloudflare R2（S3 兼容 API，AWS SigV4）。
 * 读取「站点设置 → 存储设置」，保存后即时生效。
 */
require_once __DIR__ . '/settings.php';

function storage_driver(): string {
    return setting('storage_driver', 'local') === 'r2' ? 'r2' : 'local';
}

/**
 * 保存上传文件，返回 ['url'=>访问地址, 'driver'=>'local|r2']。
 * 失败抛 RuntimeException（调用方负责转成错误响应，不做静默降级）。
 */
function storage_put(string $tmpPath, string $ext): array {
    $name = bin2hex(random_bytes(8)) . '.' . preg_replace('/[^a-z0-9]/i', '', $ext);
    $prefix = trim((string)setting('r2_prefix', 'uploads'), '/');
    $sub = date('Ym');
    if (storage_driver() === 'r2') {
        $key = ($prefix !== '' ? $prefix . '/' : '') . $sub . '/' . $name;
        $url = r2_put_file($key, $tmpPath);
        return ['url' => $url, 'driver' => 'r2'];
    }
    $dir = UPLOAD_DIR . '/' . $sub;
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('无法创建上传目录：' . $dir);
    }
    if (!move_uploaded_file($tmpPath, $dir . '/' . $name)) {
        throw new RuntimeException('保存文件失败，请检查上传目录权限');
    }
    return ['url' => UPLOAD_URL . '/' . $sub . '/' . $name, 'driver' => 'local'];
}

/** R2 配置检查，返回缺失项说明；空数组表示完整。 */
function r2_config_errors(): array {
    $miss = [];
    foreach (['r2_endpoint' => 'S3 接口地址', 'r2_bucket' => 'Bucket 名称', 'r2_access_key' => 'Access Key ID', 'r2_secret_key' => 'Secret Access Key'] as $k => $label) {
        if (trim((string)setting($k, '')) === '') $miss[] = $label;
    }
    if (trim((string)setting('r2_public_url', '')) === '') $miss[] = '公开访问域名';
    return $miss;
}

/**
 * SigV4 签名并 PUT 到 R2，返回公开访问 URL。
 */
function r2_put_file(string $key, string $path, ?string $contentType = null): string {
    $miss = r2_config_errors();
    if ($miss) throw new RuntimeException('R2 配置不完整，缺少：' . implode('、', $miss));
    if (!is_file($path)) throw new RuntimeException('待上传文件不存在');

    $endpoint = rtrim((string)setting('r2_endpoint'), '/');
    $bucket = trim((string)setting('r2_bucket'));
    $ak = trim((string)setting('r2_access_key'));
    $sk = trim((string)setting('r2_secret_key'));
    $public = rtrim((string)setting('r2_public_url'), '/');

    $u = parse_url($endpoint);
    if (!$u || empty($u['host'])) throw new RuntimeException('S3 接口地址格式不正确');
    $scheme = $u['scheme'] ?? 'https';
    $host = $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
    $basePath = rtrim($u['path'] ?? '', '/');

    $key = ltrim($key, '/');
    $encodedKey = implode('/', array_map('rawurlencode', explode('/', $key)));
    $uriPath = $basePath . '/' . rawurlencode($bucket) . '/' . $encodedKey;

    if ($contentType === null) {
        $ext = strtolower(pathinfo($key, PATHINFO_EXTENSION));
        $map = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml', 'mp3' => 'audio/mpeg', 'mp4' => 'video/mp4', 'pdf' => 'application/pdf'];
        $contentType = $map[$ext] ?? 'application/octet-stream';
    }

    $amzDate = gmdate('Ymd\THis\Z');
    $date = substr($amzDate, 0, 8);
    $payloadHash = hash_file('sha256', $path);
    $region = 'auto';
    $service = 's3';
    $scope = "$date/$region/$service/aws4_request";

    $canonicalHeaders = "content-type:$contentType\nhost:$host\nx-amz-content-sha256:$payloadHash\nx-amz-date:$amzDate\n";
    $signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    $canonicalRequest = "PUT\n$uriPath\n\n$canonicalHeaders\n$signedHeaders\n$payloadHash";
    $stringToSign = "AWS4-HMAC-SHA256\n$amzDate\n$scope\n" . hash('sha256', $canonicalRequest);

    $kDate = hash_hmac('sha256', $date, 'AWS4' . $sk, true);
    $kRegion = hash_hmac('sha256', $region, $kDate, true);
    $kService = hash_hmac('sha256', $service, $kRegion, true);
    $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
    $signature = hash_hmac('sha256', $stringToSign, $kSigning);

    $auth = "AWS4-HMAC-SHA256 Credential=$ak/$scope, SignedHeaders=$signedHeaders, Signature=$signature";

    $fp = fopen($path, 'rb');
    $ch = curl_init($scheme . '://' . $host . $uriPath);
    curl_setopt_array($ch, [
        CURLOPT_UPLOAD => true,
        CURLOPT_INFILE => $fp,
        CURLOPT_INFILESIZE => filesize($path),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_HTTPHEADER => [
            'Content-Type: ' . $contentType,
            'x-amz-content-sha256: ' . $payloadHash,
            'x-amz-date: ' . $amzDate,
            'Authorization: ' . $auth,
            'Expect:',
        ],
    ]);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($fp) fclose($fp);
    if ($body === false || $err !== '') throw new RuntimeException('R2 请求失败：' . $err);
    if ($code < 200 || $code >= 300) {
        $msg = trim(strip_tags((string)$body));
        if (strlen($msg) > 300) $msg = substr($msg, 0, 300) . '…';
        throw new RuntimeException('R2 返回 HTTP ' . $code . ($msg !== '' ? '：' . $msg : ''));
    }
    return $public . '/' . $encodedKey;
}

/** 上传一张测试图到 R2，用于后台「测试连接」。 */
function r2_test(): string {
    $tmp = tempnam(sys_get_temp_dir(), 'r2test');
    file_put_contents($tmp, 'r2-ok-' . date('c'));
    try {
        $url = r2_put_file('_healthcheck.txt', $tmp, 'text/plain');
    } finally {
        @unlink($tmp);
    }
    return $url;
}