import { useEffect, useRef, useState } from 'react'
import type { Video } from '../../data/types'
import { coverPalette } from '../../lib/hash'
import { mediaUrl, rememberMediaOk } from '../../lib/media'
import { mmss } from '../../lib/format'
import { useSettings } from '../../store/settings'
import { Icon } from '../common/Icon'
import { Slider } from '../common/Slider'

interface StageProps {
  video: Video
  /** 播放结束（真实视频 ended / 模拟进度走完）时回调 */
  onEnded?: () => void
}

interface Dust {
  x: number
  y: number
  r: number
  s: number
}

/**
 * 视频舞台。
 * 绑定了 mp4（或数据里给了 videoUrl）就用 <video>；
 * 否则在 Canvas 上跑一台「模拟放映机」：光影、灰尘、划痕、扫描线 + 计时进度，
 * 这样在完全没有视频素材时也能把整页交互验收完。
 */
export function Stage({ video, onEnded }: StageProps) {
  const localMedia = useSettings((s) => s.localMedia)
  const offlineLibrary = useSettings((s) => s.offlineLibrary)
  const src = mediaUrl('video', video.id, video.videoUrl, localMedia, offlineLibrary)

  const [broken, setBroken] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [pip, setPip] = useState(false)
  const [speed, setSpeed] = useState(1)

  const wrapRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const real = !!src && !broken
  const duration = video.duration

  // 供动画/定时器读取的最新值，避免把这些值塞进 effect 依赖导致反复重启
  const playingRef = useRef(false)
  const endedRef = useRef(onEnded)
  endedRef.current = onEnded
  /** 模拟模式下真实推进的时间轴（秒），不受 React 渲染周期影响 */
  const clock = useRef(0)
  const speedRef = useRef(1)

  useEffect(() => {
    setBroken(false)
    setPlaying(false)
    playingRef.current = false
    clock.current = 0
    setT(0)
    if (videoRef.current) videoRef.current.playbackRate = speedRef.current
  }, [video.id, src])

  const changeSpeed = (r: number) => {
    setSpeed(r)
    speedRef.current = r
    if (videoRef.current) videoRef.current.playbackRate = r
  }

  /* ---------- 真实视频：把原生事件桥接到本组件状态 ---------- */
  useEffect(() => {
    const el = videoRef.current
    if (!real || !el) return
    const onTime = () => setT(el.currentTime)
    const onMeta = () => {
      el.playbackRate = speedRef.current
      setT(el.currentTime)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => {
      setPlaying(false)
      playingRef.current = false
      endedRef.current?.()
    }
    const onErr = () => setBroken(true)
    const onOk = () => rememberMediaOk('video' + video.id, src)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('playing', onPlay)
    el.addEventListener('playing', onOk)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnd)
    el.addEventListener('error', onErr)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('playing', onPlay)
      el.removeEventListener('playing', onOk)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('error', onErr)
    }
  }, [real, src, video.id])

  const toggle = () => {
    if (real) {
      const el = videoRef.current
      if (!el) return
      el.playbackRate = speedRef.current
      if (el.paused) el.play().catch(() => setBroken(true))
      else el.pause()
      return
    }
    if (clock.current >= duration - 0.2) clock.current = 0
    playingRef.current = !playingRef.current
    setPlaying(playingRef.current)
  }

  const seek = (v: number) => {
    clock.current = v
    setT(v)
    if (real && videoRef.current) videoRef.current.currentTime = v
  }

  /* ---------- 模拟放映机 ---------- */
  useEffect(() => {
    if (real) return
    const cv = cvRef.current
    const wrap = wrapRef.current
    if (!cv || !wrap) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const pal = coverPalette(video.title)
    const dust: Dust[] = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.5,
      s: Math.random() * 0.5 + 0.15,
    }))

    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (playingRef.current) {
        const next = clock.current + dt * speedRef.current
        if (next >= duration) {
          clock.current = duration
          playingRef.current = false
          setT(duration)
          setPlaying(false)
          endedRef.current?.()
        } else {
          clock.current = next
          setT(next)
        }
      }

      paint(ctx, cv, wrap, now, pal.from, pal.to, pal.hue, dust)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [real, video.title, duration])

  const p = duration > 0 ? Math.min(1, t / duration) : 0

  return (
    <div
      className="player-stage"
      ref={wrapRef}
      style={pip ? { position: 'fixed', right: 18, bottom: 96, width: 320, zIndex: 90, boxShadow: 'var(--shadow-3)' } : undefined}
    >
      {real ? (
        <video
          ref={videoRef}
          className="player-stage__canvas"
          src={src}
          poster={video.poster || undefined}
          playsInline
          preload="metadata"
          onClick={toggle}
        />
      ) : (
        <canvas
          ref={cvRef}
          className="player-stage__canvas"
          onClick={toggle}
          aria-label="模拟放映机画面"
        />
      )}

      {!real && (
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 12,
            zIndex: 4,
            fontSize: 11,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.62)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          SIMULATED PROJECTOR · 未绑定视频文件
        </div>
      )}

      {!playing && (
        <div className="stage__center">
          <button className="stage__big" onClick={toggle} aria-label="播放">
            <Icon name="play" size={30} />
          </button>
        </div>
      )}

      <div className="stage__bar">
        <button className="iconbtn" style={{ color: '#fff' }} onClick={toggle} aria-label={playing ? '暂停' : '播放'}>
          <Icon name={playing ? 'pause' : 'play'} size={19} />
        </button>
        <span className="mono" style={{ fontSize: 11, minWidth: 38, textAlign: 'right' }}>
          {mmss(t)}
        </span>
        <div style={{ flex: 1 }}>
          <Slider value={t} max={duration} format={mmss} onScrub={seek} live={false} />
        </div>
        <span className="mono" style={{ fontSize: 11, minWidth: 38 }}>
          {mmss(duration)}
        </span>
        <select
          className="stage__speed"
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          aria-label="播放速度"
          title="播放速度"
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r}>{`${r}×`}</option>
          ))}
        </select>
        {real && (
          <button
            className={`iconbtn ${pip ? 'is-on' : ''}`}
            style={{ color: pip ? 'var(--gold)' : '#fff' }}
            onClick={() => setPip((v) => !v)}
            aria-label="小窗"
            title="缩小为小窗（模拟画中画）"
          >
            <Icon name={pip ? 'expand' : 'collapse'} size={17} />
          </button>
        )}
      </div>

      <span className="sr-only">{`已播放 ${Math.round(p * 100)}%`}</span>
    </div>
  )
}

