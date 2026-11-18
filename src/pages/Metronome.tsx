import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Slider } from '../components/common/Slider'
import { Section, Empty, Toggle } from '../components/common/Primitives'
import { blip, ctxNow, ensureCtx } from '../lib/click'
import { usePlayer } from '../store/player'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { songs, songMap } from '../data/songs'

const MARKS: [number, number, string][] = [
  [0, 56, 'Largo 广板'],
  [56, 66, 'Larghetto 小广板'],
  [66, 76, 'Adagio 柔板'],
  [76, 108, 'Andante 行板'],
  [108, 120, 'Moderato 中板'],
  [120, 156, 'Allegro 快板'],
  [156, 176, 'Vivace 活泼的'],
  [176, 999, 'Presto 急板'],
]

const PRESETS = [60, 68, 72, 76, 80, 88, 96, 108, 120]

export default function Metronome() {
  const [params] = useSearchParams()
  const fromQuery = Number(params.get('bpm'))
  const [bpm, setBpm] = useState(() => (isFinite(fromQuery) && fromQuery >= 30 && fromQuery <= 240 ? fromQuery : 76))
  const [beats, setBeats] = useState(4)
  const [gain, setGain] = useState(0.6)
  const [sub, setSub] = useState(false)
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState(-1)
  const [muted, setMuted] = useState(false)

  const pendRef = useRef<HTMLDivElement>(null)
  const push = useUi((s) => s.push)

  const currentId = usePlayer((s) => s.currentId)
  const current = currentId ? songMap[currentId] : undefined
  const counts = useLibrary((s) => s.counts)

  // 调度参数放在 ref 里，避免运行中改数值就重启定时器
  const cfg = useRef({ bpm, beats, gain, sub, muted })
  cfg.current = { bpm, beats, gain, sub, muted }

  const mark = useMemo(() => MARKS.find(([a, b]) => bpm >= a && bpm < b)?.[2] ?? '', [bpm])

  useEffect(() => {
    if (!running) {
      setCur(-1)
      if (pendRef.current) pendRef.current.style.transform = 'rotate(0deg)'
      return
    }
    const c = ensureCtx()
    if (!c) {
      push('当前浏览器不允许发声，请点一次页面再试')
      setRunning(false)
      return
    }

    const pending: { at: number; beat: number }[] = []
    let beat = 0
    let next = ctxNow() + 0.08
    let acc = 0
    let lastT = ctxNow()
    let raf = 0

    const schedule = () => {
      const { bpm: b, beats: n, gain: g, sub: s2, muted: m } = cfg.current
      const spb = 60 / b
      while (next < ctxNow() + 0.12) {
        const i = beat % n
        if (!m) {
          const isDown = i === 0
          blip(next, {
            freq: isDown ? 1760 : 1180,
            gain: (isDown ? 0.24 : 0.15) * g,
            dur: isDown ? 0.055 : 0.038,
            type: 'square',
          })
          if (s2) blip(next + spb / 2, { freq: 880, gain: 0.07 * g, dur: 0.03, type: 'triangle' })
        }
        pending.push({ at: next, beat: i })
        beat++
        next += spb
      }
    }

    const timer = window.setInterval(schedule, 30)
    schedule()

    const loop = () => {
      const now = ctxNow()
      // 视觉跟拍：只到点的事件才点亮，保证与声音同步
      while (pending.length && now >= pending[0].at) {
        const e = pending.shift()!
        setCur(e.beat)
      }
      const dt = Math.max(0, now - lastT)
      lastT = now
      acc += dt / (60 / cfg.current.bpm)
      if (pendRef.current) {
        pendRef.current.style.transform = `rotate(${(20 * Math.sin(Math.PI * acc)).toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.clearInterval(timer)
      cancelAnimationFrame(raf)
    }
  }, [running, push])

  // 改速度/拍号时重置相位，避免指针与点击声错位
  useEffect(() => {
    setCur(-1)
  }, [beats])

  /* ---- 打点测速 ---- */
  const taps = useRef<number[]>([])
  const tap = () => {
    const now = performance.now()
    taps.current = [...taps.current.filter((t) => now - t < 2600), now]
    if (taps.current.length >= 2) {
      const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i])
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
      const v = Math.round(60000 / avg)
      if (v >= 30 && v <= 240) setBpm(v)
    }
    if (taps.current.length > 6) taps.current.shift()
  }

  const nudge = (d: number) => setBpm((v) => Math.min(240, Math.max(30, v + d)))

  const hot = useMemo(
    () =>
      [...songs]
        .filter((s) => s.bpm)
        .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || b.playCount - a.playCount)
        .slice(0, 8),
    [counts],
  )

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/tools" className="mute">
          工具
        </Link>
        <Icon name="right" size={12} />
        <span>节拍器</span>
      </div>

      <header className="page-head">
        <h1>节拍器</h1>
        <p>WebAudio 精准计时（30ms 预排 + 音频时钟对表），慢练时用 subdivisions 打后半拍。</p>
      </header>

      <div className="card metro">
        <div className="metro__bpm mono">{bpm}</div>
        <div className="mute" style={{ fontSize: 12, marginTop: -14 }}>
          BPM · {mark}
        </div>

        <div className="metro__dots">
          {Array.from({ length: beats }).map((_, i) => (
            <span
              key={i}
              className={`metro__dot ${cur === i ? 'is-beat' : ''} ${i === 0 ? 'is-down' : ''}`}
            />
          ))}
        </div>

        <div
          className="metro__pendulum"
          ref={pendRef}
          style={{ transformOrigin: 'bottom center', background: 'var(--gold-line)' }}
        />

        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="iconbtn iconbtn--lg" onClick={() => nudge(-1)} aria-label="减速">
            <Icon name="minus" size={20} />
          </button>
          <button className="playbtn" style={{ width: 56, height: 56 }} onClick={() => setRunning((v) => !v)}>
            <Icon name={running ? 'pause' : 'play'} size={24} />
          </button>
          <button className="iconbtn iconbtn--lg" onClick={() => nudge(1)} aria-label="加速">
            <Icon name="plus" size={20} />
          </button>
          <button className="btn" onClick={tap} title="连点测速">
            <Icon name="clock" size={15} /> TAP {taps.current.length > 1 ? `${taps.current.length}` : ''}
          </button>
        </div>

        <input
          type="range"
          min={30}
          max={240}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--gold)' }}
          aria-label="速度"
        />

        <div className="row" style={{ width: '100%', maxWidth: 360, gap: 14 }}>
          <Icon name="volume" size={16} style={{ color: 'var(--fg-3)' }} />
          <div style={{ flex: 1 }}>
            <Slider value={gain * 100} max={100} onScrub={(v) => setGain(v / 100)} format={(v) => `${Math.round(v)}`} />
          </div>
          <button className={`iconbtn ${muted ? 'is-on' : ''}`} onClick={() => setMuted((v) => !v)} aria-label="静音">
            <Icon name={muted ? 'mute' : 'volume'} size={16} />
          </button>
        </div>
      </div>

      <Section title="拍号与 subdivision">
        <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="mute" style={{ fontSize: 12 }}>
              每小节拍数
            </span>
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} className={`chip ${beats === n ? 'is-on' : ''}`} onClick={() => setBeats(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="row">
            <span className="mute" style={{ fontSize: 12 }}>
              后半拍提示
            </span>
            <Toggle on={sub} onChange={setSub} />
          </div>
        </div>
        <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
          6/8、12/8 这类曲子：拍数设 2 或 4、打开后半拍提示，把它当「一个大拍里的两小拍」来练最稳。
        </p>
      </Section>

      <Section title="常用速度">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((v) => (
            <button key={v} className={`chip ${bpm === v ? 'is-on' : ''}`} onClick={() => setBpm(v)}>
              {v}
            </button>
          ))}
        </div>
      </Section>

      {current && (
        <Section title="按当前曲目载入速度" subtitle={current.title}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => setBpm(current.bpm)}>
              <Icon name="metro" size={15} /> 载入 {current.bpm} BPM
            </button>
            <span className="mute" style={{ fontSize: 12 }}>
              《{current.title}》标注 {current.bpm} BPM · 全曲约{' '}
              {Math.round((current.duration * current.bpm) / 60 / 4)} 小节（按 4/4 估算）
            </span>
          </div>
        </Section>
      )}

      <Section title="曲库速度参考" subtitle="点一下直接载入">
        {hot.length === 0 ? (
          <Empty text="曲库为空" />
        ) : (
          <div className="chips">
            {hot.map((s) => (
              <button key={s.id} className="chip" onClick={() => setBpm(s.bpm)} title={`难度 ${s.difficulty} · ${s.key}`}>
                <span className="nowrap" style={{ maxWidth: 150 }}>
                  {s.title}
                </span>
                <b className="mono" style={{ color: 'var(--gold)' }}>
                  {s.bpm}
                </b>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
