import { Link, useNavigate, useParams } from 'react-router-dom'
import { videoMap, videoCategories, videoCategoryLabel, videos } from '../data/videos'
import { albumMap } from '../data/albums'
import { getSong } from '../data/songs'
import { Stage } from '../components/video/Stage'
import { Cover } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { DemoNotice, Empty, Section } from '../components/common/Primitives'
import { CommentSection } from '../components/comments/CommentSection'
import { mmss, playCount } from '../lib/format'
import { copyText } from '../lib/share'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'
import { usePlayer } from '../store/player'

export default function VideoDetail() {
  const { id = '' } = useParams()
  const v = videoMap[id]
  const nav = useNavigate()
  const push = useUi((s) => s.push)
  const act = useSongActions()
  const p = usePlayer()

  if (!v) {
    return (
      <Empty
        text="找不到这条影像"
        hint={`编号「${id}」不在演示库里`}
        action={
          <Link to="/videos" className="btn btn--primary">
            返回影像列表
          </Link>
        }
      />
    )
  }

  const song = getSong(v.relatedSongId)
  const album = song ? albumMap[song.albumId] : undefined
  const more = videos.filter((x) => x.category === v.category && x.id !== v.id).slice(0, 6)
  const others = videos.filter((x) => x.id !== v.id && x.city && x.city === v.city).slice(0, 4)

  return (
    <div>
      <div className="row" style={{ marginBottom: 16, fontSize: 12 }}>
        <Link to="/videos" className="mute">
          MV 视频
        </Link>
        <Icon name="right" size={12} />
        <Link to="/videos" className="mute">
          {videoCategoryLabel[v.category]}
        </Link>
        <Icon name="right" size={12} />
        <span className="nowrap">{v.title}</span>
      </div>

      <Stage video={v} onEnded={() => push('放映结束', 'info')} />

      <div className="row" style={{ alignItems: 'flex-end', gap: 20, margin: '22px 0 18px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>
            {v.title}
          </h1>
          <div className="mute" style={{ fontSize: 12 }}>
            {videoCategoryLabel[v.category]} · {v.year}
            {v.city ? ` · ${v.city}` : ''} · 时长 {mmss(v.duration)} · {playCount(v.views)} 次观看
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {song && (
            <button className="btn btn--primary" onClick={() => act.playSong(song.id)}>
              <Icon name="play" size={15} /> 播放录音室版本
            </button>
          )}
          {song && (
            <button className="btn" onClick={() => act.enqueueNext(song.id)}>
              <Icon name="queue" size={15} /> 下一首
            </button>
          )}
          <button className="btn" onClick={() => push('已开启循环播放本条影像', 'info')}>
            <Icon name="repeat" size={15} /> 循环
          </button>
          <button
            className="btn"
            onClick={async () => {
              const ok = await copyText(location.href)
              push(ok ? '链接已复制' : '复制失败，请手动复制地址', ok ? 'good' : 'info')
            }}
          >
            <Icon name="share" size={15} /> 分享
          </button>
        </div>
      </div>

      <div className="song-page">
        <div style={{ minWidth: 0 }}>
          <Section title="影像说明">
            <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.9, maxWidth: 720 }}>
              {v.description ||
                '演示文案：这里应放一段影像说明——拍摄于哪一轮巡演、机位与收音方式、与录音室版本的差别。正式内容请由后台字段填充。'}
            </p>
            <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.9, maxWidth: 720, marginTop: 10 }}>
              当前页面在没有 mp4 素材时会运行 Canvas 模拟放映机：光锥、灰尘、划痕与进度计时都是前端生成，
              用来验收排版与交互；一旦 <code>public/media/video/&#123;id&#125;.mp4</code> 存在并在设置中打开「本地媒体」，
              即自动切换为真实视频，加载失败还会回落到模拟模式，不会出现黑屏。
            </p>
          </Section>

          <DemoNotice>
            影像标题、城市、年份与播放量为占位数据，需人工校订；本站不内置任何受版权保护的音视频文件。
          </DemoNotice>

          <CommentSection target={`video:${v.id}`} />

          {more.length > 0 && (
            <Section
              title={`更多${videoCategoryLabel[v.category]}`}
              more="全部影像"
              onMore={() => nav('/videos')}
            >
              <div className="grid grid--videos">
                {more.map((x) => (
                  <Link key={x.id} to={`/videos/${x.id}`} className="card card--hover" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ position: 'relative' }}>
                      <Cover seed={x.title} title={x.title} shape="wide" glyphSize={22} />
                      <span className="video-card__dur">{mmss(x.duration)}</span>
                    </div>
                    <div style={{ padding: '10px 14px 13px' }}>
                      <div className="video-card__title nowrap">{x.title}</div>
                      <div className="video-card__sub">{x.year} · {playCount(x.views)} 次观看</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside className="song-side">
          {song && (
            <div className="card">
              <div className="mute" style={{ fontSize: 11, letterSpacing: '0.18em', marginBottom: 10 }}>
                关联曲目
              </div>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Cover seed={song.title} title={song.title} year={song.year} size={86} glyphSize={30} />
                <div style={{ minWidth: 0 }}>
                  <Link to={`/songs/${song.id}`} style={{ fontWeight: 600 }}>
                    {song.title}
                  </Link>
                  <div className="mute" style={{ fontSize: 12, marginTop: 3 }}>
                    {album?.name} · {mmss(song.duration)}
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 6 }}>
                    <button className="btn" style={{ height: 30, padding: '0 12px' }} onClick={() => act.playSong(song.id)}>
                      <Icon name="play" size={13} /> 播放
                    </button>
                    <Link to={`/songs/${song.id}`} className="btn" style={{ height: 30, padding: '0 12px' }}>
                      详情
                    </Link>
                  </div>
                  {p.currentId === song.id && (
                    <div className="gold" style={{ fontSize: 11, marginTop: 8 }}>
                      {p.playing ? '正在播放中' : '当前队列里就是这首'}
                    </div>
                  )}
                </div>
              </div>
              <div className="chips" style={{ marginTop: 12 }}>
                {song.tags.map((t) => (
                  <Link key={t} to={`/songs?tag=${encodeURIComponent(t)}`} className="chip">
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>这条影像的参数</h3>
            <div className="fact">
              <span>分类</span>
              <b>{videoCategoryLabel[v.category]}</b>
            </div>
            <div className="fact">
              <span>年份</span>
              <b className="mono">{v.year}</b>
            </div>
            <div className="fact">
              <span>城市</span>
              <b>{v.city ?? '未标注'}</b>
            </div>
            <div className="fact">
              <span>时长</span>
              <b className="mono">{mmss(v.duration)}</b>
            </div>
            <div className="fact">
              <span>播放量</span>
              <b className="mono">{playCount(v.views)}</b>
            </div>
            <div className="fact">
              <span>媒体来源</span>
              <b className="mono">{v.videoUrl ? '数据字段' : '模拟 / 本地文件'}</b>
            </div>
          </div>

          {v.city && others.length > 0 && (
            <Section title={`同一座城市的影像 · ${v.city}`}>
              {others.map((x) => (
                <Link key={x.id} to={`/videos/${x.id}`} className="row" style={{ padding: '7px 0', minWidth: 0 }}>
                  <Cover seed={x.title} title={x.title} size={56} shape="wide" glyphSize={12} />
                  <span style={{ minWidth: 0 }}>
                    <span className="nowrap" style={{ display: 'block', fontSize: 13 }}>
                      {x.title}
                    </span>
                    <span className="mute" style={{ fontSize: 11 }}>
                      {videoCategoryLabel[x.category]} · {x.year}
                    </span>
                  </span>
                </Link>
              ))}
            </Section>
          )}

          <div className="row" style={{ flexWrap: 'wrap' }}>
            {videoCategories
              .filter((c) => c.key !== 'all')
              .map((c) => (
                <Link key={c.key} to="/videos" className={`chip ${c.key === v.category ? 'is-on' : ''}`}>
                  {c.label}
                </Link>
              ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
