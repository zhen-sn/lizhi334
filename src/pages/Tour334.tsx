import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Section, Tabs, Stat } from '../components/common/Primitives'
import { Cover } from '../components/common/Cover'
import {
  TOUR_NAME,
  TOUR_SLOGAN,
  TOUR_TARGET,
  citiesInYear,
  timeline,
  tourByProvince,
  tourCities,
  tourDoneCount,
  tourProgress,
  tourProvinces,
  tourYears,
} from '../data/tour'
import { songs, allCities } from '../data/songs'
import { albumMap } from '../data/albums'
import { mmss, pct } from '../lib/format'
import { load, save } from '../lib/storage'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'

type View = 'map' | 'list' | 'year' | 'log'
type Filter = 'all' | 'done' | 'todo'

const KIND_LABEL: Record<string, string> = { album: '作品', tour: '巡演', life: '生活', other: '其它' }

export default function Tour334() {
  const nav = useNavigate()
  const act = useSongActions()
  const push = useUi((s) => s.push)
  const search = useUi((s) => s.search)
  const [view, setView] = useState<View>('map')
  const [filter, setFilter] = useState<Filter>('done')
  const [year, setYear] = useState<number>(tourYears[tourYears.length - 1] ?? 2018)
  const [city, setCity] = useState<string>(allCities.includes('南京') ? '南京' : allCities[0] ?? '')

  // 想去的城市：纯本地记录，与后端无关
  const [want, setWant] = useState<string[]>(() => load('tourWishlist', [] as string[]))
  const toggleWant = (c: string) =>
    setWant((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
      save('tourWishlist', next)
      return next
    })

  const q = search.trim().toLowerCase()
  const matched = useMemo(
    () =>
      tourCities.filter((c) => {
        if (filter === 'done' && !c.done) return false
        if (filter === 'todo' && c.done) return false
        if (!q) return true
        return (c.city + c.province + (c.venue ?? '')).toLowerCase().includes(q)
      }),
    [filter, q],
  )

  const citySongs = useMemo(() => songs.filter((s) => s.city === city), [city])
  const todoProvinces = tourByProvince.filter((g) => g.done === 0).map((g) => g.province)
  const perYear = Math.round((tourDoneCount / Math.max(1, tourYears.length)) * 10) / 10

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/more" className="mute">
          更多
        </Link>
        <Icon name="right" size={12} />
        <span>叁叁肆</span>
      </div>

      {/* 总进度 */}
      <div className="card" style={{ marginBottom: 26 }}>
        <div className="row" style={{ gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <ProgressRing value={tourProgress} />
          <div style={{ minWidth: 240, flex: 1 }}>
            <div className="serif" style={{ fontSize: 30, marginBottom: 2 }}>
              {TOUR_NAME}
            </div>
            <div className="mute" style={{ fontSize: 12.5, marginBottom: 14 }}>
              {TOUR_SLOGAN}
            </div>
            <div className="row" style={{ gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div className="serif" style={{ fontSize: 40, lineHeight: 1, color: 'var(--gold)' }}>
                  {tourDoneCount}
                </div>
                <div className="mute" style={{ fontSize: 11 }}>
                  已完成 / {TOUR_TARGET}
                </div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 28, lineHeight: 1.3 }}>
                  {pct(tourProgress)}
                </div>
                <div className="mute" style={{ fontSize: 11 }}>
                  整体进度
                </div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 28, lineHeight: 1.3 }}>
                  {tourByProvince.filter((p) => p.done > 0).length}
                  <span className="mute" style={{ fontSize: 14 }}>
                    /{tourProvinces.length}
                  </span>
                </div>
                <div className="mute" style={{ fontSize: 11 }}>
                  覆盖省级行政区
                </div>
              </div>
            </div>
          </div>
          <div style={{ minWidth: 210 }}>
            <div className="mute" style={{ fontSize: 12, marginBottom: 8 }}>
              各年完成场次
            </div>
            <div className="bars" style={{ height: 92 }}>
              {tourYears.map((y) => {
                const n = citiesInYear(y).length
                const max = Math.max(...tourYears.map((v) => citiesInYear(v).length))
                return (
                  <div key={y} title={`${y}：${n} 场`} style={{ height: `${(n / max) * 100}%` }} />
                )
              })}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              {tourYears.map((y) => (
                <span key={y} className="bars__label" style={{ flex: 1, textAlign: 'center' }}>
                  {String(y).slice(2)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        items={[
          { key: 'map', label: '省份地图' },
          { key: 'list', label: '城市清单', count: matched.length },
          { key: 'year', label: '按年回看' },
          { key: 'log', label: '大事记', count: timeline.length },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'map' && (
        <>
          <Section title="按省份" subtitle="进度条为该省已完成 / 已收录城市数">
            <div className="province-grid">
              {tourByProvince.map((g) => (
                <div className="province" key={g.province}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="province__name">{g.province}</span>
                    <span className="mute mono" style={{ fontSize: 11 }}>
                      {g.done}/{g.cities.length}
                    </span>
                  </div>
                  <div className="province__bar">
                    <div className="province__fill" style={{ width: `${(g.done / g.cities.length) * 100}%` }} />
                  </div>
                  <div className="citylist" style={{ marginTop: 8 }}>
                    {g.cities.slice(0, 8).map((c) => (
                      <button
                        key={c.city}
                        className={`city ${c.done ? 'is-done' : ''}`}
                        style={want.includes(c.city) ? { borderColor: 'var(--gold)', borderStyle: 'dashed' } : undefined}
                        title={c.done ? `${c.year} · ${c.venue}` : `${want.includes(c.city) ? '取消想去' : '标记为想去'}｜计划中`}
                        onClick={() => toggleWant(c.city)}
                      >
                        {c.city}
                      </button>
                    ))}
                    {g.cities.length > 8 && (
                      <span className="mute" style={{ fontSize: 11, alignSelf: 'center' }}>
                        +{g.cities.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {todoProvinces.length > 0 && (
            <Section title="还没有走到的省份" subtitle="尚未安排的城市">
              <div className="chips">
                {todoProvinces.map((p) => (
                  <span className="chip" key={p}>
                    {p}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {view === 'list' && (
        <Section
          title="城市清单"
          subtitle="顶栏搜索可直接筛城市 / 省份 / 场地"
          actions={
            <div className="chips">
              {(
                [
                  { key: 'all', label: '全部' },
                  { key: 'done', label: '已完成' },
                  { key: 'todo', label: '计划中' },
                ] as { key: Filter; label: string }[]
              ).map((o) => (
                <button key={o.key} className={`chip ${filter === o.key ? 'is-on' : ''}`} onClick={() => setFilter(o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="list">
            <div className="list__head" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 70px minmax(0,1.4fr) 110px' }}>
              <span>城市</span>
              <span>省份</span>
              <span>状态</span>
              <span>场地</span>
              <span style={{ textAlign: 'right' }}>操作</span>
            </div>
            {matched.slice(0, 220).map((c) => (
              <div
                key={c.province + c.city}
                className="srow"
                style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 70px minmax(0,1.4fr) 110px', height: 46 }}
              >
                <span className="nowrap" style={{ fontSize: 13.5, fontWeight: c.done ? 600 : 500 }}>
                  {c.city}
                </span>
                <span className="mute nowrap" style={{ fontSize: 12 }}>
                  {c.province}
                </span>
                <span className={c.done ? 'gold' : 'mute'} style={{ fontSize: 12 }}>
                  {c.done ? c.year : '计划'}
                </span>
                <span className="mute nowrap" style={{ fontSize: 12 }}>
                  {c.venue}
                </span>
                <div className="row" style={{ justifyContent: 'flex-end', gap: 6, opacity: 1 }}>
                  <button
                    className={`iconbtn tip ${want.includes(c.city) ? 'is-on' : ''}`}
                    data-tip={want.includes(c.city) ? '取消「想去」' : '标记想去'}
                    style={{ width: 28, height: 28, opacity: 1 }}
                    onClick={() => toggleWant(c.city)}
                  >
                    <Icon name={want.includes(c.city) ? 'heart' : 'heartLine'} size={14} />
                  </button>
                  <button
                    className="iconbtn tip"
                    data-tip="看这个城市的歌"
                    style={{ width: 28, height: 28 }}
                    disabled={!songs.some((s) => s.city === c.city)}
                    onClick={() => setCity(c.city)}
                  >
                    <Icon name="music" size={14} />
                  </button>
                </div>
              </div>
            ))}
            {matched.length === 0 && (
              <div style={{ padding: 26, textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                没有符合条件的城市{search ? `（关键词「${search}」）` : ''}
              </div>
            )}
          </div>
          {matched.length > 220 && (
            <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
              为保证长列表流畅，此处只渲染前 220 行，共 {matched.length} 行 —— 接入后端后改为分页。
            </p>
          )}
          {want.length > 0 && (
            <Section title={`我想去的 ${want.length} 个城市`} subtitle="只存在本机浏览器里，设置页可清除">
              <div className="chips">
                {want.map((c) => (
                  <button key={c} className="chip is-on" onClick={() => toggleWant(c)}>
                    {c} <Icon name="close" size={12} />
                  </button>
                ))}
              </div>
            </Section>
          )}
        </Section>
      )}

      {view === 'year' && (
        <Section title="按年回看" subtitle="只列出已完成场次">
          <div className="chips" style={{ marginBottom: 18 }}>
            {tourYears.map((y) => (
              <button key={y} className={`chip ${year === y ? 'is-on' : ''}`} onClick={() => setYear(y)}>
                {y} · {citiesInYear(y).length} 场
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="serif" style={{ fontSize: 34, color: 'var(--gold)' }}>
              {year}
            </div>
            <span className="mute" style={{ fontSize: 13, alignSelf: 'flex-end' }}>
              当年覆盖 {new Set(citiesInYear(year).map((c) => c.province)).size} 个省级行政区
            </span>
          </div>
          <div className="citylist" style={{ marginTop: 0 }}>
            {citiesInYear(year).map((c) => (
              <span className="city is-done" key={c.city} title={`${c.province} · ${c.venue}`}>
                {c.city}
              </span>
            ))}
          </div>
          <p className="mute" style={{ fontSize: 12, marginTop: 14 }}>
            把这一年当成「巡演年历」来读：{year} 年走的路线，可以在下面的曲目对照里听到对应的城市。
          </p>
        </Section>
      )}

      {view === 'log' && (
        <Section title="巡演大事记" subtitle="与百科年表同源">
          <div className="tl-vertical">
            {timeline
              .filter((t) => t.kind === 'tour' || t.kind === 'other')
              .map((t) => (
                <div className="tlv" key={t.date}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="tlv__date">{t.date}</span>
                    <span className="tag">{KIND_LABEL[t.kind]}</span>
                  </div>
                  <div className="tlv__title">{t.title}</div>
                  <div className="tlv__text">{t.text}</div>
                </div>
              ))}
          </div>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, margin: '30px 0 26px' }}>
        <Stat value={tourCities.length} label="已收录城市数" />
        <Stat value={tourDoneCount} label="已完成场次" />
        <Stat value={perYear} label="平均每年场次" />
        <Stat value={want.length} label="我想去的城市" />
      </div>

      <Section title="城市对应的歌" subtitle="巡演路线和曲目是同一件事的两面">
        <div className="chips" style={{ marginBottom: 16 }}>
          {allCities.map((c) => (
            <button key={c} className={`chip ${city === c ? 'is-on' : ''}`} onClick={() => setCity(c)}>
              {c}
            </button>
          ))}
        </div>
        {citySongs.length === 0 ? (
          <p className="mute" style={{ fontSize: 12.5 }}>
            这个城市暂时还没有关联曲目。
          </p>
        ) : (
          <div className="list">
            {citySongs.map((s) => (
              <div
                key={s.id}
                className="srow"
                style={{ gridTemplateColumns: '40px minmax(0,2.2fr) minmax(0,1.4fr) 70px 76px', height: 52 }}
                onClick={() => act.playSong(s.id, citySongs.map((x) => x.id))}
              >
                <span className="srow__idx">
                  <Icon name="play" size={13} />
                </span>
                <div className="srow__title">
                  <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/songs/${s.id}`} className="nowrap" style={{ display: 'block', fontWeight: 550, fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
                      {s.title}
                    </Link>
                    <span className="mute nowrap" style={{ fontSize: 11 }}>
                      {albumMap[s.albumId]?.name} · {s.year}
                    </span>
                  </div>
                </div>
                <span className="mute nowrap" style={{ fontSize: 12 }}>
                  {s.tags.join(' · ')}
                </span>
                <span className="mono mute" style={{ fontSize: 12 }}>
                  {mmss(s.duration)}
                </span>
                <div className="srow__acts" style={{ opacity: 1 }}>
                  <button className="iconbtn tip" data-tip="排到下一首" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); act.enqueueNext(s.id) }}>
                    <Icon name="queue" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn--primary" onClick={() => act.playSong(citySongs[0]?.id ?? songs[0].id, citySongs.map((x) => x.id))}>
            <Icon name="play" size={15} /> 播放这个城市的歌
          </button>
          <button className="btn" onClick={() => nav('/sponsor')}>
            <Icon name="crown" size={15} /> 支持下一场发生
          </button>
        </div>
      </Section>

    </div>
  )
}

/** 单圈进度环：避免引入图表库 */
function ProgressRing({ value }: { value: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="9" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }}
      />
      <text x="64" y="60" textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-serif)" fontSize="22">
        {Math.round(value * 100)}%
      </text>
      <text x="64" y="78" textAnchor="middle" fill="var(--fg-3)" fontSize="10">
        334 城
      </text>
    </svg>
  )
}
