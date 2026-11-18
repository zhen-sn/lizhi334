import { useEffect, useRef } from 'react'
import { usePlayer } from '../store/player'
import { useSettings } from '../store/settings'
import { useUi } from '../store/ui'
import { songs } from '../data/songs'

export const HOTKEYS: [string, string][] = [
  ['空格', '播放 / 暂停'],
  ['← / →', '快退 / 快进 5 秒'],
  ['↑ / ↓', '音量 ±5%'],
  ['N / P', '下一首 / 上一首'],
  ['M', '静音'],
  ['L', '全屏播放器'],
  ['Q', '播放队列'],
  ['D', '播放模式'],
  ['R', '随机来一首'],
  ['/ 或 Ctrl+K', '聚焦搜索框'],
  ['?', '打开本帮助'],
]

const isTyping = (el: EventTarget | null) => {
  const n = el as HTMLElement | null
  if (!n) return false
  const tag = n.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || n.isContentEditable
}

/** 全局快捷键；设置里可关闭 */
export function useHotkeys(opts: { onHelp: () => void }) {
  const enabled = useSettings((s) => s.hotkeys)
  const latest = useRef(opts)
  latest.current = opts

  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
        return
      }
      const p = usePlayer.getState()
      const meta = e.ctrlKey || e.metaKey

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        focusSearch()
        return
      }
      if (meta) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          p.toggle()
          return
        case 'ArrowRight':
          e.preventDefault()
          p.seek(Math.min(p.duration, p.time + 5))
          return
        case 'ArrowLeft':
          e.preventDefault()
          p.seek(Math.max(0, p.time - 5))
          return
        case 'ArrowUp':
          e.preventDefault()
          p.setVolume(Math.min(1, p.volume + 0.05))
          return
        case 'ArrowDown':
          e.preventDefault()
          p.setVolume(Math.max(0, p.volume - 0.05))
          return
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          p.next(false)
          break
        case 'p':
          p.prev()
          break
        case 'm':
          p.toggleMute()
          break
        case 'l':
          p.setFull(!p.fullOpen)
          break
        case 'q':
          p.setQueueOpen(!p.queueOpen)
          break
        case 'd':
          usePlayer.getState().cycleMode()
          break
        case 'r': {
          const st = useUi.getState()
          st.push('命运模式：交给下一首')
          if (!p.queue.length) {
            const s = songs[Math.floor(Math.random() * songs.length)]
            p.playQueue(songs.map((x) => x.id), songs.indexOf(s))
          } else {
            p.next(true)
          }
          break
        }
        case '/':
          e.preventDefault()
          focusSearch()
          break
        case '?':
          latest.current.onHelp()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}

function focusSearch() {
  const input = document.querySelector<HTMLInputElement>('.search input')
  if (input) {
    input.focus()
    input.select()
  }
}
