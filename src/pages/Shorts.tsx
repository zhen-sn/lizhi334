import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Drawer } from '../components/common/Overlays'
import { DemoNotice } from '../components/common/Primitives'
import { CommentSection } from '../components/comments/CommentSection'
import { shorts, type Short } from '../data/shorts'
import { coverPalette } from '../lib/hash'
import { mmss } from '../lib/format'
import { copyText } from '../lib/share'
import { useComments } from '../store/comments'
import { useShorts } from '../store/shorts'
import { useUi } from '../store/ui'

/** 12800 → 1.3w；3200 → 3.2k */
function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** 每次进页面重新洗牌，刷到的顺序不固定 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Shorts() {
  const [cur, setCur] = useState(0)
  const [paused, setPaused] = useState(false)
  const [sp] = useSearchParams()
  /* 每次进页面重新洗牌，顺序不固定 */
  const list = useMemo(() => shuffle(shorts), [])
  const stageRef = useRef<HTMLDivElement>(null)
  /* 滑动切换后短暂忽略 click，避免顺手把视频暂停了 */
  const swipeAt = useRef(0)

  const pick = (i: number) => {
    if (i === cur || i < 0 || i >= list.length) return
    setCur(i)
    setPaused(false)
  }

  /* 按洗牌后的顺序上/下切换，到头绕回 */
  const go = useCallback(
    (dir: 1 | -1) => {
      setCur((c) => (c + dir + list.length) % list.length)
      setPaused(false)
    },
    [list.length],
  )

  /* 随机换一条，不和当前重复 */
  const goRandom = () => {
    if (list.length < 2) return
    let n = cur
    while (n === cur) n = Math.floor(Math.random() * list.length)
    pick(n)
  }

  /* 分享出去带 ?s=id 时，直接定位到那一条 */
  useEffect(() => {
    const sid = sp.get('s')
    if (!sid) return
    const idx = list.findIndex((x) => x.id === sid)
    if (idx > 0) setCur(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 电脑端：鼠标滚轮切换 */
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let locked = false
    let timer: number | undefined
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 6) return
      e.preventDefault()
      if (locked) return
      locked = true
      go(e.deltaY > 0 ? 1 : -1)
      timer = window.setTimeout(() => {
        locked = false
      }, 400)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.clearTimeout(timer)
    }
  }, [go])

  /* 手机端：上下滑动切换 */
  const touchY = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchY.current == null) return
    const dy = touchY.current - e.changedTouches[0].clientY
    touchY.current = null
    if (Math.abs(dy) < 44) return
    swipeAt.current = Date.now()
    go(dy > 0 ? 1 : -1)
  }

  const togglePause = () => {
    if (Date.now() - swipeAt.current < 350) return
    setPaused((p) => !p)
  }

  const s = list[cur]

  return (
    <div className="shorts">
      <header className="page-head">
        <h1>短视频</h1>
        <p>水友拍的三十秒现场、排练室片段和日常。滚轮或上下滑动换一条，点击画面暂停。</p>
      </header>

      <div className="shorts__layout">
        <div
          className="shorts__stage"
          ref={stageRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ShortItem key={s.id} s={s} active={!paused} onToggle={togglePause} onNext={() => go(1)} />

          <div className="shorts__ctrl">
            <button className="btn btn--ghost" onClick={goRandom}>
              <Icon name="dice" size={15} /> 随机换一条
            </button>
            <span className="shorts__hint">滚轮 / 滑动切换</span>
          </div>
        </div>

        <aside className="shorts__side">
          <div className="card card--flat">
            <div className="shorts__sidehd">精选</div>
            <div className="shorts__list">
              {list.map((it, i) => (
                <button
                  key={it.id}
                  className={`shorts__row ${i === cur ? 'is-on' : ''}`}
                  onClick={() => pick(i)}
                >
                  <Cover seed={it.title} title={it.title} size={34} glyphSize={14} />
                  <span className="shorts__rowtxt">
                    <b>{it.title}</b>
                    <em>
                      @{it.author} · {fmt(it.views)} 播放
                    </em>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="card card--flat">
            <div className="shorts__sidehd">你也拍了？</div>
            <p className="mute" style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
              现场切片、花絮、翻唱都可以投，审核通过后会出现在这里。
            </p>
            <Link to="/upload" className="btn btn--primary btn--block">
              <Icon name="upload" size={15} /> 上传短视频
            </Link>
          </div>
        </aside>
      </div>

    </div>
  )
}

function ShortItem({
  s,
  active,
  onToggle,
  onNext,
}: {
  s: Short
  active: boolean
  onToggle: () => void
  onNext: () => void
}) {
  const pal = useMemo(() => coverPalette(s.title), [s.title])
  const liked = useShorts((st) => st.liked.includes(s.id))
  const saved = useShorts((st) => st.saved.includes(s.id))
  const toggleLike = useShorts((st) => st.toggleLike)
  const toggleSave = useShorts((st) => st.toggleSave)
  const push = useUi((st) => st.push)
  const cmtCount = useComments((st) => st.byTarget[`short:${s.id}`]?.length ?? 0)

  const [t, setT] = useState(0)
  const [cmt, setCmt] = useState(false)

  useEffect(() => {
    if (!active) {
      setT(0)
      return
    }
    const id = setInterval(() => setT((v) => Math.min(s.duration, v + 0.25)), 250)
    return () => clearInterval(id)
  }, [active, s.duration])

  useEffect(() => {
    if (active && t >= s.duration) onNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, active, s.duration])

  const pct = s.duration > 0 ? Math.min(1, t / s.duration) : 0
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div className="short">
      <div className={`short__card ${active ? 'is-playing' : ''}`} onClick={onToggle}>
        <div className="short__poster" style={{ background: `linear-gradient(158deg, ${pal.from}, ${pal.to})` }} />
        <div className="short__glyph serif">{s.title.slice(0, 1)}</div>
        <div className="short__scrim" />
        {active && <div className="short__scan" aria-hidden />}

        <div className="short__top">
          <div className="spacer" />
          <span className="short__chip mono">{mmss(s.duration)}</span>
          {s.city && <span className="short__chip">{s.city}</span>}
        </div>

        {!active && (
          <div className="short__play" aria-hidden>
            <Icon name="play" size={24} />
          </div>
        )}

        <div className="short__info">
          <div className="short__author">
            <Icon name="user" size={13} /> @{s.author}
          </div>
          <h3 className="short__title">{s.title}</h3>
          <p className="short__desc">{s.desc}</p>
          <div className="short__tags">
            {s.tags.map((tg) => (
              <span className="short__tag" key={tg}>
                #{tg}
              </span>
            ))}
          </div>
          {s.song && (
            <div className="short__music">
              <Icon name="music" size={13} /> {s.song} · 原声
            </div>
          )}
        </div>

        <div className="short__rail" onClick={(e) => e.stopPropagation()}>
          <button
            className={`shortact ${liked ? 'is-on' : ''}`}
            onClick={stop(() => {
              toggleLike(s.id)
              push(liked ? '已取消点赞' : '已点赞', liked ? undefined : 'good')
            })}
            aria-label="点赞"
          >
            <span className="shortact__ic">
              <Icon name={liked ? 'heart' : 'heartLine'} size={19} />
            </span>
            <em>{fmt(s.likes + (liked ? 1 : 0))}</em>
          </button>

          <button className="shortact" onClick={stop(() => setCmt(true))} aria-label="评论">
            <span className="shortact__ic">
              <Icon name="chat" size={19} />
            </span>
            <em>{fmt(s.comments + cmtCount)}</em>
          </button>

          <button
            className={`shortact ${saved ? 'is-on' : ''}`}
            onClick={stop(() => {
              toggleSave(s.id)
              push(saved ? '已取消收藏' : '已收藏到「短视频收藏」', saved ? undefined : 'good')
            })}
            aria-label="收藏"
          >
            <span className="shortact__ic">
              <Icon name="bookmark" size={19} />
            </span>
            <em>{fmt(s.saves + (saved ? 1 : 0))}</em>
          </button>

          <button
            className="shortact"
            onClick={stop(async () => {
              const url = `${location.origin}${location.pathname}#/shorts?s=${s.id}`
              const ok = await copyText(`${s.title} · 短视频 | ${url}`)
              push(ok ? '链接已复制，可以分享了' : '复制失败，请手动复制地址栏', ok ? 'good' : undefined)
            })}
            aria-label="分享"
          >
            <span className="shortact__ic">
              <Icon name="share" size={19} />
            </span>
            <em>分享</em>
          </button>
        </div>

        <div className="short__prog">
          <i style={{ width: `${pct * 100}%` }} />
        </div>
      </div>

      {cmt && (
        <Drawer title={`评论 · ${s.title}`} onClose={() => setCmt(false)}>
          <CommentSection target={`short:${s.id}`} title="评论" />
        </Drawer>
      )}
    </div>
  )
}
