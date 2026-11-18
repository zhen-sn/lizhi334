const NS = 'lz334:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value))
  } catch {
    /* 隐私模式或超额时静默失败 */
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(NS + key)
  } catch {
    /* ignore */
  }
}

export function exportAll(): string {
  const out: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(NS)) out[k.slice(NS.length)] = JSON.parse(localStorage.getItem(k) || 'null')
  }
  return JSON.stringify(out, null, 2)
}

export function importAll(json: string): number {
  const obj = JSON.parse(json) as Record<string, unknown>
  let n = 0
  for (const [k, v] of Object.entries(obj)) {
    save(k, v)
    n++
  }
  return n
}

export function clearAll() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(NS)) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}
