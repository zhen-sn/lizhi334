import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { songs } from '../data/songs'
import { sheets, sheetMap, chordLibrary, difficultyScale, progressions } from '../data/chords'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Section, Stat } from '../components/common/Primitives'
import { ChordDiagram } from '../components/tools/ChordDiagram'
import { mmss } from '../lib/format'
import { usePlayer } from '../store/player'

const TOOLS: {
  to: string
  icon: string
  title: string
  desc: string
  meta: string
}[] = [
  {
    to: '/tools/chords',
    icon: 'guitar',
    title: '吉他谱库',
    desc: '段落和弦走向 + 指法图 + 弹奏提示，谱面不含歌词。',
    meta: `${sheets.length} 首有谱`,
  },
  {
    to: '/tools/capo',
    icon: 'music',
    title: '变调夹计算器',
    desc: '输入你想唱的调，给出最省力的指型与 Capo 品位。',
    meta: '支持 24 个调',
  },
  {
    to: '/tools/metronome',
    icon: 'metro',
    title: '节拍器',
    desc: '30–240 BPM，拍号与重音可调，附摆锤视觉打拍。',
    meta: 'WebAudio 精准计时',
  },
  {
    to: '/tools/tuner',
    icon: 'tuner',
    title: '调音器',
    desc: '麦克风实时测音高，六弦标准音参照与音分指针。',
    meta: '无麦克风可用手动模式',
  },
]

export default function Tools() {
  const nav = useNavigate()
  const currentId = usePlayer((s) => s.currentId)
  const current = currentId ? sheetMap[currentId] : undefined

  const dist = useMemo(() => {
    const n = [0, 0, 0, 0, 0, 0]
    songs.forEach((s) => (n[Math.min(5, Math.max(1, s.difficulty))] += 1))
    const max = Math.max(...n)
    return difficultyScale.map((d) => ({
      ...d,
      count: n[d.level],
      pct: Math.round((n[d.level] / max) * 100),
    }))
  }, [])

  const bpm = useMemo(() => {
    const buckets = [
      { label: '≤70', test: (b: number) => b <= 70 },
      { label: '71-85', test: (b: number) => b > 70 && b <= 85 },
      { label: '86-100', test: (b: number) => b > 85 && b <= 100 },
      { label: '101-115', test: (b: number) => b > 100 && b <= 115 },
      { label: '>115', test: (b: number) => b > 115 },
    ]
    const counts = buckets.map((b) => songs.filter((s) => b.test(s.bpm)).length)
    const max = Math.max(...counts)
    return buckets.map((b, i) => ({ label: b.label, count: counts[i], pct: Math.round((counts[i] / max) * 100) }))
  }, [])

  const withCapo = songs.filter((s) => s.capo > 0).length

  return (
    <div>
      <header className="page-head">
        <h1>工具 · 弹唱工作台</h1>
        <p>把「想翻唱一首」到「能上台」之间的所有查表工作，都放在这一页。</p>
      </header>

      <div className="tool-hero">
        <span className="tool-hero__ic">
          <Icon name="guitar" size={22} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>为吉他弹唱准备</div>
          <div className="mute" style={{ fontSize: 12 }}>
            谱面只给和弦走向与段落标记，不复制任何歌词文本；需要对照歌词时，请在设置里绑定自有歌词文件。
          </div>
        </div>
      </div>

      <div className="grid grid--tools" style={{ marginBottom: 30 }}>
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="toolcard">
            <span className="toolcard__ic">
              <Icon name={t.icon} size={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
              <span className="gold" style={{ fontSize: 11 }}>
                {t.meta}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {current && (
        <Section title="接着练这首" subtitle="取自当前播放曲目">
          <Link to={`/tools/chords/${current.songId}`} className="card card--hover row" style={{ gap: 16 }}>
            <Cover seed={songs.find((s) => s.id === current.songId)?.title ?? ''} title={current.songId} size={76} glyphSize={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{songs.find((s) => s.id === current.songId)?.title}</div>
              <div className="mute" style={{ fontSize: 12 }}>
                {current.tuning} · {current.tempoMark} · {current.levelText}
              </div>
            </div>
            <div className="spacer" />
            <Icon name="right" size={16} />
          </Link>
        </Section>
      )}


      <Section title="和弦指法速览" more="打开完整谱库" onMore={() => nav('/tools/chords')}>
        <div className="chord-grid">
          {chordLibrary.slice(0, 12).map((c) => (
            <div className="chord" key={c.name}>
              <ChordDiagram shape={c} width={78} />
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}
