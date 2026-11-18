import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Section, PlayAll, Stat, Level } from '../components/common/Primitives'
import { Cover } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { SongList } from '../components/music/SongList'
import { banners, quotes } from '../data/quotes'
import { albums, albumMap } from '../data/albums'
import { songs, songMap, topSongs } from '../data/songs'
import { timeline, TOUR_TARGET, tourDoneCount, tourProgress } from '../data/tour'
import { profile } from '../data/bio'
import { payChannels } from '../data/sponsors'
import { greeting, todayKey, mmss, pct } from '../lib/format'
import { pickBySeed, hash32 } from '../lib/hash'
import { copyText } from '../lib/share'
import { usePlayer } from '../store/player'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'

const TOOLS = [
  { to: '/tools/chords', icon: 'guitar', title: '吉他谱', desc: '段落和弦走向 + 弹唱提示' },
  { to: '/tools/metronome', icon: 'metro', title: '节拍器', desc: '按曲目 BPM 直接开始' },
  { to: '/tools/tuner', icon: 'tuner', title: '调音器', desc: '麦克风测音 + 六弦参照' },
  { to: '/tools/capo', icon: 'music', title: '变调夹换算', desc: '想唱的调 → 顺手的指型' },
]

export default function Home() {
  const nav = useNavigate()
  const act = useSongActions()
  const push = useUi((s) => s.push)
  const history = useLibrary((s) => s.history)
  const lastPos = useLibrary((s) => s.lastPos)
  const counts = useLibrary((s) => s.counts)
  const stats = useLibrary((s) => s.stats())
  const playQueue = usePlayer((s) => s.playQueue)
  const [slide, setSlide] = useState(0)

  // 轮播：6.5 秒一格，鼠标移入暂停
  useEffect(() => {
    const t = setInterval(() => setSlide((i) => (i + 1) % banners.length), 6500)
    return () => clearInterval(t)
  }, [])

  const daySeed = hash32(todayKey())
  const daily = useMemo(() => pickBySeed(songs, daySeed), [])
  const quote = useMemo(() => pickBySeed(quotes, daySeed + 7), [])
  const resume = history[0] ? songMap[history[0].songId] : undefined
  const hot = useMemo(() => topSongs(10), [])
  const newest = useMemo(() => [...albums].sort((a, b) => b.year - a.year).slice(0, 6), [])

  return (
    <div>
      {/* ---------- Banner ---------- */}
      <div className="banner" role="region" aria-label="重点内容">
        {banners.map((b, i) => (
          <div
            key={b.title}
            className={`banner__slide ${i === slide ? 'is-on' : ''}`}
            style={{ background: `linear-gradient(120deg, hsl(${b.hue} 38% 22%), hsl(${(b.hue + 60) % 360} 30% 12%))` }}
          >
            <div className="banner__scrim" />
            <div className="banner__text">
              <div className="banner__kicker">{b.kicker}</div>
              <h1 className="banner__title">{b.title}</h1>
              <p className="banner__desc">{b.desc}</p>
              <div className="row">
                {b.songId && (
                  <button
                    className="btn btn--primary"
                    onClick={() => act.playSong(b.songId!, songs.map((s) => s.id))}
                  >
                    <Icon name="play" size={15} /> 播放
                  </button>
                )}
                {b.to && (
                  <button className="btn" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.35)' }} onClick={() => nav(b.to!)}>
                    去看看 <Icon name="right" size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="banner__dots">
          {banners.map((_, i) => (
            <i
              key={i}
              className={i === slide ? 'is-on' : ''}
              onClick={() => setSlide(i)}
              aria-label={`第 ${i + 1} 张`}
            />
          ))}
        </div>
      </div>


      {/* ---------- 继续听 ---------- */}
      {resume && (
        <Section title="接着听" subtitle="上次停下的地方">
          <div className="card card--hover" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Cover seed={resume.title} title={resume.title} size={62} glyphSize={22} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 550 }} className="nowrap">
                {resume.title}
              </div>
              <div className="mute" style={{ fontSize: 12 }}>
                {albumMap[resume.albumId]?.name} · 停在 {mmss(lastPos[resume.id] ?? 0)} /{' '}
                {mmss(resume.duration)}
              </div>
            </div>
            <button
              className="playbtn"
              onClick={() => act.playSong(resume.id, [resume.id])}
              aria-label="继续播放"
            >
              <Icon name="play" size={20} />
            </button>
          </div>
        </Section>
      )}


      {/* ---------- 热门 ---------- */}
      <Section
        title="听得最多"
        subtitle="按演示播放量排序"
        more="全部曲目"
        onMore={() => nav('/songs')}
        actions={
          <PlayAll onClick={() => playQueue(hot.map((s) => s.id), 0)} />
        }
      >
        <div className="toplist">
          {hot.map((s, i) => (
            <div
              key={s.id}
              className="toprow"
              onClick={() => act.playSong(s.id, hot.map((x) => x.id))}
            >
              <div className="toprow__rank">{i + 1}</div>
              <Cover seed={s.title} title={s.title} size={44} glyphSize={15} />
              <div style={{ minWidth: 0 }}>
                <div className="toprow__name nowrap">{s.title}</div>
                <div className="toprow__sub nowrap">
                  {albumMap[s.albumId]?.name}{' '}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <span className="mute mono" style={{ fontSize: 11 }}>
                  {counts[s.id] ? `你听过 ${counts[s.id]} 次` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- 专辑 ---------- */}
      <Section title="按专辑听" more="全部专辑" onMore={() => nav('/songs?tab=albums')}>
        <div className="grid grid--albums">
          {newest.map((a) => (
            <Link key={a.id} to={`/songs/album/${a.id}`} className="card card--hover" style={{ padding: 12 }}>
              <Cover seed={a.name} title={a.name} year={a.year} glyphSize={30} />
              <div className="album-card__title nowrap">{a.name}</div>
              <div className="album-card__sub">
                {a.year} · {a.songIds.length} 首
              </div>
            </Link>
          ))}
        </div>
      </Section>

     

      {/* ---------- 大事记 ---------- */}
      <Section title="一条时间线" more="李志百科" onMore={() => nav('/more/biography')}>
        <div className="timeline">
          {timeline.slice(0, 8).map((t) => (
            <div className="tl" key={t.date}>
              <div className="tl__year">{t.date}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
              <div className="tl__text">{t.text}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="随便挑五首" subtitle="按曲目号顺序取的前五首">
        <SongList songs={songs.slice(0, 5)} head={false} showAlbum={false} offset={0} />
      </Section>
    </div>
  )
}
