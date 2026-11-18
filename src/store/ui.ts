import { create } from 'zustand'
import { bindAchievement, bindToast } from './player'
import { achievements, easterEggs } from '../data/achievements'
import { songMap } from '../data/songs'
import { profile } from '../data/bio'
import { useSettings } from './settings'

export interface ToastItem {
  id: number
  msg: string
  kind: 'info' | 'good' | 'ach'
}

interface UiState {
  toasts: ToastItem[]
  push: (msg: string, kind?: ToastItem['kind']) => void
  dismiss: (id: number) => void
  search: string
  setSearch: (v: string) => void
  rain: boolean
  confetti: boolean
  desktopLyric: boolean
  setDesktopLyric: (v: boolean) => void
  orbPos: { x: number; y: number } | null
  setOrbPos: (p: { x: number; y: number } | null) => void
  /** 添加到歌单的选择器；一次可选多首 */
  picker: string[] | null
  openPicker: (songIds: string[]) => void
  closePicker: () => void
  /** 当前展开的曲目菜单 */
  menuSong: string | null
  setMenuSong: (id: string | null) => void
  /** 登录 / 注册弹窗 */
  authModal: 'login' | 'register' | null
  openAuth: (mode: 'login' | 'register') => void
  closeAuth: () => void
}

let seq = 1

export const useUi = create<UiState>((set, get) => ({
  toasts: [],
  push(msg, kind = 'info') {
    const id = seq++
    set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }))
    setTimeout(() => get().dismiss(id), kind === 'ach' ? 4600 : 2400)
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  search: '',
  setSearch(v) {
    set({ search: v })
  },

  rain: false,
  confetti: false,
  desktopLyric: false,
  setDesktopLyric(v) {
    set({ desktopLyric: v })
  },
  orbPos: null,
  setOrbPos(p) {
    set({ orbPos: p })
  },

  picker: null,
  openPicker(songIds) {
    set({ picker: songIds })
  },
  closePicker() {
    set({ picker: null })
  },

  menuSong: null,
  setMenuSong(id) {
    set({ menuSong: id })
  },

  authModal: null,
  openAuth(mode) {
    set({ authModal: mode })
  },
  closeAuth() {
    set({ authModal: null })
  },
}))

/* ---- 把 store 之间的副作用接起来 ---- */

bindToast((msg) => useUi.getState().push(msg, 'info'))

bindAchievement((ids) => {
  for (const id of ids) {
    const a = achievements.find((x) => x.id === id)
    if (a) useUi.getState().push(`解锁成就 · ${a.icon} ${a.name}`, 'ach')
  }
})

/** 播放曲目时判定彩蛋 */
export function syncEasterEggs(songId: string | null) {
  const st = useUi.getState()
  const cfg = useSettings.getState()
  const enabled = cfg.easterEgg
  const mmdd = `${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
    new Date().getDate(),
  ).padStart(2, '0')}`
  const isBirthday = enabled && (mmdd === profile.birthday || cfg.birthdayMode)
  const song = songId ? songMap[songId] : undefined
  const shouldRain =
    enabled &&
    !!song &&
    easterEggs.rainSongIds.includes(song.id) &&
    (song.city === '南京' || song.tags.includes('南京'))

  if (shouldRain !== st.rain) useUi.setState({ rain: shouldRain })
  if (isBirthday !== st.confetti) useUi.setState({ confetti: isBirthday })
}
