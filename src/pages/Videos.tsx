import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { videos, videoCategories, videoCategoryLabel } from '../data/videos'
import { songMap } from '../data/songs'
import { Cover } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { Chips, Empty } from '../components/common/Primitives'
import { mmss, playCount } from '../lib/format'
import { useUi } from '../store/ui'
import type { Video } from '../data/types'

type Cat = (typeof videoCategories)[number]['key']
type Sort = 'hot' | 'new' | 'long'

const SORTS: { key: Sort; label: string }[] = [
  { key: 'hot', label: '最热' },
  { key: 'new', label: '最新' },
  { key: 'long', label: '时长' },
]

export default function Videos() {
  const [cat, setCat] = useState<Cat>('all')
  const [sort, setSort] = useState<Sort>('hot')
  const search = useUi((s) => s.search)
  const nav = useNavigate()

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = videos.filter((v) => (cat === 'all' ? true : v.category === cat))
    if (q) {
      out = out.filter((v) =>
        [v.title, v.city ?? '', videoCategoryLabel[v.category], String(v.year)]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    return [...out].sort((a, b) =>
      sort === 'hot' ? b.views - a.views : sort === 'new' ? b.year - a.year : b.duration - a.duration,
    )
  }, [cat, sort, search])

  return (
    <div>
      <header className="page-head">
        <h1>视频</h1>
        <p>{videos.length} 条影像 · 现场、MV 与纪实。</p>
      </header>

      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Chips
          items={videoCategories.map((c) => ({
            key: c.key,
            label: c.label,
            title: c.key === 'all' ? `${videos.length} 条` : undefined,
          }))}
          value={cat}
          onChange={setCat}
        />
        <div className="spacer" />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              按{s.label}排序
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <Empty
          text="没有匹配的影像"
          hint={search ? `「${search}」在影像库里没有结果` : '换一个分类看看'}
          action={
            <button className="btn" onClick={() => nav('/search')}>
              <Icon name="search" size={15} /> 全站搜索
            </button>
          }
        />
      ) : (
        <div className="grid grid--videos" style={{ marginBottom: 24 }}>
          {list.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  )
}

function VideoCard({ v }: { v: Video }) {
  const song = v.relatedSongId ? songMap[v.relatedSongId] : undefined
  return (
    <Link to={`/videos/${v.id}`} className="card card--hover" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <Cover seed={v.title} title={v.title} shape="wide" glyphSize={26} />
        <span className="video-card__dur">{mmss(v.duration)}</span>
      </div>
      <div style={{ padding: '11px 14px 14px' }}>
        <div className="video-card__title nowrap" title={v.title}>
          {v.title}
        </div>
        <div className="video-card__sub nowrap">
          {videoCategoryLabel[v.category]} · {v.year}
          {v.city ? ` · ${v.city}` : ''} · {playCount(v.views)} 次观看
        </div>
        {song && (
          <div className="row" style={{ marginTop: 9, gap: 6 }}>
            <Icon name="music" size={12} style={{ color: 'var(--gold)' }} />
            <span className="nowrap mute" style={{ fontSize: 11 }}>
              关联曲目《{song.title}》
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
