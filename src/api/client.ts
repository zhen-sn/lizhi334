/**
 * 后端 API 客户端。
 * - 同域部署：默认请求 /api/*
 * - 开发期可通过 VITE_API_BASE 指向 PHP 内置服务器（如 http://127.0.0.1:8080）
 * - 写操作自动附带 CSRF 令牌（X-CSRF-Token）
 */

const RAW_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE
export const API_BASE = (RAW_BASE || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let csrfToken = ''

/** 获取并缓存 CSRF 令牌；会话切换后需重新获取 */
export async function ensureCsrf(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken
  const res = await fetch(`${API_BASE}/api/csrf`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  const json = await res.json().catch(() => null)
  if (!json || !json.ok) throw new ApiError(json?.error || '获取 CSRF 令牌失败', res.status)
  csrfToken = json.data?.token || ''
  return csrfToken
}

export function clearCsrf() {
  csrfToken = ''
}

type Query = Record<string, string | number | boolean | undefined | null>

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
  timeout?: number
  /** 不抛错，失败时返回 null */
  silent?: boolean
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return qs ? `${url}?${qs}` : url
}

async function once<T>(path: string, opts: Options, retried: boolean): Promise<T> {
  const { method = 'GET', body, query, timeout = 15000 } = opts
  const isWrite = method !== 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (isWrite) headers['X-CSRF-Token'] = await ensureCsrf()

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeout)
  try {
    const res = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ac.signal,
    })

    const json = await res.json().catch(() => null)
    if (res.status === 419 && isWrite && !retried) {
      // 令牌过期：刷新后重试一次
      await ensureCsrf(true)
      return once<T>(path, opts, true)
    }
    if (!json) throw new ApiError(`请求失败（HTTP ${res.status}）`, res.status)
    if (!json.ok) throw new ApiError(json.error || '请求失败', res.status)
    return json.data as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if ((e as Error)?.name === 'AbortError') throw new ApiError('请求超时，请稍后重试', 0)
    throw new ApiError('网络异常，请检查服务是否可用', 0)
  } finally {
    clearTimeout(timer)
  }
}

/** 调用 API，成功返回 data，失败抛 ApiError */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  return once<T>(path, opts, false)
}

/** 调用 API，失败返回 null（用于内容加载的静态回退） */
export async function tryApi<T = unknown>(path: string, opts: Options = {}): Promise<T | null> {
  try {
    return await api<T>(path, opts)
  } catch {
    return null
  }
}

/** 上传文件（multipart/form-data），返回服务器保存后的访问地址 */
export async function uploadFile(file: File): Promise<{ url: string; fileName: string; size: number }> {
  const send = async (retried: boolean): Promise<{ url: string; fileName: string; size: number }> => {
    const fd = new FormData()
    fd.append('file', file)
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 180000)
    try {
      const res = await fetch(buildUrl('/uploads/file'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-CSRF-Token': await ensureCsrf() },
        credentials: 'same-origin',
        body: fd,
        signal: ac.signal,
      })
      const json = await res.json().catch(() => null)
      if (res.status === 419 && !retried) {
        await ensureCsrf(true)
        return send(true)
      }
      if (!json) throw new ApiError(`上传失败（HTTP ${res.status}）`, res.status)
      if (!json.ok) throw new ApiError(json.error || '上传失败', res.status)
      return json.data as { url: string; fileName: string; size: number }
    } catch (e) {
      if (e instanceof ApiError) throw e
      if ((e as Error)?.name === 'AbortError') throw new ApiError('上传超时，请检查网络后重试', 0)
      throw new ApiError('网络异常，上传失败', 0)
    } finally {
      clearTimeout(timer)
    }
  }
  return send(false)
}