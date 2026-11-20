import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { songs, songMap } from '../data/songs'
import type { StatSnapshot } from '../data/achievements'
import { achievements } from '../data/achievements'
import { api } from '../api/client'
import { useAuth } from './auth'

/** 已登录时把本地操作同步到服务器；失败静默（离线可用） */
const fire = (p: Promise<unknown>) => {
  p.catch(() => undefined)
}
const loggedIn = () => Boolean(useAuth.getState().user)
const serverId = (id: string) => /^p\d+$/.test(id)
/** 本地新建歌单的临时 id（p + base36 时间戳） */
const tempPlaylist = (id: string) => !serverId(id)

export interface Playlist {
  id: string
  name: string
  desc: string
  songIds: string[]
  createdAt: number
}

export interface HistoryItem {
  songId: string
  at: number
}

interface PersistShape {
  favorites: string[]
  playlists: Playlist[]
  history: HistoryItem[]
  /** 每首歌上次听到的位置（秒） */
  lastPos: Record<string, number>
  /** 播放次数明细：songId -> 次数 */
  counts: Record<string, number>
  /** 每日收听秒数：yyyy-mm-dd -> 秒 */
  daily: Record<string, number>
  totalSeconds: number
  completedSongs: number
  /** 成就里需要的累计行为计数 */
  capoCalcs: number
  unlocked: string[]
  /** 最近打开日期，用于连续天数 */
  activeDays: string[]
}

const DEFAULTS: PersistShape = {
  favorites: [],
  playlists: [
    {
      id: 'p-default',
      name: '通勤',
      desc: '自动创建示例歌单',
      songIds: ['s09', 's33', 's28'],
      createdAt: new Date('2024-01-01T00:00:00').getTime(),
    },
  ],
  history: [],
  lastPos: {},
  counts: {},
  daily: {},
  totalSeconds: 0,
  completedSongs: 0,
  capoCalcs: 0,
  unlocked: [],
  activeDays: [],
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
function persist(get: () => LibraryState) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    const s = get()
    const data: PersistShape = {
      favorites: s.favorites,
      playlists: s.playlists,
      history: s.history,
      lastPos: s.lastPos,
      counts: s.counts,
      daily: s.daily,
      totalSeconds: s.totalSeconds,
      completedSongs: s.completedSongs,
      capoCalcs: s.capoCalcs,
      unlocked: s.unlocked,
      activeDays: s.activeDays,
    }
    save('library', data)
  }, 260)
}

export interface LibraryState extends PersistShape {
  toggleFav: (id: string) => boolean
  isFav: (id: string) => boolean
  createPlaylist: (name: string, desc?: string) => string
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addToPlaylist: (pid: string, songId: string) => void
  removeFromPlaylist: (pid: string, songId: string) => void
  recordPlay: (songId: string) => void
  recordFinish: (songId: string, seconds: number) => void
  setPos: (songId: string, sec: number) => void
  bumpCapoCalc: () => void
  clearHistory: () => void
  stats: () => StatSnapshot
  /** 返回本次新解锁的成就 id */
  checkAchievements: () => string[]
  /** 登录后从服务器拉取收藏/歌单/历史/播放位置 */
  syncFromServer: () => Promise<void>
}

