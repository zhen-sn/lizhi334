<?php
/**
 * 极简路由：支持 {param} 占位。
 */
class Router {
    private array $routes = [];

    public function get(string $p, callable $h): void    { $this->routes[] = ['GET', $p, $h]; }
    public function post(string $p, callable $h): void   { $this->routes[] = ['POST', $p, $h]; }
    public function put(string $p, callable $h): void    { $this->routes[] = ['PUT', $p, $h]; }
    public function patch(string $p, callable $h): void  { $this->routes[] = ['PATCH', $p, $h]; }
    public function delete(string $p, callable $h): void { $this->routes[] = ['DELETE', $p, $h]; }

    public function dispatch(string $method, string $path): void {
        $path = rtrim($path, '/') ?: '/';
        foreach ($this->routes as $r) {
            if ($r[0] !== $method) continue;
            $pattern = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $r[1]) . '$#u';
            if (preg_match($pattern, $path, $m)) {
                $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
                $r[2]($params);
                return;
            }
        }
        json_err('接口不存在: ' . $method . ' ' . $path, 404);
    }
}

function method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function route_path(): string {
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH);
    return $path ?: '/';
}
