import { create } from 'zustand'
import { load, save } from '../lib/storage'

/**
 * 短视频的互动状态：点赞、收藏、下载记录。
 * 只存 id 列表，counts 由数据里的基数 + 用户操作推导。
 */
interface ShortsState {
  liked: string[]
  saved: string[]
  downloads: string[]
  toggleLike: (id: string) => void
  toggleSave: (id: string) => void
  markDownloaded: (id: string) => void
}

const KEY = {
  liked: 'shorts.liked',
  saved: 'shorts.saved',
  downloads: 'shorts.downloads',
}

export const useShorts = create<ShortsState>()((set, get) => ({
  liked: load<string[]>(KEY.liked, []),
  saved: load<string[]>(KEY.saved, []),
  downloads: load<string[]>(KEY.downloads, []),

  toggleLike: (id) => {
    const liked = get().liked.includes(id) ? get().liked.filter((x) => x !== id) : [id, ...get().liked]
    save(KEY.liked, liked)
    set({ liked })
  },

  toggleSave: (id) => {
    const saved = get().saved.includes(id) ? get().saved.filter((x) => x !== id) : [id, ...get().saved]
    save(KEY.saved, saved)
    set({ saved })
  },

  markDownloaded: (id) => {
    if (get().downloads.includes(id)) return
    const downloads = [id, ...get().downloads]
    save(KEY.downloads, downloads)
    set({ downloads })
  },
}))
