import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Slider } from '../components/common/Slider'
import { Lyrics, useSongLyric } from '../components/lyrics/Lyrics'
import { Visualizer } from '../components/player/Visualizer'
import { Tabs, Level, Empty } from '../components/common/Primitives'
import { Modal } from '../components/common/Overlays'
import { songMap, songsOfAlbum, songs as allSongs } from '../data/songs'
import { albumMap } from '../data/albums'
import { sheetMap } from '../data/chords'
import { humanTime, mmss } from '../lib/format'
import { coverPalette } from '../lib/hash'
import { download, renderShareCard } from '../lib/share'
import { activeIndex } from '../lib/lrc'
import { usePlayer } from '../store/player'
import { useSettings } from '../store/settings'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'
import { useSongDetail } from '../hooks/useSongDetail'
import type { Song } from '../data/types'

type Tab = 'lyric' | 'sheet' | 'info' | 'queue'

const MODE_ICON = { list: 'repeat', single: 'repeatOne', shuffle: 'shuffle' } as const
const MODE_TEXT = { list: '列表循环', single: '单曲循环', shuffle: '随机播放' } as const
const SLEEP_LABELS = ['关闭', '15 分钟', '30 分钟', '45 分钟', '60 分钟', '90 分钟']

/**
 * /player —— 页面级沉浸播放台。
 * 与底部播放条、全屏播放器共用同一个 store，只是把控制面摊开在页面里，
 * 方便一边看谱/歌词一边操作，窄屏下也不会被播放条遮挡。
 */
