import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { albumMap } from '../data/albums'
import { songMap, songs } from '../data/songs'
import { sheetMap } from '../data/chords'
import { videos, videoCategoryLabel } from '../data/videos'
import { SongList } from '../components/music/SongList'
import { Cover } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { Slider } from '../components/common/Slider'
import { Lyrics, useSongLyric } from '../components/lyrics/Lyrics'
import { Section, Empty, Level } from '../components/common/Primitives'
import { CommentSection } from '../components/comments/CommentSection'
import { mmss, playCount } from '../lib/format'
import { download, renderShareCard } from '../lib/share'
import { activeIndex } from '../lib/lrc'
import { usePlayer } from '../store/player'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'

export default function SongDetail() {
  const { id = '' } = useParams()
  const song = songMap[id]
  const act = useSongActions()
  const push = useUi((s) => s.push)
  const p = usePlayer()
  const counts = useLibrary((s) => s.counts)
  const lastPos = useLibrary((s) => s.lastPos)

  const album = song ? albumMap[song.albumId] : undefined
  const isCurrent = p.currentId === id
  const { lines } = useSongLyric(song)

  const related = useMemo(() => {
    if (!song) return []
    return songs.filter((s) => s.id !== song.id && (s.city && s.city === song.city))
  }, [song])

  if (!song) {
    return (
      <Empty
        text="找不到这首曲目"
        hint={`编号「${id}」未找到`}
        action={
          <Link to="/songs" className="btn btn--primary">
            全部曲目
          </Link>
        }
      />
    )
  }

  const sheet = sheetMap[song.id]
  const clips = videos.filter((v) => v.relatedSongId === song.id)
  const versions = songs.filter(
    (s) => s.id !== song.id && song.title.replace(/\s*\(.*\)\s*/, '') === s.title.replace(/\s*\(.*\)\s*/, ''),
  )

  return (
    <div className="song-page">
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ marginBottom: 16, fontSize: 12 }}>
          <Link to="/songs" className="mute">
            歌曲
          </Link>
          <Icon name="right" size={12} />
          <Link to={`/songs/album/${album!.id}`} className="mute">
            {album?.name}
          </Link>
          <Icon name="right" size={12} />
          <span>{song.title}</span>
        </div>

        <div className="row" style={{ alignItems: 'flex-end', gap: 22, marginBottom: 22 }}>
          <Cover seed={song.title} title={song.title} year={song.year} size={172} glyphSize={58} />
          <div style={{ minWidth: 0 }}>
            <div className="mute" style={{ fontSize: 12, letterSpacing: '0.2em' }}>
              {song.city ? `${song.city} · ` : ''}
              {album?.year}
            </div>
            <h1 className="serif" style={{ fontSize: 34, margin: '4px 0 10px' }}>
              {song.title}
            </h1>
            <div className="chips" style={{ marginBottom: 14 }}>
              {song.tags.map((t) => (
                <Link to={`/songs?tag=${encodeURIComponent(t)}`} key={t} className="chip">
                  {t}
                </Link>
              ))}
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={() => act.playSong(song.id, album?.songIds)}>
                <Icon name="play" size={15} /> {lastPos[song.id] > 5 ? `继续 ${mmss(lastPos[song.id])}` : '播放'}
              </button>
              <button
                className={`btn ${act.isFav(song.id) ? 'is-on' : ''}`}
                onClick={() => act.fav(song.id)}
                style={act.isFav(song.id) ? { color: 'var(--gold)', borderColor: 'var(--gold-line)' } : undefined}
              >
                <Icon name={act.isFav(song.id) ? 'heart' : 'heartLine'} size={15} />
                {act.isFav(song.id) ? '已收藏' : '收藏'}
              </button>
              <button className="btn" onClick={() => act.addToPlaylist([song.id])}>
                <Icon name="plus" size={15} /> 加入歌单
              </button>
              <button className="btn" onClick={() => act.enqueueNext(song.id)}>
                <Icon name="queue" size={15} /> 下一首
              </button>
              <button
                className="btn"
                onClick={() => {
                  const lyric = isCurrent
                    ? lines[activeIndex(lines, p.time)]?.text ?? ''
                    : ''
                  download(renderShareCard(song, album?.name ?? '', lyric), `lizhi-${song.id}.png`)
                  push('分享卡已生成', 'good')
                }}
              >
                <Icon name="share" size={15} /> 分享卡
              </button>
              {isCurrent && (
                <button className="btn" onClick={() => p.setFull(true)}>
                  <Icon name="expand" size={15} /> 全屏
                </button>
              )}
            </div>
          </div>
        </div>

        {isCurrent && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="gold" style={{ fontSize: 12 }}>
                正在播放
              </span>
              <div className="spacer" />
              <span className="mono mute" style={{ fontSize: 12 }}>
                {mmss(p.time)} / {mmss(p.duration || song.duration)}
              </span>
            </div>
            <Slider
              value={p.time}
              max={p.duration || song.duration}
              format={mmss}
              onScrub={(v) => p.seek(v)}
            />
            <div className="row" style={{ marginTop: 12, justifyContent: 'center' }}>
              <button className="iconbtn iconbtn--lg" onClick={() => p.prev()}>
                <Icon name="prev" size={20} />
              </button>
              <button className="playbtn" onClick={() => p.toggle()}>
                <Icon name={p.playing ? 'pause' : 'play'} size={22} />
              </button>
              <button className="iconbtn iconbtn--lg" onClick={() => p.next(false)}>
                <Icon name="next" size={20} />
              </button>
            </div>
          </div>
        )}

        <Section title="歌词">
          <Lyrics
            song={song}
            time={isCurrent ? p.time : 0}
            onSeek={isCurrent ? (t) => p.seek(t) : undefined}
            height={360}
          />
        </Section>


        <CommentSection target={`song:${song.id}`} />
      </div>

      {/* ---------- 右栏 ---------- */}
      <aside className="song-side">
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>曲目信息</h3>
          <div className="fact">
            <span>收录于</span>
            <b>
              <Link to={`/songs/album/${album!.id}`}>{album?.name}</Link>
            </b>
          </div>
          <div className="fact">
            <span>时长</span>
            <b className="mono">{mmss(song.duration)}</b>
          </div>
          <div className="fact">
            <span>速度</span>
            <b className="mono">{song.bpm} BPM</b>
          </div>
          <div className="fact">
            <span>原调 / Capo</span>
            <b className="mono">
              {song.key} · {song.capo ? `${song.capo} 品` : '不夹'}
            </b>
          </div>
          <div className="fact">
            <span>弹唱难度</span>
            <b>
              <Level n={song.difficulty} />
            </b>
          </div>
          <div className="fact">
            <span>播放量</span>
            <b className="mono">{playCount(song.playCount)}</b>
          </div>
          <div className="fact">
            <span>你听过</span>
            <b className="mono">{counts[song.id] || 0} 次</b>
          </div>
        </div>

        {sheet ? (
          <Link to={`/tools/chords/${song.id}`} className="toolcard">
            <span className="toolcard__ic">
              <Icon name="guitar" size={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <h3>有谱 · {sheet.tuning}</h3>
              <p>{sheet.tempoMark} · {sheet.usedChords.length} 个和弦</p>
            </span>
            <Icon name="right" size={16} />
          </Link>
        ) : (
          <Link to="/tools/chords" className="toolcard">
            <span className="toolcard__ic">
              <Icon name="guitar" size={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <h3>这首歌还没有谱</h3>
              <p>去谱库看看别的曲目</p>
            </span>
            <Icon name="right" size={16} />
          </Link>
        )}

        {clips.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>相关视频</h3>
            {clips.map((v) => (
              <Link key={v.id} to={`/videos/${v.id}`} className="row" style={{ padding: '7px 0', minWidth: 0 }}>
                <Cover seed={v.title} title={v.title} size={54} shape="wide" glyphSize={12} />
                <span style={{ minWidth: 0 }}>
                  <span className="nowrap" style={{ display: 'block', fontSize: 13 }}>
                    {v.title}
                  </span>
                  <span className="mute" style={{ fontSize: 11 }}>
                    {videoCategoryLabel[v.category]} · {v.year} · {playCount(v.views)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {versions.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>其它版本</h3>
            <SongList songs={versions} head={false} showAlbum={false} offset={0} />
          </div>
        )}

        <Section title="同城市写的歌" subtitle={song.city ?? '未标注城市'}>
          {related.length ? (
            <SongList songs={related.slice(0, 8)} head={false} showAlbum={false} offset={0} />
          ) : (
            <p className="mute" style={{ fontSize: 12 }}>
              暂时还没有其它曲目挂在这个城市。
            </p>
          )}
        </Section>
      </aside>
    </div>
  )
}