export const useLibrary = create<LibraryState>((set, get) => {
  const initial = { ...DEFAULTS, ...load('library', {} as Partial<PersistShape>) }

  // 记录今天活跃，用于连续天数
  const today = new Date().toISOString().slice(0, 10)
  if (!initial.activeDays.includes(today)) {
    initial.activeDays = [...initial.activeDays, today].slice(-400)
  }

  const touch = () => persist(get)

  return {
    ...initial,

    toggleFav(id) {
      const has = get().favorites.includes(id)
      set((s) => ({
        favorites: has ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites],
      }))
      touch()
      if (loggedIn()) fire(api(`/library/favorites/${encodeURIComponent(id)}`, { method: 'POST' }))
      return !has
    },

    isFav(id) {
      return get().favorites.includes(id)
    },

    createPlaylist(name, desc = '') {
      const id = 'p' + Date.now().toString(36)
      set((s) => ({
        playlists: [
          ...s.playlists,
          { id, name, desc, songIds: [], createdAt: Date.now() },
        ],
      }))
      touch()
      if (loggedIn()) {
        fire(
          api<{ id: string }>('/library/playlists', { method: 'POST', body: { name, desc } }).then(
            (res) => {
              const cur = get()
              const pl = cur.playlists.find((p) => p.id === id)
              if (!pl || !res?.id) return
              set({ playlists: cur.playlists.map((p) => (p.id === id ? { ...p, id: res.id } : p)) })
              touch()
              // 建单瞬间已加入的歌，补发到新 id 下
              for (const sid of pl.songIds) {
                fire(
                  api(`/library/playlists/${res.id}/songs`, {
                    method: 'POST',
                    body: { songId: sid },
                  }),
                )
              }
            },
          ),
        )
      }
      return id
    },

renamePlaylist(id, name) {
      set((s) => ({
        playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
      }))
      touch()
      if (loggedIn() && serverId(id)) {
        const cur = get().playlists.find((p) => p.id === id)
        fire(api(`/library/playlists/${id}`, { method: 'PUT', body: { name, desc: cur?.desc ?? '' } }))
      }
    },

    deletePlaylist(id) {
      set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }))
      touch()
      if (loggedIn() && !tempPlaylist(id)) fire(api(`/library/playlists/${id}`, { method: 'DELETE' }))
    },

    addToPlaylist(pid, songId) {
      set((s) => ({
        playlists: s.playlists.map((p) =>
          p.id === pid && !p.songIds.includes(songId)
            ? { ...p, songIds: [...p.songIds, songId] }
            : p,
        ),
      }))
      touch()
      if (loggedIn() && !tempPlaylist(pid)) {
        fire(api(`/library/playlists/${pid}/songs`, { method: 'POST', body: { songId } }))
      }
    },

    removeFromPlaylist(pid, songId) {
      set((s) => ({
        playlists: s.playlists.map((p) =>
          p.id === pid ? { ...p, songIds: p.songIds.filter((x) => x !== songId) } : p,
        ),
      }))
      touch()
      if (loggedIn() && !tempPlaylist(pid)) {
        fire(
          api(`/library/playlists/${pid}/songs/${encodeURIComponent(songId)}`, { method: 'DELETE' }),
        )
      }
    },

    recordPlay(songId) {
      const day = new Date().toISOString().slice(0, 10)
      set((s) => ({
        counts: { ...s.counts, [songId]: (s.counts[songId] || 0) + 1 },
        history: [{ songId, at: Date.now() }, ...s.history.filter((h) => h.songId !== songId)].slice(0, 100),
      }))
      touch()
      // 匿名也上报：用于全站播放量
      fire(api('/report/play', { method: 'POST', body: { songId } }))
    },

    recordFinish(songId, seconds) {
      const day = new Date().toISOString().slice(0, 10)
      set((s) => ({
        totalSeconds: s.totalSeconds + Math.round(seconds),
        daily: { ...s.daily, [day]: (s.daily[day] || 0) + Math.round(seconds) },
        completedSongs: s.completedSongs + 1,
      }))
      touch()
      fire(api('/report/finish', { method: 'POST', body: { songId, seconds: Math.round(seconds) } }))
    },

    setPos(songId, sec) {
      set((s) => ({ lastPos: { ...s.lastPos, [songId]: sec } }))
      touch()
      if (loggedIn()) {
        fire(api('/library/position', { method: 'POST', body: { songId, seconds: Math.round(sec) } }))
      }
    },

    bumpCapoCalc() {
      set((s) => ({ capoCalcs: s.capoCalcs + 1 }))
      touch()
      if (loggedIn()) fire(api('/library/capo', { method: 'POST' }))
    },

    clearHistory() {
      set({ history: [] })
      touch()
      if (loggedIn()) fire(api('/library/history/clear', { method: 'POST' }))
    },

    async syncFromServer() {
      if (!loggedIn()) return
      try {
        const [favs, lists, hist, pos] = await Promise.all([
          api<string[]>('/library/favorites'),
          api<Playlist[]>('/library/playlists'),
          api<{ songId: string; at: number }[]>('/library/history'),
          api<Record<string, number>>('/library/positions'),
        ])
        set({
          favorites: Array.isArray(favs) ? favs : get().favorites,
          playlists: Array.isArray(lists) && lists.length ? lists : get().playlists,
          history: Array.isArray(hist) ? hist.map((h) => ({ songId: h.songId, at: h.at })) : get().history,
          lastPos: pos && typeof pos === 'object' ? pos : get().lastPos,
        })
        touch()
      } catch {
        // 离线：保持本地缓存
      }
    },

    stats() {
      const s = get()
      const playedIds = Object.keys(s.counts).filter((k) => s.counts[k] > 0)
      const byAlbum: Record<string, Set<string>> = {}
      for (const id of playedIds) {
        const song = songMap[id]
        if (!song) continue
        ;(byAlbum[song.albumId] ||= new Set()).add(id)
      }
      const albumCoverage = Object.entries(byAlbum).filter(
        ([aid, got]) => songs.filter((x) => x.albumId === aid).length <= got.size,
      ).length
      const days = s.activeDays.sort()
      let streak = 0
      for (let i = days.length - 1; i >= 0; i--) {
        const want = new Date(Date.now() - streak * 86400000).toISOString().slice(0, 10)
        if (days[i] === want) streak++
        else if (days[i] < want) break
      }
      const nightPlays = s.daily['night:count'] || 0
      return {
        playedIds,
        playCount: Object.values(s.counts).reduce((a, b) => a + b, 0),
        totalSeconds: s.totalSeconds,
        favoriteCount: s.favorites.length,
        albumCoverage,
        completedSongs: s.completedSongs,
        consecutiveDays: streak,
        unlockedKeys: s.capoCalcs,
        nightPlays,
      }
    },

    checkAchievements() {
      const snap = get().stats()
      const now = get().unlocked
      const fresh = achievements.filter((a) => !now.includes(a.id) && a.test(snap)).map((a) => a.id)
      if (fresh.length) {
        set((s) => ({ unlocked: [...s.unlocked, ...fresh] }))
        touch()
      }
      return fresh
    },
  }
})

/** 深夜收听单独统计：由 App 在 0 点时段播放时调用 */
export function recordNightPlay() {
  useLibrary.setState((s) => ({
    daily: { ...s.daily, 'night:count': (s.daily['night:count'] || 0) + 1 },
  }))
  persist(() => useLibrary.getState())
}

export function nightPlayCount() {
  return useLibrary.getState().daily['night:count'] || 0
}
