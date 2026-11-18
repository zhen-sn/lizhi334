import { useEffect, useRef } from 'react'
import { songMap } from '../data/songs'
import { activeIndex, parseLrc, buildPlaceholderLrc } from '../lib/lrc'
import { usePlayer } from '../store/player'
import type { LyricLine, LyricState } from '../types/desktop'

/**
 * 主窗口 → 托盘 / 迷你窗 的播放器状态推送，
 * 以及反向的播放指令。浏览器里 window.desktop 不存在，这里直接短路。
 */
export function useDesktopBridge() {
  useEffect(() => {
    const desktop = window.desktop
    if (!desktop) return

    let lastSongId: string | null = null

    const push = () => {
      const p = usePlayer.getState()
      if (p.currentId !== lastSongId) {
        // 切歌时顺便把歌词完整包发过去，让迷你窗和歌词窗都能立刻拿到
        lastSongId = p.currentId
        const song = p.currentId ? songMap[p.currentId] : null
        const raw = song?.lyrics?.trim() || (song ? buildPlaceholderLrc(song.duration, song.title) : '')
        const lines: LyricLine[] = raw ? parseLrc(raw) : []
        desktop.sendLyricState?.({
          songId: p.currentId,
          title: song?.title ?? '',
          artist: song ? '李志' : '',
          playing: p.playing,
          lines,
          activeIndex: activeIndex(lines, p.time),
        })
      }
      const p2 = usePlayer.getState()
      const song = p2.currentId ? songMap[p2.currentId] : null
      desktop.sendState({
        songId: p2.currentId,
        title: song?.title ?? '',
        artist: song ? '李志' : '',
        album: '',
        playing: p2.playing,
        time: p2.time,
        duration: p2.duration,
      })
    }

    push()
    const timer = window.setInterval(push, 500)

    const off = desktop.onCommand((cmd) => {
      const p = usePlayer.getState()
      if (cmd === 'toggle') p.toggle()
      else if (cmd === 'next') p.next()
      else if (cmd === 'prev') p.prev()
    })

    return () => {
      window.clearInterval(timer)
      off()
    }
  }, [])
}

/**
 * 歌词行索引高频推送。time 每变化一个刻度（50ms），重新算 activeIndex，
 * 只推索引 + playing + time，避免每次重新 JSON 序列化整段歌词。
 */
export function useDesktopLyricTick() {
  // useRef 必须在渲染期调用，放进 useEffect 会在桌面端触发 Invalid hook call 导致整窗黑屏
  const last = useRef<{ songId: string | null; idx: number }>({ songId: null, idx: -1 })

  useEffect(() => {
    const desktop = window.desktop
    if (!desktop) return

    const pushTick = () => {
      const p = usePlayer.getState()
      const song = p.currentId ? songMap[p.currentId] : null
      const raw = song?.lyrics?.trim() || (song ? buildPlaceholderLrc(song.duration, song.title) : '')
      const lines = raw ? parseLrc(raw) : []
      const idx = activeIndex(lines, p.time)
      const isNewSong = last.current.songId !== p.currentId
      if (!isNewSong && last.current.idx === idx) return
      last.current = { songId: p.currentId, idx }
      const state: LyricState = {
        songId: p.currentId,
        title: song?.title ?? '',
        artist: song ? '李志' : '',
        playing: p.playing,
        lines: isNewSong ? lines : [],
        activeIndex: idx,
      }
      desktop.sendLyricState?.(state)
    }

    pushTick()
    const timer = window.setInterval(pushTick, 120)
    return () => window.clearInterval(timer)
  }, [])
}
