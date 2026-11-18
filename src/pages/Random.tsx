import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { SongList } from '../components/music/SongList'
import { DemoNotice, Empty, Level, Section, Stat } from '../components/common/Primitives'
import { songMap, songs } from '../data/songs'
import { albumMap } from '../data/albums'
import { sheetMap } from '../data/chords'
import { hash32, pickBySeed } from '../lib/hash'
import { humanTime, mmss, todayKey } from '../lib/format'
import { load, save } from '../lib/storage'
import { useLibrary } from '../store/library'
import { usePlayer } from '../store/player'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'
import type { Song } from '../data/types'

/**
 * /random —— 命运模式。
 * 不做筛选，直接从全曲库里摇一首（或摇 1 首直接开播）。
 */
export default function Random() {
  const counts = useLibrary((s) => s.counts)
  const playQueue = usePlayer((s) => s.playQueue)
  const push = useUi((s) => s.push)
  const act = useSongActions()

  const [shown, setShown] = useState<Song | null>(null)
  const [rolling, setRolling] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [rolls, setRolls] = useState(() => load('random.rolls', 0))
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  const poolIds = useMemo(() => songs.map((s) => s.id), [])
  const totalSec = useMemo(() => songs.reduce((a, s) => a + s.duration, 0), [])

  /** 今日签：同一天的确定性结果，不点也不会变 */
  const daily = useMemo(() => pickBySeed(songs, hash32(todayKey())), [])

  const stopRoll = () => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    setRolling(false)
  }

  const roll = () => {
    stopRoll()
    setRolling(true)
    let step = 0
    timer.current = setInterval(() => {
      step++
      setShown(songs[Math.floor(Math.random() * songs.length)])
      if (step >= 16) {
        const final = songs[Math.floor(Math.random() * songs.length)]
        stopRoll()
        setShown(final)
        const n = rolls + 1
        setRolls(n)
        save('random.rolls', n)
        setLog((l) => [final.id, ...l].slice(0, 8))
      }
    }, 55)
  }

  /** 摇 1 首并直接开播 */
  const rollAndPlay = () => {
    stopRoll()
    const picked = songs[Math.floor(Math.random() * songs.length)]
    playQueue([picked.id], 0)
    setShown(picked)
    setLog((l) => [picked.id, ...l].slice(0, 8))
    push('摇出 1 首，已经开始播了', 'good')
  }

  return (
    <div>
      <header className="page-head">
        <h1>命运模式</h1>
        <p>不知道听什么的时候，把选择权交出去：直接从曲库里摇一首。</p>
      </header>

      <div
        className="card"
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '26px 22px',
          marginBottom: 24,
        }}
      >
        
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          {shown ? (
            <>
              <div className="mute mono" style={{ fontSize: 11, letterSpacing: '0.2em', marginBottom: 6 }}>
                {rolling ? 'ROLLING…' : 'PICKED'}
              </div>
              <h2 className="serif nowrap" style={{ fontSize: 26, marginBottom: 6 }}>
                {shown.title}
              </h2>
              <p className="mute nowrap" style={{ fontSize: 12.5, marginBottom: 10 }}>
                {albumMap[shown.albumId]?.name} · {shown.year} · {mmss(shown.duration)} · {shown.bpm} BPM ·{' '}
                {shown.key}
              </p>
              <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <Level n={shown.difficulty} />
                <span className="tag mono">{shown.capo ? `Capo ${shown.capo}` : '不夹 Capo'}</span>
                {shown.city && <span className="tag">{shown.city}</span>}
                {sheetMap[shown.id] ? <span className="tag">有谱</span> : <span className="tag">暂无谱</span>}
                <span className="tag mono">听过 {counts[shown.id] ?? 0} 次</span>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn--primary"
                  onClick={() => act.playSong(shown.id, poolIds)}
                  disabled={rolling}
                >
                  <Icon name="play" size={15} /> 播放这首
                </button>
                <button className="btn" onClick={() => act.enqueueNext(shown.id)} disabled={rolling}>
                  <Icon name="queue" size={15} /> 排到下一首
                </button>
                <button
                  className={`btn ${act.isFav(shown.id) ? 'is-on' : ''}`}
                  onClick={() => act.fav(shown.id)}
                  disabled={rolling}
                >
                  <Icon name={act.isFav(shown.id) ? 'heart' : 'heartLine'} size={15} />
                  {act.isFav(shown.id) ? '已喜欢' : '喜欢'}
                </button>
                <Link to={`/songs/${shown.id}`} className="btn btn--ghost">
                  详情 <Icon name="right" size={14} />
                </Link>
              </div>
            </>
          ) : (
            <div>
              <div className="mute mono" style={{ fontSize: 11, letterSpacing: '0.2em', marginBottom: 8 }}>
                NOT ROLLED YET
              </div>
              <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>
                点下面的按钮摇一首
              </h2>
              <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                全库 {songs.length} 首 · 合计 {humanTime(totalSec)}。
              </p>
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={roll}>
              <Icon name="dice" size={15} /> {rolling ? '摇…' : '摇一首'}
            </button>
            <button className="btn" onClick={rollAndPlay}>
              <Icon name="shuffle" size={15} /> 摇 1 首直接播
            </button>
          </div>
        </div>
      </div>

      {log.length > 0 ? (
        <Section
          title="这次摇出来的"
          subtitle="只是本次会话的记录，刷新就没了"
          actions={
            <button
              className="section__more"
              onClick={() => {
                setLog([])
                setShown(null)
              }}
            >
              清空
            </button>
          }
        >
          <SongList songs={log.map((id) => songMap[id]).filter(Boolean)} head={false} showAlbum showKey />
          <div className="row" style={{ marginTop: 14 }}>
            <button
              className="btn"
              onClick={() => {
                playQueue(log, 0)
                push('把摇出来的这些排成队列', 'good')
              }}
            >
              <Icon name="play" size={15} /> 全部按顺序播
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                log.forEach((id) => {
                  if (!useLibrary.getState().isFav(id)) useLibrary.getState().toggleFav(id)
                })
                push(`已把 ${log.length} 首收进「我喜欢」`, 'good')
              }}
            >
              <Icon name="heart" size={15} /> 全部喜欢
            </button>
          </div>
        </Section>
      ) : (
        <Empty text="还没有摇过" hint="点「摇一首」试试运气。" />
      )}

      <DemoNotice>
        随机只从本地曲库里挑，不涉及任何推荐算法。接后端后可以把随机逻辑换成{' '}
        <code className="mono">GET /songs/random</code>，页面结构不用改。
      </DemoNotice>
    </div>
  )
}
