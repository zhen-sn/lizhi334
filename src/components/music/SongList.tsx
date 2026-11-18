import { Link } from 'react-router-dom'
import type { Song } from '../../data/types'
import { albumMap } from '../../data/albums'
import { mmss } from '../../lib/format'
import { usePlayer } from '../../store/player'
import { useSongActions } from '../../hooks/useSongActions'
import { Icon } from '../common/Icon'
import { Cover } from '../common/Cover'
import { Eq } from '../common/Primitives'

export interface SongListProps {
  songs: Song[]
  /** 显示表头 */
  head?: boolean
  showAlbum?: boolean
  showKey?: boolean
  /** 序号起始值 */
  offset?: number
  onRemove?: (id: string) => void
}

export function SongList({
  songs,
  head = true,
  showAlbum = true,
  showKey = false,
  offset = 0,
  onRemove,
}: SongListProps) {
  const ids = songs.map((s) => s.id)
  const currentId = usePlayer((s) => s.currentId)
  const playing = usePlayer((s) => s.playing)
  const act = useSongActions()

  return (
    <div className={`list ${showKey ? '' : 'list--no-key'}`}>
      {head && (
        <div className="list__head">
          <span style={{ textAlign: 'center' }}>#</span>
          <span>标题</span>
          <span>{showAlbum ? '专辑' : '标签'}</span>
          {showKey && <span>调性</span>}
          <span style={{ textAlign: 'right' }}>时长</span>
          <span />
        </div>
      )}
      {songs.map((s, i) => {
        const current = s.id === currentId
        const album = albumMap[s.albumId]
        return (
          <div
            key={s.id}
            className={`srow ${current ? 'is-current' : ''}`}
            onDoubleClick={() => act.playSong(s.id, ids)}
          >
            <span className="srow__idx">
              {current ? <Eq on={playing} /> : offset + i + 1}
            </span>

            <div className="srow__title">
              <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
              <div style={{ minWidth: 0 }}>
                <button
                  className="nowrap"
                  style={{ display: 'block', textAlign: 'left', fontWeight: 550 }}
                  onClick={() => act.toggle(s.id, ids)}
                  title={s.title}
                >
                  {s.title}
                </button>
                <div className="nowrap mute" style={{ fontSize: 11 }}>
                  {s.tags.filter((t) => t !== 'instrumental').join(' · ')}
                  {s.city ? ` · ${s.city}` : ''}
                </div>
              </div>
            </div>

            <div className="nowrap">
              {showAlbum ? (
                <Link
                  to={`/songs/album/${s.albumId}`}
                  className="dim"
                  style={{ fontSize: 12 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {album?.name}
                </Link>
              ) : (
                <span className="mute" style={{ fontSize: 12 }}>
                  {album?.year}
                </span>
              )}
            </div>

            {showKey && (
              <div>
                <span className="tag mono">{s.key}</span>
              </div>
            )}

            <div className="mono mute" style={{ textAlign: 'right', fontSize: 12 }}>
              {mmss(s.duration)}
            </div>

            <div className="srow__acts">
              <button
                className={`iconbtn tip ${act.isFav(s.id) ? 'is-on' : ''}`}
                data-tip={act.isFav(s.id) ? '取消收藏' : '喜欢'}
                onClick={() => act.fav(s.id)}
                aria-label="喜欢"
              >
                <Icon name={act.isFav(s.id) ? 'heart' : 'heartLine'} size={15} />
              </button>
              <button
                className="iconbtn tip"
                data-tip="加入歌单"
                onClick={() => act.addToPlaylist([s.id])}
                aria-label="加入歌单"
              >
                <Icon name="plus" size={15} />
              </button>
              {onRemove ? (
                <button
                  className="iconbtn tip"
                  data-tip="从本歌单移除"
                  onClick={() => onRemove(s.id)}
                  aria-label="移除"
                >
                  <Icon name="close" size={15} />
                </button>
              ) : (
                <button
                  className="iconbtn tip"
                  data-tip="队列下一首"
                  onClick={() => act.enqueueNext(s.id)}
                  aria-label="队列为下一首"
                >
                  <Icon name="queue" size={15} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
