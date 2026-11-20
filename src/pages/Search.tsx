import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { SongList } from '../components/music/SongList'
import { Section, Tabs, Stat, Empty, PlayAll, Level } from '../components/common/Primitives'
import { songs, songMap, allCities, allTags } from '../data/songs'
import { albums, albumMap, albumTypeLabel } from '../data/albums'
import { videos, videoCategoryLabel } from '../data/videos'
import { sheetMap } from '../data/chords'
import { mmss, playCount } from '../lib/format'
import { useUi } from '../store/ui'
import { useLibrary } from '../store/library'
import { useSongActions } from '../hooks/useSongActions'

type Tab = 'songs' | 'albums' | 'videos' | 'sheets' | 'tags'

const TAB_KEYS: { key: Tab; label: string }[] = [
  { key: 'songs', label: '曲目' },
  { key: 'albums', label: '专辑' },
  { key: 'videos', label: '影像' },
  { key: 'sheets', label: '吉他谱' },
  { key: 'tags', label: '城市与标签' },
]

/** 相关度：命中位置越靠前、字段越重要，分越高 */
function score(text: string, q: string) {
  const t = text.toLowerCase()
  const i = t.indexOf(q)
  if (i < 0) return 0
  return (i === 0 ? 40 : i < 3 ? 26 : 12) + Math.max(0, 10 - i)
}

