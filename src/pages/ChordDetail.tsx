import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { sheetMap, chordMap, sheets } from '../data/chords'
import { songMap, albumMap } from '../data'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Level, Empty, Section, DemoNotice, Stat, Toggle } from '../components/common/Primitives'
import { ChordDiagram } from '../components/tools/ChordDiagram'
import { mmss } from '../lib/format'
import { midiToFreq, parseKey, shiftKey } from '../lib/music'
import { tone } from '../lib/click'
import { copyText, download } from '../lib/share'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'

/** 移调：支持 D/F# 这类 slash 和弦 */
function transpose(chord: string, n: number) {
  if (!n) return chord
  const [head, bass] = chord.split('/')
  const t = shiftKey(head, n)
  return bass ? `${t}/${shiftKey(bass, n)}` : t
}

export default function ChordDetail() {
  const { songId = '' } = useParams()
  const song = songMap[songId]
  const sheet = sheetMap[songId]
  const [shift, setShift] = useState(0)
  const [lyricRows, setLyricRows] = useState(true)
  const [fontBig, setFontBig] = useState(false)
  const push = useUi((s) => s.push)
  const act = useSongActions()

  const idx = sheets.findIndex((s) => s.songId === songId)
  const prevSheet = idx > 0 ? sheets[idx - 1] : undefined
  const nextSheet = idx >= 0 && idx < sheets.length - 1 ? sheets[idx + 1] : undefined

  const displayKey = useMemo(() => (song ? shiftKey(song.key, shift) : ''), [song, shift])

  if (!song || !sheet) {
    return (
      <Empty
        text="这首曲目还没有谱面"
        hint={song ? `《${song.title}》尚未录入段落走向` : `编号「${songId}」不存在`}
        action={
          <div className="row">
            <Link to="/tools/chords" className="btn btn--primary">
              去谱库
            </Link>
            {song && (
              <Link to={`/songs/${song.id}`} className="btn">
                曲目详情
              </Link>
            )}
          </div>
        }
      />
    )
  }

  const album = albumMap[song.albumId]

  const plainText = [
    `${song.title}  —  ${sheet.tuning}`,
    `${sheet.tempoMark} · 原调 ${song.key} · Capo ${song.capo || 0} · 难度 ${song.difficulty}/5`,
    '',
    `【前奏】 ${sheet.intro.map((c) => transpose(c, shift)).join('  ')}`,
    '',
    ...sheet.sections.map(
      (sec) =>
        `【${sec.name}】（${sec.lines} 句）\n${sec.chords.map((c) => transpose(c, shift)).join('  ')}`,
    ),
    '',
    ...sheet.tips.map((t) => `· ${t}`),
    '',
    '（谱面只含和弦走向，不含歌词）',
  ].join('\n')

  const previewRoot = (name: string) => {
    const { semitone } = parseKey(name)
    tone(midiToFreq(48 + semitone), 0.9)
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/tools" className="mute">
          工具
        </Link>
        <Icon name="right" size={12} />
        <Link to="/tools/chords" className="mute">
          谱库
        </Link>
        <Icon name="right" size={12} />
        <span className="nowrap">{song.title}</span>
      </div>

      <div className="album-hero" style={{ gridTemplateColumns: '168px 1fr', gap: 24, marginBottom: 24 }}>
        <Cover seed={song.title} title={song.title} year={song.year} size={168} glyphSize={54} />
        <div style={{ minWidth: 0 }}>
          <h1 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>
            {song.title}
            <span className="mute" style={{ fontSize: 15, marginLeft: 8 }}>
              谱
            </span>
          </h1>
          <div className="mute" style={{ fontSize: 12.5, marginBottom: 12 }}>
            {sheet.tuning} · {sheet.tempoMark} · {sheet.levelText}
          </div>
          <div className="chips" style={{ marginBottom: 14 }}>
            <span className="tag mono">原调 {song.key}</span>
            <span className="tag mono">现显示 {displayKey}</span>
            <span className="tag mono">Capo {song.capo || 0}</span>
            <span className="tag mono">{song.bpm} BPM</span>
            <span className="tag">
              <Level n={song.difficulty} />
            </span>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => act.playSong(song.id, album?.songIds)}>
              <Icon name="play" size={15} /> 播放原曲
            </button>
            <Link to={`/tools/metronome?bpm=${song.bpm}`} className="btn">
              <Icon name="metro" size={15} /> 用节拍器练（{song.bpm}）
            </Link>
            <Link to="/tools/tuner" className="btn">
              <Icon name="tuner" size={15} /> 调音
            </Link>
            <Link to={`/songs/${song.id}`} className="btn">
              <Icon name="music" size={15} /> 曲目详情
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- 控制条 ---------- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
          <div className="row">
            <span className="mute" style={{ fontSize: 12 }}>
              移调
            </span>
            <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setShift((v) => Math.max(-6, v - 1))} aria-label="降半音">
              <Icon name="minus" size={15} />
            </button>
            <span className="mono" style={{ minWidth: 62, textAlign: 'center' }}>
              {shift > 0 ? `+${shift}` : shift} 半音
            </span>
            <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setShift((v) => Math.min(7, v + 1))} aria-label="升半音">
              <Icon name="plus" size={15} />
            </button>
            {shift !== 0 && (
              <button className="btn" style={{ height: 28, padding: '0 10px' }} onClick={() => setShift(0)}>
                复原
              </button>
            )}
          </div>

          <div className="row">
            <span className="mute" style={{ fontSize: 12 }}>
              大号字体
            </span>
            <Toggle on={fontBig} onChange={setFontBig} />
          </div>

          <div className="row">
            <span className="mute" style={{ fontSize: 12 }}>
              留出填词行
            </span>
            <Toggle on={lyricRows} onChange={setLyricRows} />
          </div>

          <div className="spacer" />

          <button
            className="btn"
            onClick={async () => {
              const ok = await copyText(plainText)
              push(ok ? '谱面文本已复制' : '复制失败', ok ? 'good' : 'info')
            }}
          >
            <Icon name="list" size={15} /> 复制谱面
          </button>
          <button
            className="btn"
            onClick={() => {
              const url = `data:text/plain;charset=utf-8,${encodeURIComponent(plainText)}`
              download(url, `${song.id}-chart.txt`)
              push('已导出 txt', 'good')
            }}
          >
            <Icon name="download" size={15} /> 导出
          </button>
        </div>
        <p className="mute" style={{ fontSize: 11.5, marginTop: 10 }}>
          移调只改变和弦名显示，指法图按原库给出；若整首移调，记得同步调整 Capo 品位（可用变调夹工具换算）。
        </p>
      </div>

      {/* ---------- 段落 ---------- */}
      <Section title="段落走向" subtitle={`${sheet.sections.length} 个段落`}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card card--flat">
            <div className="row" style={{ marginBottom: 10 }}>
              <b style={{ fontSize: 13 }}>前奏</b>
              <div className="spacer" />
              <span className="mute mono" style={{ fontSize: 11 }}>
                {sheet.intro.length} 小节
              </span>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {sheet.intro.map((c, i) => (
                <ChordTag key={i} name={transpose(c, shift)} onPreview={() => previewRoot(c)} big={fontBig} />
              ))}
            </div>
          </div>

          {sheet.sections.map((sec, si) => (
            <div className="card card--flat" key={sec.name + si}>
              <div className="row" style={{ marginBottom: 10 }}>
                <b style={{ fontSize: 13 }}>{sec.name}</b>
                <span className="mute" style={{ fontSize: 11 }}>
                  {sec.chords.length} 个和弦 · {sec.lines} 句
                </span>
                <div className="spacer" />
                <button
                  className="btn"
                  style={{ height: 26, padding: '0 10px', fontSize: 12 }}
                  onClick={() => previewRoot(sec.chords[0])}
                  title="听这一段第一个和弦的根音"
                >
                  <Icon name="volume" size={13} /> 起音
                </button>
              </div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {sec.chords.map((c, i) => (
                  <ChordTag key={i} name={transpose(c, shift)} onPreview={() => previewRoot(c)} big={fontBig} />
                ))}
              </div>
              {lyricRows && (
                <div style={{ marginTop: 12, display: 'grid', gap: 9 }}>
                  {Array.from({ length: sec.lines }).map((_, i) => (
                    <div
                      key={i}
                      className="mute"
                      style={{
                        fontSize: 12,
                        borderBottom: '1px dashed var(--line-2)',
                        paddingBottom: 3,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {`第 ${i + 1} 句 —— 在此填入你已授权的歌词`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- 用到的和弦 ---------- */}
      <Section title="本曲用到的和弦" subtitle="点指法图可听根音">
        <div className="chord-grid">
          {sheet.usedChords.map((name) => {
            const shape = chordMap[name]
            return (
              <div className="chord" key={name}>
                {shape ? (
                  <button style={{ width: '100%' }} onClick={() => previewRoot(name)} title="试听根音">
                    <ChordDiagram shape={shape} width={86} />
                  </button>
                ) : (
                  <div>
                    <div className="chord__name">{name}</div>
                    <div className="mute" style={{ fontSize: 11 }}>
                      指法图待录入
                    </div>
                  </div>
                )}
                <div className="mute mono" style={{ fontSize: 11, marginTop: 6 }}>
                  {name}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ---------- 提示 ---------- */}
      <Section title="弹奏提示">
        <div className="list">
          {sheet.tips.map((t, i) => (
            <div key={i} className="srow" style={{ gridTemplateColumns: '34px 1fr', height: 'auto', padding: '12px 16px', cursor: 'default' }}>
              <span className="srow__idx">{i + 1}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{t}</span>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14, marginBottom: 26 }}>
        <Stat value={sheet.sections.length} label="段落" />
        <Stat value={sheet.usedChords.length} label="和弦" />
        <Stat value={`${song.bpm}`} label="BPM" />
        <Stat value={mmss(song.duration)} label="时长" />
      </div>

      <DemoNotice>
        和弦走向、段落与小节数为估算占位，仅供演示排版；请对照官方总谱校订后再对外使用。
      </DemoNotice>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        {prevSheet ? (
          <Link to={`/tools/chords/${prevSheet.songId}`} className="btn">
            <Icon name="prev" size={15} /> {songMap[prevSheet.songId]?.title}
          </Link>
        ) : (
          <span />
        )}
        {nextSheet ? (
          <Link to={`/tools/chords/${nextSheet.songId}`} className="btn">
            {songMap[nextSheet.songId]?.title} <Icon name="next" size={15} />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function ChordTag({
  name,
  onPreview,
  big,
}: {
  name: string
  onPreview: () => void
  big?: boolean
}) {
  return (
    <button
      className="chip"
      onClick={onPreview}
      title="试听根音"
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        height: big ? 44 : 32,
        fontSize: big ? 19 : 14,
        padding: `0 ${big ? 20 : 14}px`,
      }}
    >
      {name}
    </button>
  )
}
