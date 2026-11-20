import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs'
import { albumMap } from '../data/albums'
import { Icon } from '../components/common/Icon'
import { Section, Stat } from '../components/common/Primitives'
import { GUITAR_FRIENDLY, NOTE_NAMES, capoSuggest, keySemitone, parseKey } from '../lib/music'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/** 调内各级和弦：小调按其关系大调取音，再套用对应性质 */
function diatonic(key: string) {
  const { semitone, suffix } = parseKey(key)
  const minor = suffix.startsWith('m') && !suffix.startsWith('maj')
  const root = minor ? (semitone + 3) % 12 : semitone
  const qualities = minor
    ? ['m', 'dim', '', 'm', '', 'maj', 'dim']
    : ['', 'm', 'm', '', '', 'm', 'dim']
  const offsets = [0, 2, 4, 5, 7, 9, 11]
  return offsets.map((o, i) => ({
    roman: ROMAN[i],
    name: NOTE_NAMES[(root + o) % 12] + qualities[i],
  }))
}

const KEYS = [...NOTE_NAMES.map((n) => n), ...NOTE_NAMES.map((n) => n + 'm')]

export default function Capo() {
  const [target, setTarget] = useState('A')
  const [songId, setSongId] = useState('')
  const bump = useLibrary((s) => s.bumpCapoCalc)
  const calcs = useLibrary((s) => s.capoCalcs)
  const push = useUi((s) => s.push)

  const song = songId ? songs.find((s) => s.id === songId) : undefined
  const res = useMemo(() => capoSuggest(target, song?.key), [target, song])
  const targetRow = useMemo(() => diatonic(target), [target])
  const shapeRow = useMemo(() => diatonic(res.shape), [res.shape])

  const sameShape = useMemo(
    () =>
      songs
        .filter((s) => capoSuggest(s.key).shape === res.shape)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10),
    [res.shape],
  )

  const record = () => {
    bump()
    useLibrary.getState().checkAchievements()
    push(`已记录：${target} 调 → ${res.shape} 指型 · Capo ${res.capo}`, 'good')
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/tools" className="mute">
          工具
        </Link>
        <Icon name="right" size={12} />
        <span>变调夹计算器</span>
      </div>

      <header className="page-head">
        <h1>变调夹计算器</h1>
        <p>先决定你唱哪个调最舒服，再让工具告诉你手上该按哪套指型、夹第几品。</p>
      </header>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 18, marginBottom: 16 }}>
          <div>
            <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>
              我想唱的调
            </div>
            <div className="chips">
              {KEYS.map((k) => (
                <button
                  key={k}
                  className={`chip ${target === k ? 'is-on' : ''}`}
                  onClick={() => setTarget(k)}
                  title={GUITAR_FRIENDLY.includes(k) ? '吉他友好指型，可不夹' : undefined}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="row" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>
              参考曲目（可选，用来算比原曲升/降了几度）
            </div>
            <select className="select" style={{ width: '100%', height: 38 }} value={songId} onChange={(e) => setSongId(e.target.value)}>
              <option value="">不指定原曲</option>
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}（原调 {s.key} · Capo {s.capo}）
                </option>
              ))}
            </select>
          </div>
          <div style={{ paddingTop: 20 }}>
            <button className="btn btn--primary" onClick={record}>
              <Icon name="check" size={15} /> 换算并记录
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 26, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div className="mute" style={{ fontSize: 12 }}>
              你唱的调
            </div>
            <div className="serif" style={{ fontSize: 40, lineHeight: 1.2, color: 'var(--gold)' }}>
              {target}
            </div>
          </div>
          <Icon name="right" size={22} style={{ color: 'var(--fg-3)', marginTop: 26 }} />
          <div>
            <div className="mute" style={{ fontSize: 12 }}>
              手上按的指型
            </div>
            <div className="serif" style={{ fontSize: 40, lineHeight: 1.2 }}>
              {res.shape}
            </div>
          </div>
          <div>
            <div className="mute" style={{ fontSize: 12 }}>
              变调夹
            </div>
            <div className="serif" style={{ fontSize: 40, lineHeight: 1.2 }}>
              {res.capo === 0 ? '不夹' : `${res.capo} 品`}
            </div>
          </div>
          {song && (
            <div>
              <div className="mute" style={{ fontSize: 12 }}>
                相对《{song.title}》
              </div>
              <div className="serif" style={{ fontSize: 26, lineHeight: 1.5 }}>
                {res.upBy === 0 ? '同度' : `升 ${res.upBy} 个半音`}
              </div>
              <div className="mute mono" style={{ fontSize: 11 }}>
                原调 {song.key} → {target}
              </div>
            </div>
          )}
        </div>

        <p className="mute" style={{ fontSize: 12.5, marginTop: 14 }}>
          {res.capo === 0
            ? '这个调本身就有顺手指型，不夹也能弹；注意高把位横按会更吃力。'
            : `把 Capo 夹在第 ${res.capo} 品，然后用 ${res.shape} 调的谱子弹，实际发出的就是 ${target} 调。`}
          Capo 越高音色越亮也越薄，超过 5 品建议换一套指型或直接移调编曲。
        </p>
      </div>

      <Section title="调内各级对照表" subtitle={`谱上写 ${target} 调 → 你按 ${res.shape} 调指型`}>
        <div className="list">
          <div className="list__head" style={{ gridTemplateColumns: '70px 1fr 1fr 120px' }}>
            <span style={{ textAlign: 'center' }}>级数</span>
            <span>实际音高（{target}）</span>
            <span>手上按法（{res.shape}）</span>
            <span style={{ textAlign: 'right' }}>相差</span>
          </div>
          {targetRow.map((t, i) => (
            <div key={t.roman} className="srow" style={{ gridTemplateColumns: '70px 1fr 1fr 120px', height: 46 }}>
              <span className="srow__idx mono">{t.roman}</span>
              <span className="mono" style={{ fontSize: 14 }}>
                {t.name}
              </span>
              <span className="mono mute" style={{ fontSize: 14 }}>
                {shapeRow[i].name}
              </span>
              <span className="mono mute" style={{ textAlign: 'right', fontSize: 12 }}>
                {res.capo ? `+${res.capo}` : '0'} 品
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 26 }}>
        <Stat value={res.capo} label="建议品位" />
        <Stat value={res.shape} label="指型" />
        <Stat value={calcs} label="累计换算次数" />
        <Stat value={GUITAR_FRIENDLY.includes(target) ? '是' : '否'} label={`${target} 是否吉他友好`} />
      </div>

      <Section title={`用 ${res.shape} 指型能直接弹的曲目`} subtitle="按热度排序">
        {sameShape.length === 0 ? (
          <p className="mute" style={{ fontSize: 12.5 }}>
            暂时没有使用同一指型的曲目。
          </p>
        ) : (
          <div className="chips">
            {sameShape.map((s) => (
              <Link key={s.id} to={`/songs/${s.id}`} className="chip" title={`${albumMap[s.albumId]?.name} · ${s.year}`}>
                <span className="nowrap" style={{ maxWidth: 170 }}>
                  {s.title}
                </span>
                <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>
                  {s.key}
                  {s.capo ? ` / Capo ${s.capo}` : ''}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="选调经验" subtitle="从原曲出发，先试这两个方向">
        <div className="card card--flat">
          {song ? (
            <ul style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--fg-2)' }}>
              <li>
                唱不上去：把 {song.key} 降到你舒适的调，再回来看该用哪个指型（多数男声降 2–4 个半音最自然，相差{' '}
                {Math.abs(((keySemitone(song.key) - keySemitone(target)) % 12 + 12) % 12)} 个半音）。
              </li>
              <li>太低没精神：整体升高时用 capo 保住开放弦音色，比直接换封闭和弦省力得多。</li>
              <li>女声唱本库这批歌，通常 Capo 3–5 + G/C 指型最舒服。</li>
            </ul>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-2)' }}>
              先在上方选一首参考曲目，这里会给出针对这首歌的具体升/降建议。
            </p>
          )}
        </div>
      </Section>

    </div>
  )
}
