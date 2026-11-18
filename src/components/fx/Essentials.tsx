import { useEffect, useMemo, useRef, useState } from 'react'
import { useUi } from '../../store/ui'
import { usePlayer } from '../../store/player'
import { useSettings } from '../../store/settings'
import { songMap } from '../../data/songs'
import { activeIndex } from '../../lib/lrc'
import { useSongLyric } from '../lyrics/Lyrics'
import { Icon } from '../common/Icon'

/** 全局胶片颗粒 */
export function Grain() {
  return <div className="grain" aria-hidden="true" />
}

/** 南京下雨彩蛋 */
export function Rain() {
  const on = useUi((s) => s.rain)
  const drops = useMemo(
    () =>
      Array.from({ length: 70 }).map(() => ({
        left: Math.random() * 100,
        delay: -Math.random() * 2.4,
        dur: 0.7 + Math.random() * 0.7,
        op: 0.25 + Math.random() * 0.5,
      })),
    [],
  )
  if (!on) return null
  return (
    <div className="rain" aria-hidden="true">
      {drops.map((d, i) => (
        <i
          key={i}
          style={{
            left: `${d.left}%`,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            opacity: d.op,
          }}
        />
      ))}
    </div>
  )
}

/** 生日纸屑彩蛋 */
export function Confetti() {
  const on = useUi((s) => s.confetti)
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        dur: 3 + Math.random() * 3,
        color: ['#f2f2f2', '#c9c9c9', '#9a9a9a', '#e6e6e6', '#bdbdbd'][
          Math.floor(Math.random() * 5)
        ],
        rot: Math.random() * 360,
      })),
    [],
  )
  if (!on) return null
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((d, i) => (
        <i
          key={i}
          style={{
            left: `${d.left}%`,
            background: d.color,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            transform: `rotate(${d.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

/** 桌面歌词悬浮窗（客户端能力的前端预演） */
export function DesktopLyric() {
  const show = useUi((s) => s.desktopLyric)
  const time = usePlayer((s) => s.time)
  const currentId = usePlayer((s) => s.currentId)
  const song = currentId ? songMap[currentId] : undefined
  const { lines } = useSongLyric(song)
  const idx = activeIndex(lines, time)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    const cfg = useSettings.getState()
    if (cfg.desktopLyric !== show) useSettings.getState().set({ desktopLyric: show })
  }, [show])

  if (!show) return null
  const text = idx >= 0 ? lines[idx].text : '♪ ♪ ♪'

  return (
    <div
      className="desk-lyric"
      style={
        pos
          ? { left: pos.x, top: pos.y, bottom: 'auto', transform: 'none' }
          : undefined
      }
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy })
      }}
      onPointerUp={() => (drag.current = null)}
    >
      {text}
      <span className="sub">{song?.title ?? ''}</span>
      <button
        className="iconbtn"
        style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24 }}
        onClick={() => useUi.getState().setDesktopLyric(false)}
        aria-label="关闭桌面歌词"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}

/** 可拖拽悬浮播放球 */
export function FloatingOrb() {
  const enabled = useSettings((s) => s.floatingOrb)
  const playing = usePlayer((s) => s.playing)
  const currentId = usePlayer((s) => s.currentId)
  const toggle = usePlayer((s) => s.toggle)
  const setFull = usePlayer((s) => s.setFull)
  const song = currentId ? songMap[currentId] : undefined
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null)

  if (!enabled) return null
  return (
    <div
      className="orb"
      title={song ? song.title : '还没有播放内容'}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        drag.current.moved = true
        setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy })
      }}
      onPointerUp={() => {
        const moved = drag.current?.moved
        drag.current = null
        if (!moved) (playing ? toggle() : song ? toggle() : setFull(true))
      }}
    >
      <Icon name={playing ? 'pause' : 'play'} size={20} />
    </div>
  )
}
