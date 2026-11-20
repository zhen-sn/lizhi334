import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Section, Tabs, Stat } from '../components/common/Primitives'
import { SongList } from '../components/music/SongList'
import { profile, facts, chapters, bandMembers, faqs, awards } from '../data/bio'
import { timeline, TOUR_TARGET, tourDoneCount } from '../data/tour'
import { albums, albumTypeLabel } from '../data/albums'
import { songs, allCities, topSongs } from '../data/songs'
import { useSongActions } from '../hooks/useSongActions'

type TabKey = 'intro' | 'timeline' | 'band' | 'faq' | 'award'

const KIND_LABEL: Record<string, string> = {
  album: '作品',
  tour: '巡演',
  life: '生活',
  other: '其它',
}

export default function Biography() {
  const nav = useNavigate()
  const act = useSongActions()
  const [tab, setTab] = useState<TabKey>('intro')
  const [open, setOpen] = useState<number>(0)
  const [city, setCity] = useState<string>(allCities[0] ?? '南京')

  const citySongs = useMemo(() => songs.filter((s) => s.city === city), [city])
  const entry = useMemo(() => topSongs(8), [])
  const years = useMemo(() => Array.from(new Set(timeline.map((t) => t.year))).sort(), [])

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/more" className="mute">
          更多
        </Link>
        <Icon name="right" size={12} />
        <span>李志百科</span>
      </div>

      <div className="card" style={{ marginBottom: 26 }}>
        <div className="row" style={{ gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Cover seed={profile.name + profile.alias} title={profile.name} size={128} glyphSize={54} />
          <div style={{ minWidth: 260, flex: 1 }}>
            <h1 className="serif" style={{ fontSize: 34, marginBottom: 4 }}>
              {profile.name}
            </h1>
            <div className="mute mono" style={{ fontSize: 12, marginBottom: 12 }}>
              {profile.alias} · {profile.base} · {profile.activeSince}—
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.85, color: 'var(--fg-2)', maxWidth: 680 }}>
              {profile.intro}
            </p>
            <div className="chips" style={{ marginTop: 14 }}>
              {profile.roles.map((r) => (
                <span className="chip is-on" key={r}>
                  {r}
                </span>
              ))}
              {profile.genres.map((g) => (
                <span className="tag" key={g}>
                  {g}
                </span>
              ))}
              {profile.instruments.map((i) => (
                <span className="tag" key={i}>
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
        <Stat value={albums.length} label="收录专辑" />
        <Stat value={songs.length} label="收录曲目" />
        <Stat value={`${tourDoneCount}/${TOUR_TARGET}`} label="巡演城市" />
        <Stat value={chapters.length} label="长文章节" />
      </div>

      <Tabs
        items={[
          { key: 'intro', label: '分期长文' },
          { key: 'timeline', label: '年表', count: timeline.length },
          { key: 'band', label: '乐队成员', count: bandMembers.length },
          { key: 'faq', label: '问答', count: faqs.length },
          { key: 'award', label: '荣誉', count: awards.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'intro' &&
        chapters.map((c, i) => (
          <Section key={c.title} title={c.title} subtitle={`第 ${i + 1} 章`}>
            <div className="card card--flat">
              {c.paras.map((p, j) => (
                <p key={j} style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--fg-2)', marginBottom: j === c.paras.length - 1 ? 0 : 12 }}>
                  {p}
                </p>
              ))}
            </div>
          </Section>
        ))}

      {tab === 'timeline' && (
        <>
          <div className="chips" style={{ marginBottom: 20 }}>
            <span className="chip is-on">全部 {timeline.length} 条</span>
            {years.map((y) => (
              <Link key={y} to="/more/tour" className="chip" title="到巡演页看这一年的城市">
                {y}
              </Link>
            ))}
          </div>
          <div className="tl-vertical">
            {timeline.map((t) => (
              <div className="tlv" key={t.date}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="tlv__date">{t.date}</span>
                  <span className="tag">{KIND_LABEL[t.kind] ?? t.kind}</span>
                </div>
                <div className="tlv__title">{t.title}</div>
                <div className="tlv__text">{t.text}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'band' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))' }}>
          {bandMembers.map((m) => (
            <div className="card" key={m.name}>
              <div className="row" style={{ gap: 12 }}>
                <Cover seed={m.name} title={m.name} size={46} glyphSize={18} />
                <div style={{ minWidth: 0 }}>
                  <div className="nowrap" style={{ fontWeight: 600, fontSize: 14 }}>
                    {m.name}
                  </div>
                  <div className="mute" style={{ fontSize: 12 }}>
                    {m.instrument} · {m.since} 年加入
                  </div>
                </div>
              </div>
              <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.7, marginTop: 10 }}>
                {m.note}
              </p>
            </div>
          ))}
          <div className="card card--flat">
            <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 6 }}>成员信息</div>
            <p className="mute" style={{ fontSize: 12.5 }}>
              成员名单以乐队官方公布为准，后续可在后台资料中继续补充。
            </p>
          </div>
        </div>
      )}

      {tab === 'faq' && (
        <div className="list" style={{ padding: 0 }}>
          {faqs.map((f, i) => {
            const on = open === i
            return (
              <div key={f.q} style={{ borderBottom: i === faqs.length - 1 ? 0 : '1px solid var(--line)' }}>
                <button
                  className="row"
                  style={{ width: '100%', padding: '14px 16px', gap: 10, textAlign: 'left', fontSize: 13.5, fontWeight: 550 }}
                  onClick={() => setOpen(on ? -1 : i)}
                >
                  <Icon name={on ? 'down' : 'right'} size={14} style={{ color: 'var(--gold)' }} />
                  {f.q}
                </button>
                {on && (
                  <div className="mute" style={{ padding: '0 16px 14px 40px', fontSize: 12.5, lineHeight: 1.8 }}>
                    {f.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'award' && (
        <div className="list">
          {awards.length === 0 && (
            <p className="mute" style={{ padding: '16px', fontSize: 12.5 }}>
              暂无收录的荣誉记录。
            </p>
          )}
          {awards.map((a) => (
            <div className="srow" key={a.name} style={{ gridTemplateColumns: '70px minmax(0,1fr) minmax(0,1.2fr)', height: 54 }}>
              <span className="mono" style={{ color: 'var(--gold)', fontSize: 13 }}>
                {a.year}
              </span>
              <span className="nowrap" style={{ fontWeight: 550, fontSize: 13.5 }}>
                <Icon name="star" size={13} style={{ marginRight: 7, color: 'var(--gold)' }} />
                {a.name}
              </span>
              <span className="mute nowrap" style={{ fontSize: 12 }}>
                {a.note}
              </span>
            </div>
          ))}
        </div>
      )}


      <Section title="唱片目录" subtitle="按发行顺序" more="专辑页" onMore={() => nav('/songs')}>
        <div className="grid grid--albums">
          {[...albums]
            .sort((a, b) => a.year - b.year)
            .map((a) => (
              <Link key={a.id} to={`/songs/album/${a.id}`} className="card card--hover" style={{ padding: 12 }}>
                <Cover seed={a.name} title={a.name} year={a.year} glyphSize={30} />
                <div className="album-card__title nowrap">{a.name}</div>
                <div className="album-card__sub">
                  {a.year} · {albumTypeLabel[a.type]} · {a.songIds.length} 首
                </div>
              </Link>
            ))}
        </div>
      </Section>

    </div>
  )
}
