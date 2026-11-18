import { create } from 'zustand'
import { engine } from '../player/engine'
import { load, save } from '../lib/storage'
import { songMap, songs } from '../data/songs'
import { mediaUrl } from '../lib/media'
import { useLibrary } from './library'
import { useSettings } from './settings'

export type PlayMode = 'list' | 'single' | 'shuffle'

interface PersistShape {
  queue: string[]
  index: number
  volume: number
  muted: boolean
  mode: PlayMode
  rate: number
}

const DEFAULTS: PersistShape = {
  queue: [],
  index: -1,
  volume: 0.8,
  muted: false,
  mode: 'list',
  rate: 1,
}

export interface PlayerState extends PersistShape {
  currentId: string | null
  playing: boolean
  time: number
  duration: number
  /** 引擎当前是否真的在解码音频（false 表示模拟时钟） */
  simulated: boolean
  fullOpen: boolean
  queueOpen: boolean
  sleepEndsAt: number | null
  sleepLabel: string

  play: (songId: string, fromQueue?: string[]) => void
  playQueue: (ids: string[], startIndex?: number) => void
  toggle: () => void
  next: (auto?: boolean) => void
  prev: () => void
  seek: (t: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setMode: (m: PlayMode) => void
  cycleMode: () => PlayMode
  setRate: (r: number) => void
  enqueue: (ids: string[], next?: boolean) => void
  removeAt: (i: number) => void
  reorder: (from: number, to: number) => void
  jumpTo: (i: number) => void
  clearQueue: () => void
  setFull: (v: boolean) => void
  setQueueOpen: (v: boolean) => void
  setSleep: (label: string, minutes: number) => void
  stopSleep: () => void
}

const persisted = { ...DEFAULTS, ...load<PersistShape>('player', DEFAULTS) }

function pickShuffle(len: number, exclude: number) {
  if (len <= 1) return 0
  let n = exclude
  while (n === exclude) n = Math.floor(Math.random() * len)
  return n
}

let sleepTimer: ReturnType<typeof setInterval> | null = null
let posTimer: ReturnType<typeof setInterval> | null = null

export const usePlayer = create<PlayerState>((set, get) => {
  const hydrate = (ids: string[], index: number, autoplay: boolean, resumeFrom?: number) => {
    const id = ids[index]
    if (!id) return
    const song = songMap[id]
    if (!song) return
    const st = useSettings.getState()
    let startAt = 0
    if (resumeFrom != null) startAt = resumeFrom
    else if (st.autoResume) {
      const p = useLibrary.getState().lastPos[id]
      if (p && p > 5 && p < song.duration - 10) startAt = p
    }
    const src = mediaUrl('audio', id, song.audioUrl, st.localMedia, st.offlineLibrary)
    engine.setTrack({ src, duration: song.duration, startAt })
    engine.setVolume(get().volume)
    engine.setMuted(get().muted)
    engine.setRate(get().rate)
    set({
      queue: ids,
      index,
      currentId: id,
      duration: song.duration,
      time: startAt,
      simulated: !src,
    })
    useLibrary.getState().recordPlay(id)
    if (autoplay) engine.play()
  }

  const advance = (auto: boolean) => {
    const s = get()
    if (!s.queue.length) return
    if (s.mode === 'shuffle') {
      const n = pickShuffle(s.queue.length, s.index)
      hydrate(s.queue, n, true)
      return
    }
    const nextIdx = s.index + 1
    if (nextIdx >= s.queue.length) {
      if (s.mode === 'list' || auto) {
        hydrate(s.queue, 0, true)
      } else {
        engine.pause()
        set({ index: s.queue.length - 1 })
      }
      return
    }
    hydrate(s.queue, nextIdx, true)
  }

  // 引擎 → store
  engine.subscribe(() => {
    set({
      time: engine.time(),
      duration: engine.durationOf() || get().duration,
      playing: engine.isPlaying(),
    })
  })

  engine.onEnded(() => {
    const s = get()
    if (s.currentId) {
      const song = songMap[s.currentId]
      if (song) useLibrary.getState().recordFinish(song.id, song.duration)
      useLibrary.getState().setPos(song?.id ?? '', 0)
    }
    if (s.mode === 'single') {
      engine.seek(0)
      engine.play()
      return
    }
    advance(true)
    const fresh = useLibrary.getState().checkAchievements()
    if (fresh.length) queueMicrotask(() => notifyAchievement(fresh))
  })

  engine.onLoadFail(() => set({ simulated: true }))

  // 每 5 秒记录一次断点
  posTimer = setInterval(() => {
    const s = get()
    if (s.playing && s.currentId) {
      useLibrary.getState().setPos(s.currentId, s.time)
    }
  }, 5000)

  sleepTimer = setInterval(() => {
    const at = get().sleepEndsAt
    if (at && Date.now() >= at) {
      engine.pause()
      set({ sleepEndsAt: null, sleepLabel: '' })
      toast('定时播放结束，已暂停')
    }
  }, 2000)

  return {
    ...persisted,
    playing: false,
    time: 0,
    duration: 0,
    simulated: false,
    fullOpen: false,
    queueOpen: false,
    sleepEndsAt: null,
    sleepLabel: '',
    currentId: persisted.queue[persisted.index] ?? null,

    play(songId, fromQueue) {
      const ids = fromQueue?.length ? fromQueue : get().queue
      const idx = ids.indexOf(songId)
      if (idx >= 0) hydrate(ids, idx, true)
      else hydrate([songId], 0, true)
    },

    playQueue(ids, startIndex = 0) {
      if (!ids.length) return
      hydrate(ids, Math.min(startIndex, ids.length - 1), true)
    },

    toggle() {
      if (!get().currentId) {
        const top = songs[0]
        hydrate([top.id], 0, true)
        return
      }
      engine.toggle()
    },

    next: (auto) => advance(!!auto),

    prev() {
      const s = get()
      if (s.time > 6 || s.index <= 0) {
        engine.seek(0)
        if (!s.playing) engine.play()
        return
      }
      hydrate(s.queue, s.index - 1, true)
    },

    seek(t) {
      engine.seek(t)
      set({ time: t })
    },

    setVolume(v) {
      engine.setVolume(v)
      set({ volume: v, muted: v === 0 })
      saveNow(get())
    },

    toggleMute() {
      const muted = !get().muted
      engine.setMuted(muted)
      set({ muted })
      saveNow(get())
    },

    setMode(m) {
      set({ mode: m })
      saveNow(get())
    },

    cycleMode() {
      const order: PlayMode[] = ['list', 'single', 'shuffle']
      const next = order[(order.indexOf(get().mode) + 1) % order.length]
      get().setMode(next)
      return next
    },

    setRate(r) {
      engine.setRate(r)
      set({ rate: r })
      saveNow(get())
    },

    enqueue(ids, now) {
      const s = get()
      // 保持当前曲目位置不变，把新曲目插到它后面，同时去重
      const head = s.queue.slice(0, s.index + 1)
      const tail = s.queue.slice(s.index + 1).filter((x) => !ids.includes(x))
      const queue = [...head, ...ids.filter((x) => !head.includes(x)), ...tail]
      set({ queue })
      saveNow(get())
      if (now) hydrate(queue, head.length, true)
    },

    removeAt(i) {
      const s = get()
      if (i < 0 || i >= s.queue.length) return
      const queue = s.queue.filter((_, x) => x !== i)
      let index = s.index
      if (i < index) index--
      else if (i === index) {
        index = Math.min(i, queue.length - 1)
      }
      set({ queue, index })
      saveNow(get())
      if (i === s.index) {
        if (queue.length) hydrate(queue, index, s.playing)
        else {
          engine.pause()
          set({ currentId: null })
        }
      }
    },

    jumpTo(i) {
      const s = get()
      if (s.queue[i]) hydrate(s.queue, i, true)
    },

    reorder(from, to) {
      const s = get()
      if (from === to || from < 0 || to < 0 || from >= s.queue.length || to >= s.queue.length) return
      const queue = [...s.queue]
      const [moved] = queue.splice(from, 1)
      queue.splice(to, 0, moved)
      let index = s.index
      if (from === index) index = to
      else {
        if (from < index && to >= index) index--
        if (from > index && to <= index) index++
      }
      set({ queue, index })
      saveNow(get())
    },

    clearQueue() {
      engine.pause()
      set({ queue: [], index: -1, currentId: null })
      saveNow(get())
    },

    setFull(v) {
      set({ fullOpen: v })
    },

    setQueueOpen(v) {
      set({ queueOpen: v })
    },

    setSleep(label, minutes) {
      if (minutes <= 0) {
        get().stopSleep()
        return
      }
      set({ sleepEndsAt: Date.now() + minutes * 60000, sleepLabel: label })
    },

    stopSleep() {
      set({ sleepEndsAt: null, sleepLabel: '' })
    },
  }
})

function saveNow(s: PlayerState) {
  save('player', {
    queue: s.queue,
    index: s.index,
    volume: s.volume,
    muted: s.muted,
    mode: s.mode,
    rate: s.rate,
  })
}

/* ---- 轻量通知总线：避免 store 之间循环依赖 ---- */

type ToastFn = (msg: string) => void
type AchFn = (ids: string[]) => void

let toastImpl: ToastFn = (m) => console.log('[toast]', m)
let achImpl: AchFn = () => {}

export function bindToast(fn: ToastFn) {
  toastImpl = fn
}
export function bindAchievement(fn: AchFn) {
  achImpl = fn
}
function toast(msg: string) {
  toastImpl(msg)
}
function notifyAchievement(ids: string[]) {
  achImpl(ids)
}

/** 供 UI 调用的显式提示 */
export { toast }
