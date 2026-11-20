import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { songs, albums } from '../data'
import { categories, filterByCategory, allTags, allCities } from '../data/songs'
import { albumTypeLabel } from '../data/albums'
import { SongList } from '../components/music/SongList'
import { Cover } from '../components/common/Cover'
import { Chips, Tabs, PlayAll, Empty } from '../components/common/Primitives'
import { Icon } from '../components/common/Icon'
import { mmss } from '../lib/format'
import { usePlayer } from '../store/player'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'

type Tab = 'all' | 'albums' | 'tags' | 'cities'
type Sort = 'default' | 'hot' | 'duration' | 'title' | 'bpm'

const SORTS: { key: Sort; label: string }[] = [
  { key: 'default', label: '按专辑' },
  { key: 'hot', label: '按播放量' },
  { key: 'duration', label: '按时长' },
  { key: 'title', label: '按标题' },
  { key: 'bpm', label: '按 BPM' },
]

export default function Songs() {
  const [params, setParams] = useSearchParams()
  const act = useSongActions()
  const playQueue = usePlayer((s) => s.playQueue)
  const keyword = useUi((s) => s.search).trim()

  const tab = (params.get('tab') as Tab) || 'all'
  const cat = params.get('cat') || 'all'
  const sort = (params.get('sort') as Sort) || 'default'
  const tag = params.get('tag') || ''
  const city = params.get('city') || ''

  const patch = (kv: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(kv)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  const pool = useMemo(() => {
    let list = cat === 'all' ? songs : filterByCategory(cat)
    if (tag) list = list.filter((s) => s.tags.includes(tag))
    if (city) list = list.filter((s) => s.city === city)
    if (keyword) {
      const q = keyword.toLowerCase()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (albums.find((a) => a.id === s.albumId)?.name ?? '').toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q)),
      )
    }
    const sorted = [...list]
    if (sort === 'hot') sorted.sort((a, b) => b.playCount - a.playCount)
    if (sort === 'duration') sorted.sort((a, b) => a.duration - b.duration)
    if (sort === 'bpm') sorted.sort((a, b) => a.bpm - b.bpm)
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    return sorted
  }, [cat, tag, city, keyword, sort])

  const ids = pool.map((s) => s.id)

  return (
    <div>
      <div className="page-head">
        <h1>歌曲</h1>
        <p>{songs.length} 首曲目 · {albums.length} 张唱片。</p>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={(v) => patch({ tab: v === 'all' ? '' : v })}
        items={[
          { key: 'all', label: '曲目', count: songs.length },
          { key: 'albums', label: '专辑', count: albums.length },
          { key: 'tags', label: '标签', count: allTags.length },
          { key: 'cities', label: '城市', count: allCities.length },
        ]}
      />

      {tab === 'albums' && (
        <>
          {(['studio', 'live', 'ep', 'single', 'compilation'] as const).map((type) => {
            const group = albums.filter((a) => a.type === type)
            if (!group.length) return null
            return (
              <section className="section" key={type}>
                <header className="section__head">
                  <h2>{albumTypeLabel[type]}</h2>
                  <span className="mute" style={{ fontSize: 12 }}>{group.length} 张</span>
                </header>
                <div className="grid grid--albums">
                  {group.map((a) => (
                    <Link key={a.id} to={`/songs/album/${a.id}`} className="card card--hover" style={{ padding: 12 }}>
                      <Cover seed={a.name} title={a.name} year={a.year} glyphSize={30} />
                      <div className="album-card__title nowrap">{a.name}</div>
                      <div className="album-card__sub">
                        {a.year} · {a.songIds.length} 首
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}

      {tab === 'tags' && (
        <div className="grid grid--albums">
          {allTags.filter((t) => t !== 'instrumental').map((t) => {
            const list = songs.filter((s) => s.tags.includes(t))
            const on = tag === t
            return (
              <button
                key={t}
                className={`toolcard ${on ? 'is-on' : ''}`}
                style={on ? { borderColor: 'var(--gold-line)' } : undefined}
                onClick={() => patch({ tag: on ? '' : t, tab: 'all', city: '' })}
              >
                <span className="toolcard__ic">
                  <Icon name="filter" size={18} />
                </span>
                <span style={{ textAlign: 'left' }}>
                  <h3>{t}</h3>
                  <p>{list.length} 首 · {mmss(list.reduce((a, s) => a + s.duration, 0))}</p>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'cities' && (
        <>
          <p className="mute" style={{ fontSize: 13, marginBottom: 16 }}>
            以地名入歌是这个曲库最明显的特征。点城市可跳到该城市的曲目。
          </p>
          <div className="citylist" style={{ marginBottom: 24 }}>
            {allCities.map((c) => (
              <button
                key={c}
                className={`city ${city === c ? 'is-done' : ''}`}
                onClick={() => patch({ city: city === c ? '' : c, tab: 'all', tag: '' })}
              >
                {c} · {songs.filter((s) => s.city === c).length}
              </button>
            ))}
          </div>
          <div className="province-grid">
            {allCities.map((c) => {
              const list = songs.filter((s) => s.city === c)
              return (
                <div className="province" key={c}>
                  <div className="province__name">{c}</div>
                  {list.slice(0, 4).map((s) => (
                    <Link
                      key={s.id}
                      to={`/songs/${s.id}`}
                      className="dim nowrap"
                      style={{ display: 'block', fontSize: 12 }}
                    >
                      {s.title}
                    </Link>
                  ))}
                  {list.length > 4 && (
                    <button
                      className="section__more"
                      onClick={() => patch({ city: c, tab: 'all' })}
                    >
                      其余 {list.length - 4} 首
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'all' && (
        <>
          <div className="row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            <Chips
              value={cat}
              onChange={(v) => patch({ cat: v === 'all' ? '' : v })}
              items={[{ key: 'all', label: '全部分类' }, ...categories]}
            />
            <div className="spacer" />
            {(tag || city) && (
              <button className="chip is-on" onClick={() => patch({ tag: '', city: '' })}>
                {tag || city} <Icon name="close" size={12} />
              </button>
            )}
            <select className="select" value={sort} onChange={(e) => patch({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="row" style={{ marginBottom: 14 }}>
            <PlayAll onClick={() => playQueue(ids, 0)} />
            <button className="btn" onClick={() => act.enqueueNext(ids[0])} disabled={!ids.length}>
              <Icon name="queue" size={15} /> 下一首播放
            </button>
            <div className="spacer" />
            <span className="mute" style={{ fontSize: 12 }}>
              {pool.length} 首 ·{' '}
              {mmss(pool.reduce((a, s) => a + s.duration, 0))}
            </span>
          </div>

          {pool.length ? (
            <SongList songs={pool} />
          ) : (
            <Empty
              text="没有符合条件的曲目"
              hint={keyword ? `「${keyword}」没搜到，试试换个说法` : '放宽筛选条件看看'}
              action={
                <button className="btn" onClick={() => patch({ cat: '', tag: '', city: '' })}>
                  清空筛选
                </button>
              }
            />
          )}
        </>
      )}
    </div>
  )
}
