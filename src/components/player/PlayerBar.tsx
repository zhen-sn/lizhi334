import { Link } from 'react-router-dom'
import { usePlayer } from '../../store/player'
import { useLibrary } from '../../store/library'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { songMap } from '../../data/songs'
import { albumMap } from '../../data/albums'
import { mmss } from '../../lib/format'
import { Icon } from '../common/Icon'
import { Cover } from '../common/Cover'
import { Slider } from '../common/Slider'
import { LyricsTicker } from '../lyrics/Lyrics'
import { useSongActions } from '../../hooks/useSongActions'
import iconUrl from '../../assets/icon.png'

const MODE_ICON = { list: 'repeat', single: 'repeatOne', shuffle: 'shuffle' } as const
const MODE_TEXT = { list: '列表循环', single: '单曲循环', shuffle: '随机播放' } as const

const SLEEPS = [
  { label: '关闭', min: 0 },
  { label: '15 分钟', min: 15 },
  { label: '30 分钟', min: 30 },
  { label: '45 分钟', min: 45 },
  { label: '60 分钟', min: 60 },
  { label: '90 分钟', min: 90 },
]

export function PlayerBar() {
  const p = usePlayer()
  const act = useSongActions()
  const showViz = useSettings((s) => s.showViz)
  const collapsed = useSettings((s) => s.barCollapsed)
  const setSettings = useSettings((s) => s.set)
  const push = useUi((s) => s.push)

  const song = p.currentId ? songMap[p.currentId] : undefined
  const album = song ? albumMap[song.albumId] : undefined
  const disabled = !song

  return (
    <footer className={`bar ${collapsed ? 'is-collapsed' : ''}`}>
      {/* 左：当前曲目 */}
      <div className="bar__track">
        {song ? (
          <Cover
            seed={song.title}
            title={song.title}
            size={52}
            glyphSize={17}
            spin={p.playing}
            onPlay={() => p.setFull(true)}
          />
        ) : (
          <img
            className="cover cover--square"
            src={iconUrl}
            alt=""
            style={{ width: 52, height: 52, objectFit: 'cover', background: 'var(--bg-3)' }}
          />
        )}
        <div className="bar__meta">
          <div className="bar__name nowrap" title={song?.title}>
            {song ? (
              <Link to={`/songs/${song.id}`}>{song.title}</Link>
            ) : (
              <span className="mute">还没有播放内容</span>
            )}
          </div>
          <div className="bar__artist nowrap">
            {album ? <Link to={`/songs/album/${album.id}`}>{album.name} · {album.year}</Link> : '李志 · 叁叁肆'}
          </div>
          {song && <LyricsTicker song={song} time={p.time} />}
        </div>
        {song && (
          <button
            className={`iconbtn ${act.isFav(song.id) ? 'is-on' : ''}`}
            onClick={() => act.fav(song.id)}
            aria-label="喜欢"
          >
            <Icon name={act.isFav(song.id) ? 'heart' : 'heartLine'} size={16} />
          </button>
        )}
      </div>

      {/* 中：控制与进度 */}
      <div className="bar__center">
        <div className="bar__buttons">
          <button
            className="iconbtn is-on"
            onClick={() => {
              const m = p.cycleMode()
              push(MODE_TEXT[m])
            }}
            aria-label="播放模式"
            title={MODE_TEXT[p.mode]}
          >
            <Icon name={MODE_ICON[p.mode]} size={16} />
          </button>
          <button className="iconbtn" onClick={() => p.prev()} aria-label="上一首" disabled={disabled}>
            <Icon name="prev" size={18} />
          </button>
          <button
            className="playbtn"
            onClick={() => p.toggle()}
            aria-label={p.playing ? '暂停' : '播放'}
          >
            <Icon name={p.playing ? 'pause' : 'play'} size={20} />
          </button>
          <button className="iconbtn" onClick={() => p.next(false)} aria-label="下一首" disabled={disabled}>
            <Icon name="next" size={18} />
          </button>
          <button
            className={`iconbtn ${p.sleepEndsAt ? 'is-on' : ''}`}
            onClick={() => {
              const i = SLEEPS.findIndex((s) => s.label === p.sleepLabel)
              const next = SLEEPS[(Math.max(i, 0) + 1) % SLEEPS.length]
              if (next.min === 0) {
                p.stopSleep()
                push('已取消定时关闭')
              } else {
                p.setSleep(next.label, next.min)
                push(`将在 ${next.label}后自动暂停`)
              }
            }}
            aria-label="定时关闭"
            title={p.sleepEndsAt ? `定时中：${p.sleepLabel}` : '定时关闭'}
          >
            <Icon name="clock" size={16} />
          </button>
        </div>

        <div className="slider__row">
          <span className="mono bar__t">{mmss(p.time)}</span>
          <Slider
            value={p.time}
            max={p.duration || song?.duration || 0}
            format={mmss}
            disabled={disabled}
            onScrub={(v) => p.seek(v)}
            onCommit={(v) => p.seek(v)}
          />
          <span className="mono bar__t">{mmss(p.duration || song?.duration || 0)}</span>
        </div>
      </div>

      {/* 右：音量与面板 */}
      <div className="bar__right">
        {p.simulated && !disabled && (
          <span className="tag" title="未检测到媒体文件，播放器正在用虚拟时钟推进进度">
            模拟
          </span>
        )}

        {showViz && (
          <div className="bar__viz">
            <Icon name="tuner" size={14} />
          </div>
        )}

        <button
          className="iconbtn tip"
          data-tip={p.muted ? '取消静音' : '静音'}
          onClick={p.toggleMute}
          aria-label="静音"
        >
          <Icon name={p.muted || p.volume === 0 ? 'mute' : 'volume'} size={16} />
        </button>
        <div className="bar__vol" style={{ width: 78 }}>
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
          className={`iconbtn ${p.queueOpen ? 'is-on' : ''}`}
          onClick={() => p.setQueueOpen(!p.queueOpen)}
          aria-label="播放队列"
          title={`播放队列（${p.queue.length}）`}
        >
          <Icon name="list" size={16} />
          {p.queue.length > 0 && <span className="badge-n">{p.queue.length}</span>}
        </button>
        <button className="iconbtn" onClick={() => p.setFull(true)} aria-label="展开">
          <Icon name="expand" size={16} />
        </button>
        {window.desktop && (
          <button
            className="iconbtn"
            onClick={() => window.desktop?.openMini()}
            aria-label="迷你播放器"
            title="迷你播放器"
          >
            <Icon name="collapse" size={16} />
          </button>
        )}
        <button
          className="iconbtn bar__toggle bar__toggle--inline"
          onClick={() => setSettings({ barCollapsed: true })}
          aria-label="收起播放条"
          title="收起播放条"
        >
          <Icon name="down" size={16} />
        </button>
      </div>

      {collapsed && (
        <button
          className="iconbtn bar__toggle bar__toggle--float"
          onClick={() => setSettings({ barCollapsed: false })}
          aria-label="展开播放条"
          title="展开播放条"
        >
          <Icon name="up" size={18} />
        </button>
      )}
    </footer>
  )
}
