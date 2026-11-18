import { useEffect, useState } from 'react'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { songMap } from '../data/songs'
import { mmss } from '../lib/format'
import type { DesktopState } from '../types/desktop'
import '../styles/mini.css'

/**
 * 迷你播放器窗口（仅 Electron）。
 * 播放发生在主窗口，这里只负责显示状态和转发指令，避免两个窗口各跑一套时钟。
 */
export default function Mini() {
  const [state, setState] = useState<DesktopState | null>(null)

  useEffect(() => {
    const desktop = window.desktop
    if (!desktop) return
    desktop.requestState()
    return desktop.onState(setState)
  }, [])

  const song = state?.songId ? songMap[state.songId] : null
  const duration = state?.duration || song?.duration || 0
  const percent = duration > 0 && state ? Math.min(100, (state.time / duration) * 100) : 0

  return (
    <div className="mini">
      <div className="mini__drag" onDoubleClick={() => window.desktop?.closeMini()}>
        <Cover
          seed={song?.title ?? '叁叁肆'}
          title={song?.title ?? '叁叁肆'}
          size={52}
          glyphSize={18}
        />
        <div className="mini__meta">
          <div className="mini__title">{song?.title ?? '未在播放'}</div>
          <div className="mini__artist">
            {song ? `李志${state?.album ? ' · ' + state.album : ''}` : '双击回到主窗口'}
          </div>
          <div className="mini__progress">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="mini__time mono">
            {mmss(state?.time ?? 0)} / {mmss(duration)}
          </div>
        </div>
      </div>

      <div className="mini__controls">
        <button
          className="iconbtn"
          onClick={() => window.desktop?.sendCommand('prev')}
          aria-label="上一首"
          title="上一首"
        >
          <Icon name="prev" size={16} />
        </button>
        <button
          className="iconbtn mini__play"
          onClick={() => window.desktop?.sendCommand('toggle')}
          aria-label={state?.playing ? '暂停' : '播放'}
          title={state?.playing ? '暂停' : '播放'}
        >
          <Icon name={state?.playing ? 'pause' : 'play'} size={18} />
        </button>
        <button
          className="iconbtn"
          onClick={() => window.desktop?.sendCommand('next')}
          aria-label="下一首"
          title="下一首"
        >
          <Icon name="next" size={16} />
        </button>
        <button
          className="iconbtn"
          onClick={() => window.desktop?.closeMini()}
          aria-label="回到主窗口"
          title="回到主窗口"
        >
          <Icon name="expand" size={15} />
        </button>
      </div>
    </div>
  )
}