/** 放映机画面：渐变底 + 光锥闪烁 + 扫光 + 灰尘 + 划痕 + 扫描线 + 暗角 */
function paint(
  ctx: CanvasRenderingContext2D,
  cv: HTMLCanvasElement,
  wrap: HTMLElement,
  now: number,
  from: string,
  to: string,
  hue: number,
  dust: Dust[],
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(wrap.clientWidth * dpr))
  const h = Math.max(1, Math.round(wrap.clientHeight * dpr))
  if (cv.width !== w || cv.height !== h) {
    cv.width = w
    cv.height = h
  }

  ctx.fillStyle = '#06070a'
  ctx.fillRect(0, 0, w, h)

  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.globalAlpha = 0.45
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1

  const flick = 0.72 + Math.sin(now / 90) * 0.05 + Math.random() * 0.09
  const rg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.62)
  rg.addColorStop(0, `hsla(${hue}, 60%, 78%, ${0.34 * flick})`)
  rg.addColorStop(0.55, 'rgba(0,0,0,0.42)')
  rg.addColorStop(1, 'rgba(0,0,0,0.9)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, w, h)

  // 缓慢横扫的光带
  const band = 300 * dpr
  const bx = (((now / 2600) % 1) * (w + band * 2)) - band
  const lg = ctx.createLinearGradient(bx - band, 0, bx + band, 0)
  lg.addColorStop(0, 'rgba(255,255,255,0)')
  lg.addColorStop(0.5, 'rgba(255,255,255,0.06)')
  lg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = lg
  ctx.fillRect(bx - band, 0, band * 2, h)

  // 胶片颗粒 / 灰尘：缓慢上飘
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  for (const d of dust) {
    d.y -= d.s / 90
    if (d.y < -0.02) {
      d.y = 1.02
      d.x = Math.random()
    }
    ctx.fillRect(d.x * w, d.y * h, d.r * dpr, d.r * dpr)
  }

  // 偶发竖向划痕
  if (Math.random() < 0.05) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(Math.random() * w, 0, dpr, h)
  }

  // 扫描线
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  for (let y = 0; y < h; y += 3 * dpr) ctx.fillRect(0, y, w, dpr)
}
