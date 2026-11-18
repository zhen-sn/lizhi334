import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../../store/player'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { useLibrary } from '../../store/library'
import { songMap } from '../../data/songs'
import { albumMap } from '../../data/albums'
import { songsOfAlbum } from '../../data/songs'
import { sheetMap } from '../../data/chords'
import { mmss } from '../../lib/format'
import { coverStyle, coverPalette } from '../../lib/hash'
import { download, renderShareCard } from '../../lib/share'
import { activeIndex } from '../../lib/lrc'
import { Icon } from '../common/Icon'
import { Cover } from '../common/Cover'
import { Slider } from '../common/Slider'
import { Lyrics, useSongLyric } from '../lyrics/Lyrics'
import { Visualizer } from './Visualizer'
import { useSongActions } from '../../hooks/useSongActions'
import { Level } from '../common/Primitives'

type Tab = 'lyric' | 'info' | 'queue'

export function FullPlayer() {
  const open = usePlayer((s) => s.fullOpen)
  const p = usePlayer()
  const act = useSongActions()
  const showViz = useSettings((s) => s.showViz)
  const push = useUi((s) => s.push)
  const quality = useSettings((s) => s.quality)
  const setQuality = useSettings((s) => s.set)
  const counts = useLibrary((s) => s.counts)
  const [tab, setTab] = useState<Tab>('lyric')

  const song = p.currentId ? songMap[p.currentId] : undefined
  const album = song ? albumMap[song.albumId] : undefined
  const { lines } = useSongLyric(song)
  const lyricLine = song ? lines[activeIndex(lines, p.time)]?.text ?? '' : ''

  const related = useMemo(
    () => (song ? songsOfAlbum(song.albumId).filter((s) => s.id !== song.id).slice(0, 6) : []),
    [song],
  )

  if (!open || !song) return null
  const pal = coverPalette(song.title)

  return (
    <div className="full" role="dialog" aria-label="全屏播放器">
      <div
        className="full__bg"
        style={{ background: `linear-gradient(${pal.angle}deg, ${pal.from}, ${pal.to})` }}
      />
      <button className="iconbtn iconbtn--lg full__close" onClick={() => p.setFull(false)} aria-label="收起">
        <Icon name="collapse" size={20} />
      </button>

      {/* 左：封面 + 控制 */}
      <div className="full__left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26 }}>
          <Cover
            seed={song.title}
            title={song.title}
            year={song.year}
            size={210}
            glyphSize={72}
            spin={p.playing}
            className="full__cover"
          />
          <div style={{ minWidth: 0 }}>
            {showViz && <Visualizer bars={18} height={92} />}
          </div>
        </div>

        <h1 className="full__title">{song.title}</h1>
        <div className="full__album">
          李志 ·{' '}
          <Link to={`/songs/album/${album!.id}`} style={{ textDecoration: 'underline' }}>
            {album?.name}
          </Link>{' '}
          · {album?.year}
        </div>

        <Slider
          value={p.time}
          max={p.duration || song.duration}
          format={mmss}
          onScrub={(v) => p.seek(v)}
          onCommit={(v) => p.seek(v)}
          className="full__slider"
        />
        <div className="bar__time" style={{ color: 'rgba(255,255,255,.65)' }}>
          <span>{mmss(p.time)}</span>
          <span>-{mmss(Math.max(0, (p.duration || song.duration) - p.time))}</span>
        </div>

        <div className="full__ctrl">
          <button
            className="iconbtn"
            onClick={() => push(
              sheetMap[song.id] ? '这首歌有谱，去「工具 · 吉他谱」查看' : '这首歌暂无谱，可提交一份',
            )}
            title="查看吉他谱"
          >
            <Icon name="guitar" size={18} />
          </button>
          <button
            className={`iconbtn ${act.isFav(song.id) ? 'is-on' : ''}`}
            onClick={() => act.fav(song.id)}
          >
            <Icon name={act.isFav(song.id) ? 'heart' : 'heartLine'} size={20} />
          </button>

          <button className="iconbtn" onClick={() => p.cycleMode()} title="播放模式">
            <Icon
              name={p.mode === 'single' ? 'repeatOne' : p.mode === 'shuffle' ? 'shuffle' : 'repeat'}
              size={19}
            />
          </button>
          <button className="iconbtn iconbtn--lg" onClick={() => p.prev()} aria-label="上一首">
            <Icon name="prev" size={24} />
          </button>
          <button
            className="playbtn playbtn--xl"
            onClick={() => p.toggle()}
            aria-label={p.playing ? '暂停' : '播放'}
          >
            <Icon name={p.playing ? 'pause' : 'play'} size={28} />
          </button>
          <button className="iconbtn iconbtn--lg" onClick={() => p.next(false)} aria-label="下一首">
            <Icon name="next" size={24} />
          </button>
          <button className="iconbtn" onClick={() => p.setQueueOpen(true)} title="播放队列">
            <Icon name="list" size={19} />
          </button>

          <button
            className="iconbtn"
            title="生成分享卡"
            onClick={() => {
              const url = renderShareCard(song, album?.name ?? '', lyricLine)
              download(url, `lizhi-${song.id}.png`)
              push('分享卡已生成并下载', 'good')
            }}
          >
            <Icon name="share" size={19} />
          </button>
        </div>

      </div>

      {/* 右：歌词 / 信息 / 队列 */}
      <div className="full__right">
        <div className="tabs" style={{ borderColor: 'rgba(255,255,255,.14)' }}>
          {([['lyric', '歌词'], ['info', '曲目信息'], ['queue', '队列']] as [Tab, string][]).map(
            ([k, label]) => (
              <button
                key={k}
                className={tab === k ? 'is-on' : ''}
                style={{ color: tab === k ? undefined : 'rgba(255,255,255,.55)' }}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {tab === 'lyric' && (
          <Lyrics song={song} time={p.time} onSeek={(t) => p.seek(t)} height="60vh" />
        )}

        {tab === 'info' && (
          <div className="full__info">
            <div className="fact">
              <span>收录于</span>
              <b>{album?.name}（{album?.year}）</b>
            </div>
            <div className="fact">
              <span>时长</span>
              <b>{mmss(song.duration)}</b>
            </div>
            {song.city && (
              <div className="fact">
                <span>关联城市</span>
                <b>{song.city}</b>
              </div>
            )}
            <div className="fact">
              <span>标签</span>
              <b>{song.tags.join(' / ')}</b>
            </div>

            {sheetMap[song.id] ? (
              <Link
                to={`/tools/chords/${song.id}`}
                className="btn btn--primary"
                style={{ marginTop: 18, width: 'fit-content' }}
              >
                <Icon name="guitar" size={15} /> 查看吉他谱
              </Link>
            ) : (
              <p className="mute" style={{ marginTop: 16, fontSize: 12 }}>
                这首歌还没有谱，欢迎在「工具 · 吉他谱」里提交。
              </p>
            )}

            <h4 style={{ margin: '26px 0 10px', fontSize: 14 }}>同张专辑</h4>
            <div className="full__rel">
              {related.map((r) => (
                <button key={r.id} className="relrow" onClick={() => act.playSong(r.id)}>
                  <Cover seed={r.title} title={r.title} size={38} glyphSize={13} />
                  <span className="nowrap">{r.title}</span>
                  <span className="mono mute" style={{ fontSize: 11 }}>{mmss(r.duration)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'queue' && (
          <div className="full__queue">
            {p.queue.map((id, i) => {
              const s = songMap[id]
              if (!s) return null
              return (
                <button
                  key={id + i}
                  className={`relrow ${i === p.index ? 'is-current' : ''}`}
                  onClick={() => p.jumpTo(i)}
                >
                  <span className="mono mute" style={{ fontSize: 11, width: 20 }}>{i + 1}</span>
                  <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
                  <span className="nowrap">{s.title}</span>
                  <span className="mono mute" style={{ fontSize: 11 }}>{mmss(s.duration)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
