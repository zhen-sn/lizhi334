import { useCallback, useEffect, useState } from 'react'
import { clearOfflineLibrary, setOfflineLibrarySongs } from '../lib/media'
import { useSettings } from '../store/settings'
import type { LibraryPayload } from '../types/desktop'

/**
 * 离线曲库管理 hook。只在 Electron 客户端里工作（window.desktop 存在）。
 * 浏览器环境下所有方法都是空操作。
 */
export function useOfflineLibrary() {
  const desktop = typeof window !== 'undefined' ? window.desktop : undefined
  const offlineLibrary = useSettings((s) => s.offlineLibrary)
  const [payload, setPayload] = useState<LibraryPayload | null>(null)
  const [status, setStatus] = useState<string>('')

  // 启动时加载 library.json
  const load = useCallback(async () => {
    if (!desktop) return
    const r = await desktop.loadLibrary()
    if (r.ok && r.data) {
      setPayload(r.data)
      setOfflineLibrarySongs(r.data.songs ?? {}, r.data.folder)
      useSettings.getState().set({ libraryName: r.data.folder })
    } else {
      setPayload(null)
      clearOfflineLibrary()
    }
  }, [desktop])

  useEffect(() => {
    load()
  }, [load])

  // offlineLibrary 开关变化时，重新应用内存映射
  useEffect(() => {
    if (!payload) return
    if (offlineLibrary) setOfflineLibrarySongs(payload.songs ?? {}, payload.folder)
    else clearOfflineLibrary()
  }, [offlineLibrary, payload])

  const pickFolder = useCallback(async () => {
    if (!desktop) return null
    return desktop.pickLibraryFolder()
  }, [desktop])

  const saveFromFolder = useCallback(
    async (folder: string, songsJson: string) => {
      if (!desktop) return { ok: false, error: '非桌面客户端' }
      let parsed: Record<string, { id?: string; audioFileName?: string; videoFileName?: string }> = {}
      try {
        const raw = JSON.parse(songsJson)
        // 支持两种格式：{ 'v01': {...} } 数组形式或 [{id:'v01',...}] 数组
        if (Array.isArray(raw)) {
          for (const item of raw) if (item && item.id) parsed[item.id] = item
        } else if (typeof raw === 'object') {
          parsed = raw
        }
      } catch (err) {
        return { ok: false, error: 'songs.json 格式错误：' + String(err) }
      }
      const r = await desktop.saveLibrary({ folder, songs: parsed, createdAt: Date.now() })
      if (r.ok) {
        setPayload({ folder, songs: parsed, createdAt: Date.now() })
        setOfflineLibrarySongs(parsed, folder)
        useSettings.getState().set({ offlineLibrary: true, libraryName: folder })
        setStatus(`已导入 ${Object.keys(parsed).length} 首本地曲目`)
      } else {
        setStatus('导入失败：' + (r.error ?? '未知错误'))
      }
      return r
    },
    [desktop],
  )

  const clear = useCallback(async () => {
    if (!desktop) return
    await desktop.clearLibrary()
    setPayload(null)
    clearOfflineLibrary()
    useSettings.getState().set({ offlineLibrary: false, libraryName: '' })
    setStatus('已清空离线曲库')
  }, [desktop])

  return { desktop, payload, offlineLibrary, status, pickFolder, saveFromFolder, clear, load }
}
