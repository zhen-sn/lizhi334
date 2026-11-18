import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { albumMap, albums, albumTypeLabel } from '../data/albums'
import { songMap, songsOfAlbum } from '../data/songs'
import { SongList } from '../components/music/SongList'
import { Cover } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { DemoNotice, Empty, PlayAll } from '../components/common/Primitives'
import { mmss } from '../lib/format'
import { usePlayer } from '../store/player'
import { useUi } from '../store/ui'

export default function AlbumDetail() {
  const { id = '' } = useParams()
  const playQueue = usePlayer((s) => s.playQueue)
  const push = useUi((s) => s.push)
  const album = albumMap[id]
  const list = useMemo(() => (album ? album.songIds.map((x) => songMap[x]).filter(Boolean) : []), [album])

  if (!album) {
    return (
      <Empty
        text="找不到这张专辑"
        hint={`地址里的编号「${id}」不在演示库中`}
        action={
          <Link to="/songs" className="btn btn--primary">
            回到歌曲页
          </Link>
        }
      />
    )
  }

  const idx = albums.findIndex((a) => a.id === id)
  const prev = albums[(idx - 1 + albums.length) % albums.length]
  const next = albums[(idx + 1) % albums.length]
  const ids = list.map((s) => s.id)

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/songs" className="mute">
          歌曲
        </Link>
        <Icon name="right" size={12} />
        <span className="mute">{albumTypeLabel[album.type]}</span>
        <span className="mute">/</span>
        <span>{album.name}</span>
      </div>

      <div className="album-hero">
        <Cover seed={album.name} title={album.name} year={album.year} glyphSize={72} />
        <div style={{ minWidth: 0 }}>
          <h1>{album.name}</h1>
          <div className="album-hero__meta">
            <span>{album.date || album.year}</span>
            <span className="tag">{albumTypeLabel[album.type]}</span>
            <span>{list.length} 首 · {mmss(list.reduce((a, s) => a + s.duration, 0))}</span>
            <span>
              调性：{Array.from(new Set(list.map((s) => s.key))).join(' / ')}
            </span>
          </div>
          <p className="album-hero__desc">{album.description}</p>
          <div className="row">
            <PlayAll onClick={() => playQueue(ids, 0)} />
            <button
              className="btn"
              onClick={() => {
                usePlayer.getState().enqueue(ids)
                push(`已把 ${ids.length} 首排到当前曲目之后`, 'good')
              }}
            >
              <Icon name="queue" size={15} /> 排到队尾
            </button>
          </div>
        </div>
      </div>

      <DemoNotice>曲目顺序、时长与简介为占位内容，正式版需按唱片内页校订。</DemoNotice>

      <SongList songs={list} head={false} showAlbum={false} showKey />

      <div className="row" style={{ marginTop: 22, justifyContent: 'space-between' }}>
        <Link to={`/songs/album/${prev.id}`} className="card card--hover" style={{ padding: '10px 14px', fontSize: 12 }}>
          <div className="mute">上一张</div>
          <b className="nowrap">{prev.name}</b>
        </Link>
        <Link
          to={`/songs/album/${next.id}`}
          className="card card--hover"
          style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}
        >
          <div className="mute">下一张</div>
          <b className="nowrap">{next.name}</b>
        </Link>
      </div>
    </div>
  )
}
