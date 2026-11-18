import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { songs, songMap } from '../data/songs'
import { albumMap } from '../data/albums'
import { sheets, sheetMap, chordLibrary, difficultyScale } from '../data/chords'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Chips, Empty, Level, Section, DemoNotice, Tabs } from '../components/common/Primitives'
import { ChordDiagram } from '../components/tools/ChordDiagram'
import { mmss } from '../lib/format'
import { useSongActions } from '../hooks/useSongActions'
import type { Song } from '../data/types'

type Tab = 'sheets' | 'missing' | 'library'

const QUALITY_LABEL: Record<string, string> = {
  major: '大三和弦',
  minor: '小三和弦',
  seventh: '属七和弦',
  minor7: '小七和弦',
  add9: '加九和弦',
  sus: '挂留和弦',
}

export default function Chords() {
  const [tab, setTab] = useState<Tab>('sheets')
  const [level, setLevel] = useState<string>('all')
  const nav = useNavigate()
  const act = useSongActions()

  const missing = useMemo(() => songs.filter((s) => !sheetMap[s.id]), [])

  const rows = useMemo(() => {
    const out = sheets
      .map((sh) => ({ sh, song: songMap[sh.songId] }))
      .filter((r): r is { sh: (typeof sheets)[number]; song: Song } => !!r.song)
    return level === 'all' ? out : out.filter((r) => String(r.song.difficulty) === level)
  }, [level])

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/tools" className="mute">
          工具
        </Link>
        <Icon name="right" size={12} />
        <span>吉他谱库</span>
      </div>

      <header className="page-head">
        <h1>吉他谱 · 和弦库</h1>
        <p>段落走向 + 指法图 + 弹奏提示。为避免版权风险，谱面不含任何歌词文本。</p>
      </header>

      <Tabs
        items={[
          { key: 'sheets', label: '有谱曲目', count: sheets.length },
          { key: 'missing', label: '待补谱曲目', count: missing.length },
          { key: 'library', label: '和弦指法', count: chordLibrary.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ height: 18 }} />

      {tab === 'sheets' && (
        <>
          <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Chips
              items={[
                { key: 'all', label: '全部难度' },
                ...difficultyScale.map((d) => ({ key: String(d.level), label: `${d.level} ${d.label}`, title: d.desc })),
              ]}
              value={level}
              onChange={setLevel}
            />
          </div>

          {rows.length === 0 ? (
            <Empty text="这个难度下还没有谱" hint="换一个难度，或去「待补谱曲目」看看清单" />
          ) : (
            <div className="list">
              {rows.map(({ sh, song }) => (
                <div
                  key={sh.songId}
                  className="srow"
                  style={{ gridTemplateColumns: '56px minmax(0,2.4fr) minmax(0,2fr) 92px 78px', height: 'auto', padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => nav(`/tools/chords/${sh.songId}`)}
                >
                  <Cover seed={song.title} title={song.title} size={48} glyphSize={17} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }} className="nowrap">
                      {song.title}
                    </div>
                    <div className="mute nowrap" style={{ fontSize: 11 }}>
                      {albumMap[song.albumId]?.name} · {song.year} · {mmss(song.duration)}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 12 }}>
                      {sh.tuning}
                    </div>
                    <div className="mute mono nowrap" style={{ fontSize: 11 }}>
                      {sh.tempoMark}
                    </div>
                  </div>
                  <div className="chips" style={{ gap: 4 }}>
                    {sh.usedChords.slice(0, 4).map((c) => (
                      <span className="tag mono" key={c}>
                        {c}
                      </span>
                    ))}
                    {sh.usedChords.length > 4 && <span className="tag">+{sh.usedChords.length - 4}</span>}
                  </div>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                    <Level n={song.difficulty} />
                    <button
                      className="iconbtn"
                      style={{ width: 28, height: 28 }}
                      aria-label="播放"
                      onClick={(e) => {
                        e.stopPropagation()
                        act.playSong(song.id)
                      }}
                    >
                      <Icon name="play" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DemoNotice>
            段落走向与弹奏提示为演示占位；正式使用时请由人工对照总谱校订，并在后台为曲目绑定已授权的歌词。
          </DemoNotice>
        </>
      )}

      {tab === 'missing' && (
        <Section title="还没有谱的曲目" subtitle={`${missing.length} 首`} more="回歌曲库" onMore={() => nav('/songs')}>
          <div className="chips" style={{ gap: 8 }}>
            {missing.map((s) => (
              <Link key={s.id} to={`/songs/${s.id}`} className="chip" title={`${s.key} · ${s.bpm} BPM · 难度 ${s.difficulty}`}>
                {s.title}
                <span className="mono" style={{ opacity: 0.6, fontSize: 11 }}>
                  {s.key}
                </span>
              </Link>
            ))}
          </div>
          <p className="mute" style={{ fontSize: 12, marginTop: 14 }}>
            后台接入后，这里会变成「待办谱面」清单，可指派给编辑并上传六线谱。
          </p>
        </Section>
      )}

      {tab === 'library' && (
        <>
          {['major', 'minor', 'seventh', 'minor7', 'add9', 'sus'].map((q) => {
            const items = chordLibrary.filter((c) => c.quality === q)
            if (!items.length) return null
            return (
              <Section key={q} title={QUALITY_LABEL[q]} subtitle={`${items.length} 个`}>
                <div className="chord-grid">
                  {items.map((c) => (
                    <div className="chord" key={c.name}>
                      <ChordDiagram shape={c} width={84} />
                      <div className="chord__name" style={{ marginTop: 6, fontSize: 12 }}>
                        {c.frets.join(' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )
          })}
          <p className="mute" style={{ fontSize: 12 }}>
            指法图由 <code>src/data/chords.ts</code> 的 frets/fingers 字段生成，改数据即可换图，不需要画任何图片。
          </p>
        </>
      )}
    </div>
  )
}
