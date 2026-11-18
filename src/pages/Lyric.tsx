import { useEffect, useState } from 'react'
import { Icon } from '../components/common/Icon'
import type { LyricState } from '../types/desktop'
import '../styles/lyric.css'

/**
 * 独立桌面歌词悬浮窗（仅 Electron）。
 * 不自己解析歌词 —— 主窗口已解析好行和 activeIndex，这里只是显示层。
 */
export default function Lyric() {
  const [state, setState] = useState<LyricState | null>(null)
  const [locked, setLocked] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const desktop = window.desktop
    if (!desktop) return
    desktop.requestState?.() // 触发主窗口 push，虽然目前 lyrics 不走这个通道
    return desktop.onLyricState(setState)
  }, [])

  const lines = state?.lines ?? []
  const idx = state?.activeIndex ?? -1
  const curr = idx >= 0 ? lines[idx]?.text : null
  const prev = idx >= 1 ? lines[idx - 1]?.text : null
  const empty = !curr && !state?.playing

  const toggleLock = () => {
    const next = !locked
    setLocked(next)
    if (next) window.desktop?.lyricLock()
    else window.desktop?.lyricUnlock()
  }

  return (
    <div
      className={`lyric-win ${muted ? 'is-muted' : ''} ${locked ? 'is-locked' : ''}`}
      onDoubleClick={() => !locked && setMuted((m) => !m)}
    >
      {!locked && (
        <div className="lyric-win__tools">
          <button
            className="iconbtn"
            onClick={toggleLock}
            aria-label={locked ? '解锁拖动' : '锁定位置'}
            title={locked ? '解锁位置' : '锁定位置'}
          >
            <Icon name={locked ? 'unlock' : 'lock'} size={13} />
          </button>
          <button
            className="iconbtn"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? '显示歌词' : '隐藏歌词'}
            title={muted ? '显示歌词' : '隐藏歌词'}
          >
            <Icon name={muted ? 'eye' : 'eyeOff'} size={13} />
          </button>
          <button
            className="iconbtn"
            onClick={() => window.desktop?.closeLyric()}
            aria-label="关闭桌面歌词"
            title="关闭桌面歌词"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
      <div className="lyric-win__prev">{muted ? '歌词已隐藏' : (prev ?? '')}</div>
      <div className="lyric-win__curr">{empty ? '♪ 未在播放 ♪' : (muted ? (state?.title ?? '') : curr)}</div>
      <div className="lyric-win__sub">{muted ? '' : (state?.title ? `${state.title}${state.artist ? ' · ' + state.artist : ''}` : '')}</div>
    </div>
  )
}
