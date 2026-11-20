import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { api } from '../api/client'
import { useAuth } from './auth'

/**
 * 短视频的互动状态：点赞、收藏、下载记录。
 * 只存 id 列表，counts 由数据里的基数 + 用户操作推导。
 * 登录后与服务端同步（离线时仅本地生效）。
 */
interface ShortsState {
  liked: string[]
  saved: string[]
  downloads: string[]
  toggleLike: (id: string) => void
  toggleSave: (id: string) => void
  markDownloaded: (id: string) => void
  /** 登录后从服务器拉取点赞/收藏/下载记录 */
  syncFromServer: () => Promise<void>
}

const KEY = {
  liked: 'shorts.liked',
  saved: 'shorts.saved',
  downloads: 'shorts.downloads',
}

const loggedIn = () => Boolean(useAuth.getState().user)
const fire = (p: Promise<unknown>) => {
  p.catch(() => undefined)
}

export const useShorts = create<ShortsState>()((set, get) => ({
  liked: load<string[]>(KEY.liked, []),
  saved: load<string[]>(KEY.saved, []),
  downloads: load<string[]>(KEY.downloads, []),

  toggleLike: (id) => {
    const liked = get().liked.includes(id) ? get().liked.filter((x) => x !== id) : [id, ...get().liked]
    save(KEY.liked, liked)
    set({ liked })
    if (loggedIn()) fire(api(`/shorts/${encodeURIComponent(id)}/like`, { method: 'POST' }))
  },

  toggleSave: (id) => {
    const saved = get().saved.includes(id) ? get().saved.filter((x) => x !== id) : [id, ...get().saved]
    save(KEY.saved, saved)
    set({ saved })
    if (loggedIn()) fire(api(`/shorts/${encodeURIComponent(id)}/save`, { method: 'POST' }))
  },

  markDownloaded: (id) => {
    if (get().downloads.includes(id)) return
    const downloads = [id, ...get().downloads]
    save(KEY.downloads, downloads)
    set({ downloads })
    fire(api(`/shorts/${encodeURIComponent(id)}/download`, { method: 'POST' }))
  },

  async syncFromServer() {
    if (!loggedIn()) return
    try {
      const d = await api<{ liked?: string[]; saved?: string[]; downloaded?: string[] }>(
        '/shorts/interactions',
      )
      const liked = Array.isArray(d?.liked) ? d.liked : get().liked
      const saved = Array.isArray(d?.saved) ? d.saved : get().saved
      const downloads = Array.isArray(d?.downloaded) ? d.downloaded : get().downloads
      save(KEY.liked, liked)
      save(KEY.saved, saved)
      save(KEY.downloads, downloads)
      set({ liked, saved, downloads })
    } catch {
      // 离线：保留本地记录
    }
  },
}))