export default function PlayerPage() {
  const p = usePlayer()
  const act = useSongActions()
  const push = useUi((s) => s.push)
  const showViz = useSettings((s) => s.showViz)
  const counts = useLibrary((s) => s.counts)
  const lastPos = useLibrary((s) => s.lastPos)
  const [tab, setTab] = useState<Tab>('lyric')
  const [share, setShare] = useState<string | null>(null)

  const song = p.currentId ? songMap[p.currentId] : undefined
  const album = song ? albumMap[song.albumId] : undefined
  const sheet = song ? sheetMap[song.id] : undefined
  const detailReady = useSongDetail(song?.id)
  const pal = song ? coverPalette(song.title) : undefined
  const duration = p.duration || song?.duration || 0

  const nextUp = useMemo(() => {
    if (!song) return []
    const same = songsOfAlbum(song.albumId).filter((s) => s.id !== song.id)
    const near = allSongs
      .filter((s) => s.id !== song.id && !same.some((x) => x.id === s.id))
      .sort((a, b) => Math.abs(a.bpm - song.bpm) - Math.abs(b.bpm - song.bpm))
      .slice(0, 4)
    return [...same.slice(0, 6), ...near]
  }, [song])

  if (!song) {
    return (
      <div>
        <header className="page-head">
          <h1>播放台</h1>
          <p>页面级的沉浸播放界面：控制、歌词、谱与队列都在同一屏里。</p>
        </header>
        <Empty
          text="还没有正在播放的内容"
          hint="可以从曲库、每日推荐或命运模式开始。"
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/songs" className="btn btn--primary">
                浏览曲库
              </Link>
              <Link to="/random" className="btn">
                <Icon name="dice" size={15} /> 随机一首
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/songs" className="mute">
          歌曲
        </Link>
        <Icon name="right" size={12} />
        <span>播放台</span>
      </div>

      <div className="song-page">
        {/* ---------- 左：主控制 ---------- */}
        <div>
          <div
            className="card"
            style={{
              background: pal ? `linear-gradient(${pal.angle}deg, ${pal.from}, var(--bg-1) 62%)` : undefined,
              marginBottom: 22,
            }}
          >
            <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Cover seed={song.title} title={song.title} year={song.year} size={196} glyphSize={68} spin={p.playing} />
              <div style={{ minWidth: 260, flex: 1 }}>
                <div className="mute" style={{ fontSize: 11, letterSpacing: '0.24em', marginBottom: 6 }}>
                  NOW {p.playing ? 'PLAYING' : 'PAUSED'}
                </div>
                <h1 className="serif" style={{ fontSize: 30, marginBottom: 6 }}>
                  {song.title}
                </h1>
                <div className="mute" style={{ fontSize: 12.5, marginBottom: 12 }}>
                  李志 ·{' '}
                  <Link to={`/songs/album/${album?.id ?? ''}`} style={{ textDecoration: 'underline' }}>
                    {album?.name}
                  </Link>{' '}
                  · {album?.year} · 你听过 {counts[song.id] ?? 0} 次
                </div>

                <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span className="tag mono">{song.key}</span>
                  <span className="tag mono">{song.bpm} BPM</span>
                  <span className="tag mono">{song.capo ? `Capo ${song.capo}` : '不夹 Capo'}</span>
                  <Level n={song.difficulty} />
                  {p.simulated && (
                    <span className="tag" title="未检测到媒体文件，用虚拟时钟推进">
                      模拟播放
                    </span>
                  )}
                </div>

                <Slider
                  value={p.time}
                  max={duration}
                  format={mmss}
                  onScrub={(v) => p.seek(v)}
                  onCommit={(v) => p.seek(v)}
                />
                <div className="bar__time">
                  <span>{mmss(p.time)}</span>
                  <span>-{mmss(Math.max(0, duration - p.time))}</span>
                </div>

                <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 18 }}>
                  <button
                    className={`iconbtn ${p.mode !== 'list' ? 'is-on' : ''}`}
                    title={MODE_TEXT[p.mode]}
                    onClick={() => {
                      const m = p.cycleMode()
                      push(MODE_TEXT[m])
                    }}
                  >
                    <Icon name={MODE_ICON[p.mode]} size={17} />
                  </button>
                  <button className="iconbtn" onClick={() => p.prev()} aria-label="上一首">
                    <Icon name="prev" size={20} />
                  </button>
                  <button
                    className="playbtn"
                    style={{ width: 54, height: 54 }}
                    onClick={() => p.toggle()}
                    aria-label={p.playing ? '暂停' : '播放'}
                  >
                    <Icon name={p.playing ? 'pause' : 'play'} size={24} />
                  </button>
                  <button className="iconbtn" onClick={() => p.next(false)} aria-label="下一首">
                    <Icon name="next" size={20} />
                  </button>
                  <button
                    className={`iconbtn ${act.isFav(song.id) ? 'is-on' : ''}`}
                    onClick={() => act.fav(song.id)}
                    aria-label="喜欢"
                  >
                    <Icon name={act.isFav(song.id) ? 'heart' : 'heartLine'} size={18} />
                  </button>
                </div>

                <div className="row" style={{ marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ width: 120 }}>
                    <Slider
                      value={p.muted ? 0 : p.volume}
                      max={1}
                      live={false}
                      format={(v) => `${Math.round(v * 100)}%`}
                      onScrub={(v) => {
                        p.setVolume(v)
                        if (v > 0 && p.muted) p.toggleMute()
                      }}
                    />
                  </div>
                  <button
                    className="iconbtn tip"
                    data-tip={p.muted ? '取消静音' : '静音'}
                    onClick={p.toggleMute}
                    aria-label="静音"
                  >
                    <Icon name={p.muted || p.volume === 0 ? 'mute' : 'volume'} size={16} />
                  </button>

                  <select
                    className="select"
                    value={p.sleepLabel || '关闭'}
                    title="定时暂停"
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '关闭') {
                        p.stopSleep()
                        push('已取消定时暂停')
                      } else {
                        p.setSleep(v, Number(v.replace(' 分钟', '')))
                        push(`将在 ${v}后自动暂停`)
                      }
                    }}
                  >
                    {SLEEP_LABELS.map((l) => (
                      <option key={l} value={l}>
                        定时：{l}
                      </option>
                    ))}
                  </select>

                  <div className="spacer" />

                  <button className="btn" onClick={() => setShare(song.id)}>
                    <Icon name="share" size={15} /> 分享卡
                  </button>
                  <button className="btn" onClick={() => p.setFull(true)}>
                    <Icon name="expand" size={15} /> 全屏
                  </button>
                  <Link to={`/songs/${song.id}`} className="btn">
                    曲目详情
                  </Link>
                </div>

                {lastPos[song.id] && lastPos[song.id] > 5 && !p.playing && (
                  <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>
                    上次停在 {mmss(lastPos[song.id])}（约 {Math.round((lastPos[song.id] / duration) * 100)}%）。可在设置里关闭「自动续播」。
                  </p>
                )}
              </div>

              {showViz && (
                <div style={{ marginLeft: 'auto' }}>
                  <Visualizer bars={14} height={120} />
                </div>
              )}
            </div>
          </div>

          <Tabs
            items={[
              { key: 'lyric', label: '歌词' },
              { key: 'sheet', label: '和弦', count: sheet?.sections?.length ?? 0 },
              { key: 'info', label: '信息' },
              { key: 'queue', label: '队列', count: p.queue.length },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'lyric' && <Lyrics song={song} time={p.time} onSeek={(t) => p.seek(t)} height="46vh" />}

          {tab === 'sheet' &&
            (!sheet ? (
              <Empty
                text="这首歌还没有谱"
                hint="曲库里已录入和弦谱的曲目会在工具页标出。"
                action={
                  <Link to="/tools/chords" className="btn btn--primary">
                    去谱库看看
                  </Link>
                }
              />
            ) : !detailReady ? (
              <div className="mute" style={{ padding: 32 }}>
                谱面加载中…
              </div>
            ) : !Array.isArray(sheet.sections) ? (
              <Empty
                text="谱面内容加载失败"
                hint="请检查网络后刷新重试。"
                action={
                  <Link to="/tools/chords" className="btn btn--primary">
                    去谱库看看
                  </Link>
                }
              />
            ) : (
              <div className="card card--flat">
                <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <span className="tag mono">{sheet.tuning}</span>
                  <span className="tag mono">{sheet.tempoMark}</span>
                  <span className="mute" style={{ fontSize: 12 }}>
                    {sheet.levelText}
                  </span>
                  <div className="spacer" />
                  <Link to={`/tools/chords/${song.id}`} className="btn">
                    打开完整谱 <Icon name="right" size={14} />
                  </Link>
                </div>
                {sheet.sections.map((sec) => (
                  <div key={sec.name} style={{ marginBottom: 14 }}>
                    <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>
                      {sec.name}
                    </div>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {sec.chords.map((c, i) => (
                        <span className="tag mono" key={`${sec.name}-${c}-${i}`}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'info' && (
            <div className="card card--flat">
              <div className="fact">
                <span>收录于</span>
                <b>
                  {album?.name}（{album?.year}）
                </b>
              </div>
              <div className="fact">
                <span>时长</span>
                <b className="mono">{mmss(song.duration)}</b>
              </div>
              <div className="fact">
                <span>速度 / 原调 / Capo</span>
                <b className="mono">
                  {song.bpm} BPM · {song.key} · {song.capo || '不夹'}
                </b>
              </div>
              <div className="fact">
                <span>弹唱难度</span>
                <b>
                  <Level n={song.difficulty} />
                </b>
              </div>
              <div className="fact">
                <span>标签</span>
                <b>{song.tags.join(' / ')}</b>
              </div>
              {song.city && (
                <div className="fact">
                  <span>关联城市</span>
                  <b>{song.city}</b>
                </div>
              )}
              <div className="fact">
                <span>播放量</span>
                <b className="mono">{song.playCount}</b>
              </div>
              <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <Link to={`/tools/metronome?bpm=${song.bpm}`} className="btn">
                  <Icon name="metro" size={15} /> 用 {song.bpm} 开节拍器
                </Link>
                <Link to="/tools/capo" className="btn">
                  <Icon name="music" size={15} /> 换算这个调
                </Link>
                <span className="tag">
                  {song.audioUrl ? '已绑定音频地址' : '模拟时钟（把 mp3 放进 public/media/audio 即可）'}
                </span>
              </div>
            </div>
          )}

          {tab === 'queue' && (
            <div className="list">
              <div className="list__head" style={{ gridTemplateColumns: '40px minmax(0,3fr) 80px 110px' }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span>播放队列</span>
                <span style={{ textAlign: 'right' }}>时长</span>
                <span style={{ textAlign: 'right' }}>调整</span>
              </div>
              {p.queue.map((id, i) => {
                const s = songMap[id]
                if (!s) return null
                return (
                  <div
                    key={`${id}-${i}`}
                    className={`srow ${i === p.index ? 'is-current' : ''}`}
                    style={{ gridTemplateColumns: '40px minmax(0,3fr) 80px 110px', height: 48 }}
                    onClick={() => p.jumpTo(i)}
                  >
                    <span className="srow__idx">{i + 1}</span>
                    <div className="srow__title">
                      <Cover seed={s.title} title={s.title} size={30} glyphSize={11} />
                      <span className="nowrap" style={{ fontSize: 13 }}>
                        {s.title}
                      </span>
                    </div>
                    <span className="mono mute" style={{ textAlign: 'right', fontSize: 12 }}>
                      {mmss(s.duration)}
                    </span>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 2, opacity: 1 }}>
                      <button
                        className="iconbtn"
                        style={{ width: 28, height: 28 }}
                        disabled={i === 0}
                        title="上移"
                        aria-label="上移"
                        onClick={(e) => {
                          e.stopPropagation()
                          p.reorder(i, i - 1)
                        }}
                      >
                        <Icon name="up" size={14} />
                      </button>
                      <button
                        className="iconbtn"
                        style={{ width: 28, height: 28 }}
                        disabled={i >= p.queue.length - 1}
                        title="下移"
                        aria-label="下移"
                        onClick={(e) => {
                          e.stopPropagation()
                          p.reorder(i, i + 1)
                        }}
                      >
                        <Icon name="down" size={14} />
                      </button>
                      <button
                        className="iconbtn"
                        style={{ width: 28, height: 28 }}
                        title="移出队列"
                        aria-label="移出队列"
                        onClick={(e) => {
                          e.stopPropagation()
                          p.removeAt(i)
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {p.queue.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>队列为空</div>
              )}
              <div className="row" style={{ padding: 14, gap: 10 }}>
                <span className="mute" style={{ fontSize: 12 }}>
                  共 {p.queue.length} 首 · 约 {humanTime(p.queue.reduce((a, id) => a + (songMap[id]?.duration ?? 0), 0))}
                </span>
                <div className="spacer" />
                <button className="btn" onClick={p.clearQueue}>
                  <Icon name="trash" size={15} /> 清空队列
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------- 右：接下来 & 练习建议 ---------- */}
        <aside className="song-side">
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>接下来可以听</div>
            <div className="full__rel" style={{ maxHeight: 260 }}>
              {nextUp.map((s) => (
                <button
                  key={s.id}
                  className="relrow"
                  style={{ color: 'var(--fg)' }}
                  onClick={() => act.playSong(s.id, [song.id, ...nextUp.map((x) => x.id)])}
                >
                  <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
                  <span className="nowrap">{s.title}</span>
                  <span className="mono mute" style={{ fontSize: 11 }}>
                    {mmss(s.duration)}
                  </span>
                </button>
              ))}
              {nextUp.length === 0 && (
                <p className="mute" style={{ fontSize: 12 }}>
                  这张专辑里没有其它收录曲目。
                </p>
              )}
            </div>
          </div>

          <div className="card card--flat">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>这一首适合怎么练</div>
            <ul style={{ display: 'grid', gap: 8, fontSize: 12.5, color: 'var(--fg-2)', paddingLeft: 16 }}>
              <li>先把右手稳定在 {song.bpm} BPM，倍速 0.75× 可用来慢练。</li>
              <li>
                原调 {song.key}
                {song.capo ? `，Capo ${song.capo} 品` : '，不用变调夹'}；唱不上去就用换算器换一套指型。
              </li>
              <li>
                难度 {song.difficulty}/5：
                {song.difficulty >= 4 ? '重点在横按与长段落的动态控制。' : '把力气花在语气和断句，而不是技巧。'}
              </li>
              <li>现场版本普遍比录音室长，跟着现场找断句更有效。</li>
            </ul>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <Link to="/tools/capo" className="btn" style={{ height: 32 }}>
                变调夹
              </Link>
              <Link to={sheet ? `/tools/chords/${song.id}` : '/tools/chords'} className="btn" style={{ height: 32 }}>
                谱库
              </Link>
            </div>
          </div>

        </aside>
      </div>

      {share && <ShareModal songId={share} onClose={() => setShare(null)} />}
    </div>
  )
}

/** 分享卡：把当前歌词行 + 曲目信息画成图片，纯前端 canvas，无后端 */
function ShareModal({ songId, onClose }: { songId: string; onClose: () => void }) {
  const p = usePlayer()
  const push = useUi((s) => s.push)
  const song = songMap[songId] as Song
  const album = albumMap[song.albumId]
  const { lines } = useSongLyric(song)
  const [custom, setCustom] = useState('')

  const currentLine = songId === p.currentId ? lines[activeIndex(lines, p.time)]?.text ?? '' : ''
  const url = renderShareCard(song, album?.name ?? '', custom.trim() || currentLine)

  return (
    <Modal
      title="生成分享卡"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            关闭
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              download(url, `lizhi-${song.id}.png`)
              push('分享卡已下载', 'good')
            }}
          >
            <Icon name="download" size={15} /> 下载图片
          </button>
        </>
      }
    >
      <img src={url} alt="分享卡预览" style={{ width: '100%', borderRadius: 'var(--r-md)' }} />
      <input
        className="inputlike"
        style={{ marginTop: 14 }}
        placeholder={currentLine ? `留空则使用当前这一句：${currentLine}` : '写一句你想放上去的话'}
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        maxLength={40}
      />
      <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
        也可以直接写自己的话，留空则使用当前这一句歌词。
      </p>
    </Modal>
  )
}
