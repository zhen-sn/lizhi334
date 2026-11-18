import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { SongList } from '../components/music/SongList'
import { Modal } from '../components/common/Overlays'
import { Chips, DemoNotice, Empty, PlayAll, Section, Stat } from '../components/common/Primitives'
import { songMap } from '../data/songs'
import { albumMap } from '../data/albums'
import { mmss, todayKey } from '../lib/format'
import { useLibrary } from '../store/library'
import { usePlayer } from '../store/player'
import { useUi } from '../store/ui'
import { useSongActions } from '../hooks/useSongActions'
import type { HistoryItem } from '../store/library'

type View = 'day' | 'song'

const VIEWS: { key: View; label: string }[] = [
  { key: 'day', label: '按天分组' },
  { key: 'song', label: '按曲目去重' },
]

/** 时间戳 → 当天 hh:mm */
const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

/** 分组标题：今天 / 昨天 / M 月 D 日（周 X） */
function dayLabel(key: string) {
  const today = todayKey()
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yes = todayKey(y)
  if (key === today) return '今天'
  if (key === yes) return '昨天'
  const d = new Date(`${key}T12:00:00`)
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${wd}`
}

export default function History() {
  const lib = useLibrary()
  const playQueue = usePlayer((s) => s.playQueue)
  const currentId = usePlayer((s) => s.currentId)
  const push = useUi((s) => s.push)
  const act = useSongActions()
  const [view, setView] = useState<View>('day')
  const [confirm, setConfirm] = useState(false)

  const valid = useMemo(
    () => lib.history.filter((h) => songMap[h.songId]),
    [lib.history],
  )

  const groups = useMemo(() => {
    const out: { key: string; items: HistoryItem[] }[] = []
    for (const h of valid) {
      const key = todayKey(new Date(h.at))
      const g = out.find((x) => x.key === key)
      if (g) g.items.push(h)
      else out.push({ key, items: [h] })
    }
    return out
  }, [valid])

  /** 按曲目去重：保留最近一次时间，并按被听次数排序 */
  const dedup = useMemo(() => {
    const map = new Map<string, { songId: string; at: number; times: number }>()
    for (const h of valid) {
      const cur = map.get(h.songId)
      if (cur) {
        cur.times++
        cur.at = Math.max(cur.at, h.at)
      } else map.set(h.songId, { songId: h.songId, at: h.at, times: 1 })
    }
    return [...map.values()].sort((a, b) => b.at - a.at)
  }, [valid])

  const uniqIds = dedup.map((d) => d.songId)
  const replayIds = valid.map((h) => h.songId)
  const backMost = [...dedup].sort((a, b) => b.times - a.times)[0]
  const week = useMemo(() => {
    const limit = Date.now() - 7 * 86400000
    return valid.filter((h) => h.at >= limit).length
  }, [valid])

  if (!valid.length) {
    return (
      <div>
        <header className="page-head">
          <h1>最近播放</h1>
          <p>播放过就会记在这里，只存在这台设备上，最多保留最近 100 条。</p>
        </header>
        <Empty
          text="还没有播放记录"
          hint="随便点开一首，这里就会开始积累。"
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/songs" className="btn btn--primary">
                浏览曲库
              </Link>
              <Link to="/random" className="btn">
                <Icon name="dice" size={15} /> 随机来一首
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <header className="page-head">
        <h1>最近播放</h1>
        <p>
          共 {valid.length} 条记录 · {dedup.length} 首不同的歌 · 最近 7 天 {week} 次
        </p>
      </header>

      <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <PlayAll
          onClick={() => {
            playQueue(replayIds, 0)
            push(`按最近播放顺序排了 ${replayIds.length} 首`, 'good')
          }}
          label="重播这段记录"
        />
        <button className="btn" onClick={() => playQueue(uniqIds, 0)}>
          <Icon name="shuffle" size={15} /> 播放去重后的 {uniqIds.length} 首
        </button>
        <div style={{ minWidth: 180 }}>
          <Chips items={VIEWS} value={view} onChange={setView} />
        </div>
        <div className="spacer" />
        <Link to="/more/stats" className="btn btn--ghost">
          <Icon name="star" size={15} /> 听歌报告
        </Link>
        <button className="btn btn--ghost" onClick={() => setConfirm(true)}>
          <Icon name="trash" size={15} /> 清空记录
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 14,
          marginBottom: 26,
        }}
      >
        <Stat value={valid.length} label="记录条数" />
        <Stat value={dedup.length} label="不同曲目" />
        <Stat value={groups.length} label="收听天数" />
        <Stat value={lib.activeDays.length} label="累计打开天数" />
      </div>

      {view === 'day' &&
        groups.map((g) => (
          <Section
            key={g.key}
            title={dayLabel(g.key)}
            subtitle={`${g.items.length} 次播放`}
            actions={
              <button
                className="btn"
                onClick={() => {
                  const ids = g.items.map((h) => h.songId)
                  playQueue(ids, 0)
                }}
              >
                <Icon name="play" size={14} /> 播放这天
              </button>
            }
          >
            <div className="list">
              <div
                className="list__head"
                style={{ gridTemplateColumns: '62px minmax(0,3fr) minmax(0,2fr) 62px 76px' }}
              >
                <span style={{ textAlign: 'center' }}>时间</span>
                <span>曲目</span>
                <span>专辑</span>
                <span style={{ textAlign: 'right' }}>时长</span>
                <span style={{ textAlign: 'right' }}>操作</span>
              </div>
              {g.items.map((h, i) => {
                const s = songMap[h.songId]
                return (
                  <div
                    key={`${h.songId}-${h.at}-${i}`}
                    className={`srow ${s.id === currentId ? 'is-current' : ''}`}
                    style={{ gridTemplateColumns: '62px minmax(0,3fr) minmax(0,2fr) 62px 76px' }}
                    onDoubleClick={() => act.playSong(s.id, g.items.map((x) => x.songId))}
                  >
                    <span className="mono mute" style={{ textAlign: 'center', fontSize: 12 }}>
                      {clock(h.at)}
                    </span>
                    <div className="srow__title">
                      <Cover seed={s.title} title={s.title} size={32} glyphSize={12} />
                      <Link to={`/songs/${s.id}`} className="nowrap" style={{ fontWeight: 550, fontSize: 13 }}>
                        {s.title}
                      </Link>
                    </div>
                    <div className="nowrap" style={{ fontSize: 12 }}>
                      <Link to={`/songs/album/${s.albumId}`} className="dim">
                        {albumMap[s.albumId]?.name}
                      </Link>
                    </div>
                    <span className="mono mute" style={{ textAlign: 'right', fontSize: 12 }}>
                      {mmss(s.duration)}
                    </span>
                    <div className="srow__acts" style={{ opacity: 1, justifyContent: 'flex-end' }}>
                      <button
                        className="iconbtn tip"
                        data-tip="播放"
                        style={{ width: 28, height: 28 }}
                        onClick={() => act.toggle(s.id, g.items.map((x) => x.songId))}
                        aria-label="播放"
                      >
                        <Icon name="play" size={14} />
                      </button>
                      <button
                        className={`iconbtn tip ${act.isFav(s.id) ? 'is-on' : ''}`}
                        data-tip={act.isFav(s.id) ? '取消收藏' : '喜欢'}
                        style={{ width: 28, height: 28 }}
                        onClick={() => act.fav(s.id)}
                        aria-label="喜欢"
                      >
                        <Icon name={act.isFav(s.id) ? 'heart' : 'heartLine'} size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        ))}

      {view === 'song' && (
        <Section title="按曲目去重" subtitle="同一首歌只留一条，按最近一次播放排序；括号里是总次数">
          <div className="list">
            <div
              className="list__head"
              style={{ gridTemplateColumns: '40px minmax(0,3fr) 62px minmax(0,1fr) 92px' }}
            >
              <span style={{ textAlign: 'center' }}>#</span>
              <span>曲目</span>
              <span style={{ textAlign: 'center' }}>次数</span>
              <span>最近一次</span>
              <span style={{ textAlign: 'right' }}>时长</span>
            </div>
            {dedup.map((d, i) => {
              const s = songMap[d.songId]
              return (
                <div
                  key={d.songId}
                  className="srow"
                  style={{ gridTemplateColumns: '40px minmax(0,3fr) 62px minmax(0,1fr) 92px' }}
                  onDoubleClick={() => act.playSong(d.songId, uniqIds)}
                >
                  <span className="srow__idx">{i + 1}</span>
                  <div className="srow__title">
                    <Cover seed={s.title} title={s.title} size={32} glyphSize={12} />
                    <Link to={`/songs/${s.id}`} className="nowrap" style={{ fontWeight: 550, fontSize: 13 }}>
                      {s.title}
                    </Link>
                  </div>
                  <span className="mono" style={{ textAlign: 'center', fontSize: 12, color: 'var(--gold)' }}>
                    {d.times}
                  </span>
                  <span className="mute nowrap" style={{ fontSize: 12 }}>
                    {todayKey(new Date(d.at)) === todayKey() ? `今天 ${clock(d.at)}` : `${dayLabel(todayKey(new Date(d.at)))} ${clock(d.at)}`}
                  </span>
                  <span className="mono mute" style={{ textAlign: 'right', fontSize: 12 }}>
                    {mmss(s.duration)}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {backMost && backMost.times > 1 && (
        <Section
          title="最近反复听"
          subtitle={`「${songMap[backMost.songId]?.title}」被放了 ${backMost.times} 次`}
        >
          <SongList
            songs={dedup
              .filter((d) => d.times > 1)
              .sort((a, b) => b.times - a.times)
              .slice(0, 8)
              .map((d) => songMap[d.songId])
              .filter(Boolean)}
            head={false}
            showAlbum
          />
        </Section>
      )}

      <DemoNotice>
        历史只保存在浏览器 localStorage（<code className="mono">lz334:library</code>），换设备不会同步；
        上限 100 条，接入后端后可改为 <code className="mono">GET /history?cursor=</code> 分页拉取。
      </DemoNotice>

      {confirm && (
        <Modal
          title="清空播放记录"
          width={420}
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setConfirm(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  lib.clearHistory()
                  setConfirm(false)
                  push('已清空最近播放记录', 'good')
                }}
              >
                <Icon name="trash" size={15} /> 确认清空
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.8 }}>
            将删除 {valid.length} 条播放记录。收藏、歌单、播放次数统计与成就进度不受影响。
          </p>
        </Modal>
      )}
    </div>
  )
}
