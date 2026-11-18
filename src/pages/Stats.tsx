import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Section, Stat, DemoNotice, Empty, Level } from '../components/common/Primitives'
import { achievements } from '../data/achievements'
import { albums, albumMap } from '../data/albums'
import { songs, songMap, allCities } from '../data/songs'
import { sheetMap } from '../data/chords'
import { humanTime, mmss, todayKey } from '../lib/format'
import { useLibrary, nightPlayCount } from '../store/library'
import { useSongActions } from '../hooks/useSongActions'

/** 最近 n 天的日期键与星期，含今天（按本地日期计算，避免 UTC 偏移） */
function lastDays(n: number) {
  const out: { key: string; wd: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ key: todayKey(d), wd: d.getDay() })
  }
  return out
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function Stats() {
  const nav = useNavigate()
  const act = useSongActions()
  const lib = useLibrary()
  const snap = useMemo(() => lib.stats(), [lib])

  const days = useMemo(() => lastDays(14), [])
  const dayValues = days.map((d) => lib.daily[d.key] ?? 0)
  const maxDay = Math.max(60, ...dayValues)
  const active = dayValues.filter((v) => v > 0).length

  const top = useMemo(
    () =>
      Object.entries(lib.counts)
        .filter(([id, n]) => songMap[id] && n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
    [lib.counts],
  )

  const albumCover = useMemo(
    () =>
      albums
        .map((a) => {
          const list = songs.filter((s) => s.albumId === a.id)
          const heard = list.filter((s) => (lib.counts[s.id] ?? 0) > 0).length
          return { a, heard, total: list.length }
        })
        .sort((x, y) => y.heard / y.total - x.heard / x.total),
    [lib.counts],
  )

  const cityHeard = useMemo(() => {
    const m = new Map<string, number>()
    for (const id of Object.keys(lib.counts)) {
      const s = songMap[id]
      if (s?.city && (lib.counts[id] ?? 0) > 0) m.set(s.city, (m.get(s.city) ?? 0) + lib.counts[id])
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [lib.counts])

  const difficultySpread = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5].map((d) => ({
      d,
      heard: Object.keys(lib.counts).filter((id) => songMap[id]?.difficulty === d && lib.counts[id] > 0).length,
    }))
    const max = Math.max(1, ...buckets.map((b) => b.heard))
    return buckets.map((b) => ({ ...b, p: b.heard / max }))
  }, [lib.counts])

  const empty = snap.playCount === 0
  const favSheets = lib.favorites.filter((id) => sheetMap[id]).length

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/more" className="mute">
          更多
        </Link>
        <Icon name="right" size={12} />
        <span>听歌报告</span>
      </div>

      <div className="report-hero">
        <div className="mute" style={{ fontSize: 11, letterSpacing: '0.26em', marginBottom: 8, color: 'var(--gold)' }}>
          LOCAL LISTENING REPORT
        </div>
        <h2>{empty ? '还没有属于你的记录' : `你在这里听了 ${snap.playCount} 次`}</h2>
        <p className="mute" style={{ fontSize: 13, maxWidth: 680, lineHeight: 1.8 }}>
          {empty
            ? '所有统计都发生在你自己的浏览器里：不上传、不比对、不排名。随便点开一首，这张报告就会开始生长。'
            : `累计 ${humanTime(snap.totalSeconds)}，听过 ${snap.playedIds.length} / ${songs.length} 首不同曲目，收藏 ${snap.favoriteCount} 首，完整听完 ${snap.completedSongs} 次，连续打开 ${snap.consecutiveDays} 天。`}
        </p>
        <div className="row" style={{ marginTop: 18, gap: 10, flexWrap: 'wrap' }}>
          {!empty && (
            <button className="btn btn--primary" onClick={() => top[0] && act.playSong(top[0][0], top.map((t) => t[0]))}>
              <Icon name="play" size={15} /> 重听你最常播放的那首
            </button>
          )}
          <Link to={empty ? '/songs' : '/playlist/fav'} className="btn">
            {empty ? '去曲库开始' : '去「我喜欢」'}
          </Link>
          <button className="btn" onClick={() => nav('/settings')}>
            <Icon name="download" size={15} /> 导出我的数据
          </button>
        </div>
      </div>

      {empty ? (
        <Empty
          text="暂时没有播放记录"
          hint="随便播放一首，或先看看别人的入口：主页每日推荐、命运模式。"
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/songs" className="btn btn--primary">
                浏览曲库
              </Link>
              <Link to="/random" className="btn">
                <Icon name="dice" size={15} /> 随机一首
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 14, marginBottom: 30 }}>
            <Stat value={snap.playCount} label="总播放次数" />
            <Stat value={humanTime(snap.totalSeconds)} label="累计时长" />
            <Stat value={`${snap.playedIds.length}/${songs.length}`} label="听过的不同曲目" />
            <Stat value={snap.favoriteCount} label="收藏" />
            <Stat value={snap.completedSongs} label="完整听完" />
            <Stat value={`${snap.consecutiveDays} 天`} label="连续打开" />
          </div>

          <Section title="最近两周" subtitle={`${active} 天有收听 · 单位：分钟`}>
            <div className="card card--flat">
              <div className="bars">
                {days.map((d, i) => {
                  const v = dayValues[i]
                  return (
                    <div key={d.key} className="bars__wrap">
                      <div
                        title={`${d.key} · ${Math.round(v / 60)} 分钟`}
                        style={{ height: `${(v / maxDay) * 100}%`, minHeight: v > 0 ? 4 : 2, opacity: v > 0 ? 0.9 : 0.25 }}
                      />
                      <span className="bars__label">{WEEKDAYS[d.wd]}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
                柱高按当天收听的秒数折算；模拟播放（未绑定音频文件）同样会计时，方便你验证统计链路。
              </p>
            </div>
          </Section>

          <Section title="你的榜单" subtitle="按你自己的播放次数" more="全部曲目" onMore={() => nav('/songs')}>
            <div className="list">
              <div className="list__head" style={{ gridTemplateColumns: '40px minmax(0,3fr) 90px 80px 76px' }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span>曲目</span>
                <span>所属专辑</span>
                <span style={{ textAlign: 'right' }}>你的次数</span>
                <span />
              </div>
              {top.map(([id, n], i) => {
                const s = songMap[id]
                return (
                  <div
                    key={id}
                    className={`srow ${lib.history[0]?.songId === id ? 'is-current' : ''}`}
                    style={{ gridTemplateColumns: '40px minmax(0,3fr) 90px 80px 76px' }}
                    onClick={() => act.playSong(id, top.map((t) => t[0]))}
                  >
                    <span className="srow__idx">{i + 1}</span>
                    <div className="srow__title">
                      <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
                      <div style={{ minWidth: 0 }}>
                        <span className="nowrap" style={{ display: 'block', fontWeight: 550, fontSize: 13 }}>
                          {s.title}
                        </span>
                        <span className="mute nowrap" style={{ fontSize: 11 }}>
                          {mmss(s.duration)} · 停在 {mmss(lib.lastPos[s.id] ?? 0)}
                          {s.capo ? ` · Capo ${s.capo}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="mute nowrap" style={{ fontSize: 12 }}>
                      {albumMap[s.albumId]?.name}
                    </span>
                    <span className="mono" style={{ textAlign: 'right', color: 'var(--gold)' }}>
                      {n}
                    </span>
                    <div className="srow__acts" style={{ opacity: 1 }}>
                      <Level n={s.difficulty} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="按专辑的完成度" subtitle="听完一整张会解锁对应徽章">
            <div className="card card--flat" style={{ display: 'grid', gap: 12 }}>
              {albumCover.map(({ a, heard, total }) => (
                <div key={a.id}>
                  <div className="row" style={{ fontSize: 12, marginBottom: 5 }}>
                    <Link to={`/songs/album/${a.id}`} className="nowrap" style={{ maxWidth: 260 }}>
                      {a.name}
                    </Link>
                    <span className="mute mono" style={{ fontSize: 11 }}>
                      {a.year}
                    </span>
                    <div className="spacer" />
                    <span className="mute mono" style={{ fontSize: 11 }}>
                      {heard}/{total}
                    </span>
                  </div>
                  <div className="province__bar">
                    <div className="province__fill" style={{ width: `${(heard / total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="口味分布">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
              <div className="card card--flat">
                <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 12 }}>按难度</div>
                {difficultySpread.map((b) => (
                  <div className="row" key={b.d} style={{ gap: 10, marginBottom: 8 }}>
                    <span className="mute mono" style={{ width: 42, fontSize: 12 }}>
                      Lv.{b.d}
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-3)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${b.p * 100}%`, height: '100%', background: 'var(--gold)' }} />
                    </div>
                    <span className="mute mono" style={{ width: 28, textAlign: 'right', fontSize: 12 }}>
                      {b.heard}
                    </span>
                  </div>
                ))}
              </div>
              <div className="card card--flat">
                <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 12 }}>按城市</div>
                {cityHeard.length === 0 ? (
                  <p className="mute" style={{ fontSize: 12.5 }}>
                    你还没听过带城市标签的曲目。当前曲库里有 {allCities.length} 个地名。
                  </p>
                ) : (
                  <div className="chips">
                    {cityHeard.map(([c, n]) => (
                      <Link key={c} to="/songs" className="chip">
                        {c} <span className="mono" style={{ fontSize: 11, opacity: 0.75 }}>×{n}</span>
                      </Link>
                    ))}
                  </div>
                )}
                <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>
                  收藏里有 {favSheets} 首已经收录了和弦谱，去谱库可以接着练。
                </p>
              </div>
            </div>
          </Section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 14, margin: '6px 0 30px' }}>
            <Stat value={lib.playlists.length} label="自建歌单" />
            <Stat value={lib.history.length} label="保留的历史记录" />
            <Stat value={snap.unlockedKeys} label="变调夹换算次数" />
            <Stat value={nightPlayCount()} label="深夜收听次数" />
          </div>
        </>
      )}

      <Section title="徽章" subtitle={`已解锁 ${lib.unlocked.length} / ${achievements.length}`}>
        <div className="badge-grid">
          {achievements.map((a) => {
            const got = lib.unlocked.includes(a.id)
            return (
              <div className={`badge ${got ? 'is-got' : ''}`} key={a.id}>
                <div className="badge__ic">{a.icon}</div>
                <div className="badge__name">{a.name}</div>
                <div className="badge__hint">{got ? '已达成' : a.hint}</div>
              </div>
            )
          })}
        </div>
        <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>
          判定全部在本地完成，换一台设备需要同步数据后才能延续（设置页支持导出 / 导入 JSON）。
        </p>
      </Section>

      <DemoNotice>
        本页数据来自 localStorage（命名空间 lz334:），不会上传；清除浏览器数据即重置。演示曲目本身播放量为占位数值，与你的统计分开计算。
      </DemoNotice>
    </div>
  )
}