export default function Search() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = useUi((s) => s.search)
  const setSearch = useUi((s) => s.setSearch)
  const history = useLibrary((s) => s.history)
  const favs = useLibrary((s) => s.favorites)
  const playlists = useLibrary((s) => s.playlists)
  const act = useSongActions()
  const [tab, setTab] = useState<Tab>('songs')
  const [sort, setSort] = useState<'rel' | 'hot' | 'year'>('rel')

  const qParam = params.get('q') ?? ''
  const q = search.trim().toLowerCase()

  // 地址栏 → store（顶栏回车会带 ?q= 进来）
  useEffect(() => {
    if (qParam && qParam !== search) setSearch(qParam)
    if (!qParam && !search) return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam])

  // store → 地址栏（刷新/分享链接都能复现结果）
  useEffect(() => {
    if ((params.get('q') ?? '') !== search) setParams(search ? { q: search } : {}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hits = useMemo(() => {
    if (!q) return { songs: [], albums: [], videos: [], sheets: [], cities: [], tags: [] }
    const songHits = songs
      .map((s) => {
        const album = albumMap[s.albumId]
        const rel =
          score(s.title, q) * 3 +
          score(album?.name ?? '', q) * 1.5 +
          score(s.city ?? '', q) * 1.5 +
          score(s.tags.join(' '), q) +
          score(String(s.year), q) / 2 +
          score(s.key, q) / 2
        return { s, rel }
      })
      .filter((x) => x.rel > 0)
      .sort((a, b) => b.rel - a.rel)
      .map((x) => x.s)

    return {
      songs: songHits,
      albums: albums.filter((a) => score(a.name, q) > 0 || score(a.description, q) > 0 || score(String(a.year), q) > 0),
      videos: videos.filter(
        (v) => score(v.title, q) > 0 || score(v.description, q) > 0 || score(v.city ?? '', q) > 0 || score(videoCategoryLabel[v.category], q) > 0,
      ),
      sheets: songHits.filter((s) => sheetMap[s.id]),
      cities: allCities.filter((c) => c.toLowerCase().includes(q)),
      tags: allTags.filter((t) => t.toLowerCase().includes(q)),
    }
  }, [q])

  const sortedSongs = useMemo(() => {
    const list = hits.songs
    if (sort === 'hot') return [...list].sort((a, b) => b.playCount - a.playCount)
    if (sort === 'year') return [...list].sort((a, b) => b.year - a.year)
    return list
  }, [hits.songs, sort])

  const total = hits.songs.length + hits.albums.length + hits.videos.length + hits.sheets.length + hits.cities.length + hits.tags.length

  if (!q) {
    return (
      <div>
        <header className="page-head">
          <h1>搜索</h1>
          <p>在顶栏输入即可实时筛选；也可以从下面的入口开始。</p>
        </header>

        <div style={{ maxWidth: 620 }}>
          <input
            className="inputlike"
            autoFocus
            placeholder="歌名 / 专辑 / 城市 / 标签 / 年份 / 调性…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>

        <Section title="热门搜索">
          <div className="chips">
            {allCities.slice(0, 8).map((c) => (
              <button key={c} className="chip" onClick={() => setSearch(c)}>
                <Icon name="map" size={13} /> {c}
              </button>
            ))}
            {['精选', '弹唱友好', '冷门', '摇滚', '横按'].map((t) => (
              <button key={t} className="chip" onClick={() => setSearch(t)}>
                #{t}
              </button>
            ))}
            {['2004', '2017', 'Em', 'G'].map((k) => (
              <button key={k} className="chip" onClick={() => setSearch(k)}>
                <span className="mono">{k}</span>
              </button>
            ))}
          </div>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 30 }}>
          <Stat value={songs.length} label="可搜索曲目" />
          <Stat value={albums.length} label="专辑" />
          <Stat value={videos.length} label="影像" />
          <Stat value={Object.keys(sheetMap).length} label="已录入谱" />
        </div>

        <Section title="接着找" subtitle="你最近听过 / 收藏过的">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))' }}>
            {history.slice(0, 3).map((h) => {
              const s = songMap[h.songId]
              if (!s) return null
              return (
                <button key={h.songId} className="toolcard" onClick={() => setSearch(s.title)}>
                  <span className="toolcard__ic">
                    <Icon name="clock" size={18} />
                  </span>
                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                    <h3 className="nowrap">{s.title}</h3>
                    <p>最近听过 · 点一下搜同名曲目</p>
                  </span>
                </button>
              )
            })}
            {favs.slice(0, 2).map((id) => {
              const s = songMap[id]
              if (!s) return null
              return (
                <button key={id} className="toolcard" onClick={() => setSearch(s.title)}>
                  <span className="toolcard__ic">
                    <Icon name="heart" size={18} />
                  </span>
                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                    <h3 className="nowrap">{s.title}</h3>
                    <p>在「我喜欢」里</p>
                  </span>
                </button>
              )
            })}
            {playlists.slice(0, 2).map((pl) => (
              <Link key={pl.id} to={`/playlist/${pl.id}`} className="toolcard">
                <span className="toolcard__ic">
                  <Icon name="queue" size={18} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <h3 className="nowrap">{pl.name}</h3>
                  <p>{pl.songIds.length} 首</p>
                </span>
              </Link>
            ))}
          </div>
          {history.length === 0 && favs.length === 0 && playlists.length === 0 && (
            <Empty text="还没有历史记录" hint="先随便听一首，这里就会出现入口。" />
          )}
        </Section>

        <Section title="搜索提示" subtitle="支持的搜索维度">
          <div className="card card--flat">
            <ul style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--fg-2)', paddingLeft: 18 }}>
              <li>歌名关键词：「郑州」「蜻蜓」「Rain」</li>
              <li>专辑名：「热河」「1701」「山阴路的夏天」</li>
              <li>城市与标签：「南京」「弹唱友好」「冷门」</li>
              <li>年份与调性：「2011」「Em」；影像分类：「现场」「纪录片」</li>
              <li>结果会同步到地址栏 <code className="mono">?q=</code>，可直接分享链接</li>
            </ul>
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div>
      <header className="page-head">
        <h1>
          「<span className="gold">{search.trim()}</span>」的结果
        </h1>
        <p>
          共 {total} 条匹配 · 曲目 {hits.songs.length} / 专辑 {hits.albums.length} / 影像 {hits.videos.length} / 谱{' '}
          {hits.sheets.length}
        </p>
      </header>

      <div className="row" style={{ gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <input
            className="inputlike"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="继续补充关键词…"
            aria-label="搜索关键词"
          />
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} title="排序">
          <option value="rel">按相关度</option>
          <option value="hot">按播放量</option>
          <option value="year">按年份</option>
        </select>
        {hits.songs.length > 0 && <PlayAll onClick={() => act.playSong(sortedSongs[0].id, sortedSongs.map((s) => s.id))} label="播放结果" />}
        <button className="btn" onClick={() => setSearch('')}>
          <Icon name="close" size={15} /> 清空
        </button>
      </div>

      <Tabs
        items={TAB_KEYS.map((t) => ({
          key: t.key,
          label: t.label,
          count:
            t.key === 'songs'
              ? hits.songs.length
              : t.key === 'albums'
                ? hits.albums.length
                : t.key === 'videos'
                  ? hits.videos.length
                  : t.key === 'sheets'
                    ? hits.sheets.length
                    : hits.cities.length + hits.tags.length,
        }))}
        value={tab}
        onChange={setTab}
      />

      {tab === 'songs' &&
        (sortedSongs.length === 0 ? (
          <Empty text="没有匹配的曲目" hint="试试更短的关键词，或看看城市 / 标签页。" action={<button className="btn" onClick={() => setTab('tags')}>看城市与标签</button>} />
        ) : (
          <>
            <SongList songs={sortedSongs} head showAlbum showKey offset={0} />
            <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
              双击任意一行即可播放；结果超过 40 条时建议再加一个关键词。
            </p>
          </>
        ))}

      {tab === 'albums' &&
        (hits.albums.length === 0 ? (
          <Empty text="没有匹配的专辑" />
        ) : (
          <div className="grid grid--albums">
            {hits.albums.map((a) => (
              <Link key={a.id} to={`/songs/album/${a.id}`} className="card card--hover" style={{ padding: 12 }}>
                <Cover seed={a.name} title={a.name} year={a.year} glyphSize={30} />
                <div className="album-card__title nowrap">
                  <Hl text={a.name} q={q} />
                </div>
                <div className="album-card__sub">
                  {a.year} · {a.songIds.length} 首 · {albumTypeLabel[a.type]}
                </div>
              </Link>
            ))}
          </div>
        ))}

      {tab === 'videos' &&
        (hits.videos.length === 0 ? (
          <Empty text="没有匹配的影像" hint="影像可按标题、城市与分类搜索。" />
        ) : (
          <div className="grid grid--videos">
            {hits.videos.map((v) => (
              <Link key={v.id} to={`/videos/${v.id}`} className="card card--hover" style={{ padding: 12 }}>
                <Cover seed={v.title} title={v.title} shape="wide" glyphSize={26} />
                <div className="nowrap" style={{ marginTop: 10, fontWeight: 550, fontSize: 13.5 }}>
                  <Hl text={v.title} q={q} />
                </div>
                <div className="mute nowrap" style={{ fontSize: 11.5 }}>
                  {videoCategoryLabel[v.category]} · {v.year} · {mmss(v.duration)} · {playCount(v.views)} 次
                </div>
              </Link>
            ))}
          </div>
        ))}

      {tab === 'sheets' &&
        (hits.sheets.length === 0 ? (
          <Empty
            text="匹配的曲目里还没有录入谱"
            hint="谱库覆盖的是曲库的一部分，可先去谱库看看已有的。"
            action={
              <Link to="/tools/chords" className="btn btn--primary">
                去谱库
              </Link>
            }
          />
        ) : (
          <div className="list">
            <div className="list__head" style={{ gridTemplateColumns: '40px minmax(0,3fr) 1fr 90px 76px' }}>
              <span style={{ textAlign: 'center' }}>#</span>
              <span>曲目</span>
              <span>定弦 / 速度</span>
              <span style={{ textAlign: 'right' }}>难度</span>
              <span />
            </div>
            {hits.sheets.map((s, i) => {
              const sh = sheetMap[s.id]
              return (
                <div key={s.id} className="srow" style={{ gridTemplateColumns: '40px minmax(0,3fr) 1fr 90px 76px' }}>
                  <span className="srow__idx">{i + 1}</span>
                  <div className="srow__title">
                    <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
                    <Link to={`/tools/chords/${s.id}`} className="nowrap" style={{ fontWeight: 550, fontSize: 13 }}>
                      <Hl text={s.title} q={q} />
                    </Link>
                  </div>
                  <span className="mute nowrap mono" style={{ fontSize: 12 }}>
                    {sh.tuning} · {sh.tempoMark}
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <Level n={s.difficulty} />
                  </span>
                  <div className="srow__acts" style={{ opacity: 1 }}>
                    <button className="iconbtn tip" data-tip="播放" style={{ width: 28, height: 28 }} onClick={() => act.playSong(s.id, hits.sheets.map((x) => x.id))}>
                      <Icon name="play" size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

      {tab === 'tags' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          <div className="card card--flat">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>城市（{hits.cities.length}）</div>
            {hits.cities.length === 0 ? (
              <span className="mute" style={{ fontSize: 12.5 }}>
                没有匹配的城市
              </span>
            ) : (
              <div className="chips">
                {hits.cities.map((c) => (
                  <Link key={c} to="/more/tour" className="chip">
                    <Icon name="map" size={12} /> {c}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="card card--flat">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>标签（{hits.tags.length}）</div>
            {hits.tags.length === 0 ? (
              <span className="mute" style={{ fontSize: 12.5 }}>
                没有匹配的标签
              </span>
            ) : (
              <div className="chips">
                {hits.tags.map((t) => (
                  <button key={t} className="chip" onClick={() => setSearch(t)}>
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card card--flat" style={{ gridColumn: '1 / -1' }}>
            <div className="row">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, width: '100%' }}>
                用这些条件组合一下
              </div>
              <button className="btn" onClick={() => nav('/songs')}>
                去曲库筛选
              </button>
            </div>
            <p className="mute" style={{ fontSize: 12, marginTop: 8 }}>
              当前命中的曲目分布在 {new Set(hits.songs.map((s) => s.albumId)).size} 张专辑里，涉及{' '}
              {new Set(hits.songs.map((s) => s.key)).size} 个调性。
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

/** 关键词高亮：只在命中片段上加金色 */
function Hl({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className="gold">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  )
}
