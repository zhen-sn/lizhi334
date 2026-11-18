import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Section, Toggle, DemoNotice } from '../components/common/Primitives'
import { ChordDiagram } from '../components/tools/ChordDiagram'
import { chordMap } from '../data/chords'
import { analyze, startMic, freqToMidi, midiToCents, type MicSession } from '../lib/pitch'
import { midiToFreq, STANDARD_TUNING, midiToName } from '../lib/music'
import { tone, ensureCtx } from '../lib/click'
import { useUi } from '../store/ui'

interface Reading {
  freq: number
  midi: number
  cents: number
  clarity: number
}

const REFS = [438, 440, 442, 443]

export default function Tuner() {
  const [listening, setListening] = useState(false)
  const [manual, setManual] = useState(false)
  const [err, setErr] = useState('')
  const [refA4, setRefA4] = useState(440)
  const [smooth, setSmooth] = useState(true)
  const [rd, setRd] = useState<Reading | null>(null)
  const [inputFreq, setInputFreq] = useState(329.63)

  const sess = useRef<MicSession | null>(null)
  const hist = useRef<Reading[]>([])
  const push = useUi((s) => s.push)

  useEffect(() => () => sess.current?.stop(), [])

  const toggleMic = async () => {
    if (sess.current) {
      sess.current.stop()
      sess.current = null
      setListening(false)
      setRd(null)
      return
    }
    setErr('')
    const s = await startMic((buf, sr) => {
      const r = analyze(buf, sr, refA4)
      if (!r) {
        hist.current = []
        setRd(null)
        return
      }
      const item: Reading = { freq: r.freq, midi: r.midi, cents: r.cents, clarity: r.clarity }
      if (smooth) {
        hist.current = [...hist.current.slice(-5), item]
        const n = hist.current.length
        const avg = (f: (x: Reading) => number) => hist.current.reduce((a, b) => a + f(b), 0) / n
        // 频率/音分取滑动平均，音名仍以当前帧为准（避免平均后跨半音抖动）
        setRd({ freq: avg((x) => x.freq), midi: item.midi, cents: avg((x) => x.cents), clarity: avg((x) => x.clarity) })
      } else {
        setRd(item)
      }
    })
    if (!s) {
      setErr('拿不到麦克风。浏览器要求 HTTPS（或 localhost）且需要你授权；可以先用下面的「手动 / 参照音」模式。')
      setManual(true)
      return
    }
    sess.current = s
    setListening(true)
  }

  // 手动模式下的读数由输入频率推导
  const manualReading: Reading | null = (() => {
    if (!manual) return null
    const midi = freqToMidi((inputFreq * refA4) / 440)
    return { freq: inputFreq, midi, cents: midiToCents((inputFreq * refA4) / 440, midi), clarity: 1 }
  })()

  const reading = manual ? manualReading : rd
  const cents = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0
  const inTune = !!reading && Math.abs(reading.cents) < 5
  const noteName = reading ? midiToName(Math.round(reading.midi)) : '—'

  const nearestString = reading
    ? [...STANDARD_TUNING].sort((a, b) => Math.abs(a.midi - reading.midi) - Math.abs(b.midi - reading.midi))[0]
    : undefined

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/tools" className="mute">
          工具
        </Link>
        <Icon name="right" size={12} />
        <span>调音器</span>
      </div>

      <header className="page-head">
        <h1>调音器</h1>
        <p>自相关（ACF）测基频，纯前端实现；也可以只把它当六弦参照音使用。</p>
      </header>

      <div className="card metro" style={{ gap: 16 }}>
        <div className="tuner__needle">
          <svg viewBox="0 0 220 110" width="220" height="110" aria-hidden="true">
            <path className="tuner__arc" d="M18 104 A 92 92 0 0 1 202 104" />
            {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((c) => {
              const a = (c / 50) * 78
              const r1 = c === 0 ? 66 : 74
              const rad = ((a - 90) * Math.PI) / 180
              return (
                <line
                  key={c}
                  x1={110 + Math.cos(rad) * r1}
                  y1={104 + Math.sin(rad) * r1}
                  x2={110 + Math.cos(rad) * 88}
                  y2={104 + Math.sin(rad) * 88}
                  stroke={c === 0 ? 'var(--gold)' : 'var(--bg-3)'}
                  strokeWidth={c === 0 ? 2.4 : 1.2}
                />
              )
            })}
          </svg>
          <div
            className="tuner__hand"
            style={{
              transform: `translateX(-50%) rotate(${cents * 1.56}deg)`,
              background: inTune ? 'var(--teal)' : 'var(--rust)',
            }}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: 46, lineHeight: 1.1, color: inTune ? 'var(--teal)' : 'var(--fg)' }}>
            {noteName}
          </div>
          <div className="mono mute" style={{ fontSize: 12 }}>
            {reading ? `${reading.freq.toFixed(2)} Hz · ${cents > 0 ? '+' : ''}${cents.toFixed(1)} 音分` : '等待信号…'}
          </div>
          <div className={`mono ${inTune ? 'tuner__in' : 'mute'}`} style={{ fontSize: 12, marginTop: 6 }}>
            {reading ? (inTune ? '已对准' : cents < 0 ? '偏低，拧紧一点' : '偏高，放松一点') : manual ? '手动模式' : '未接收声音'}
          </div>
        </div>

        {reading && (
          <div style={{ width: '100%', maxWidth: 300 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11 }} >
              <span className="mute">信号强度</span>
              <span className="mono mute">{Math.round(Math.min(1, reading.clarity) * 100)}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, reading.clarity * 100)}%`, height: '100%', background: 'var(--gold)' }} />
            </div>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {!manual && (
            <button className={`btn ${listening ? '' : 'btn--primary'}`} onClick={toggleMic}>
              <Icon name="mic" size={15} /> {listening ? '停止接收' : '开始测音'}
            </button>
          )}
          <div className="row" style={{ gap: 8 }}>
            <span className="mute" style={{ fontSize: 12 }}>
              手动模式
            </span>
            <Toggle
              on={manual}
              onChange={(v) => {
                setManual(v)
                if (v && sess.current) {
                  sess.current.stop()
                  sess.current = null
                  setListening(false)
                }
              }}
            />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="mute" style={{ fontSize: 12 }}>
              平滑
            </span>
            <Toggle on={smooth} onChange={setSmooth} />
          </div>
        </div>

        {err && (
          <div className="notice" style={{ marginBottom: 0, maxWidth: 560 }}>
            <Icon name="info" size={16} />
            <div>{err}</div>
          </div>
        )}
      </div>

      {manual && (
        <Section title="手动输入频率" subtitle="用于查某个音到底差多少音分">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input
              className="inputlike"
              style={{ maxWidth: 160 }}
              type="number"
              step={0.01}
              min={20}
              max={2000}
              value={inputFreq}
              onChange={(e) => setInputFreq(Number(e.target.value) || 0)}
            />
            <div className="chips">
              {STANDARD_TUNING.map((s) => (
                <button key={s.string} className="chip" onClick={() => setInputFreq(Number(midiToFreq(s.midi).toFixed(2)))}>
                  {s.string} 弦 · {s.note}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section title="六弦参照音" subtitle="点一下听标准音，拧到指针居中即可">
        <div className="list">
          {STANDARD_TUNING.map((s) => {
            const f = midiToFreq(s.midi)
            const active = nearestString?.string === s.string && !manual
            return (
              <div
                key={s.string}
                className={`srow ${active ? 'is-current' : ''}`}
                style={{ gridTemplateColumns: '60px 90px 120px 1fr', height: 50 }}
              >
                <span className="srow__idx">{s.string} 弦</span>
                <b className="mono">{s.note}</b>
                <span className="mono mute" style={{ fontSize: 12 }}>
                  {f.toFixed(2)} Hz
                </span>
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {active && (
                    <span className="gold" style={{ fontSize: 11 }}>
                      最接近这个音
                    </span>
                  )}
                  <button
                    className="btn"
                    style={{ height: 30, padding: '0 14px' }}
                    onClick={() => {
                      ensureCtx()
                      tone(f, 1.4)
                      push(`播放 ${s.note}（${f.toFixed(1)}Hz）`, 'info')
                    }}
                  >
                    <Icon name="volume" size={14} /> 听
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="标准音参照（A4）">
        <div className="chips">
          {REFS.map((v) => (
            <button key={v} className={`chip ${refA4 === v ? 'is-on' : ''}`} onClick={() => setRefA4(v)}>
              A4 = {v} Hz
            </button>
          ))}
        </div>
        <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
          乐队/其它录音版本常用 440 或 442；现场老设备偶见 438。选错参照会导致整体偏差几个音分。
        </p>
      </Section>

      <Section title="调准之后先按这几个和弦" subtitle="开放弦校准后 C / G / Em 应该最干净">
        <div className="chord-grid">
          {['C', 'G', 'Em', 'Am'].map((n) =>
            chordMap[n] ? (
              <div className="chord" key={n}>
                <ChordDiagram shape={chordMap[n]} width={80} />
              </div>
            ) : null,
          )}
        </div>
      </Section>

      <DemoNotice>
        测音算法为前端自相关实现，适合木吉他空弦与长音；拨片噪音、泛音与很低的 6 弦在嘈杂环境下可能判读失败，属正常现象。
      </DemoNotice>
    </div>
  )
}
