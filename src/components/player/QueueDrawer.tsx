import { useState } from 'react'
import { usePlayer } from '../../store/player'
import { songMap } from '../../data/songs'
import { albumMap } from '../../data/albums'
import { mmss } from '../../lib/format'
import { Drawer } from '../common/Overlays'
import { Icon } from '../common/Icon'
import { Cover } from '../common/Cover'
import { Empty } from '../common/Primitives'

export function QueueDrawer() {
  const open = usePlayer((s) => s.queueOpen)
  const queue = usePlayer((s) => s.queue)
  const index = usePlayer((s) => s.index)
  const mode = usePlayer((s) => s.mode)
  const p = usePlayer()
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  if (!open) return null
  const total = queue.reduce((a, id) => a + (songMap[id]?.duration ?? 0), 0)

  return (
    <Drawer
      onClose={() => p.setQueueOpen(false)}
      title={
        <span>
          播放队列 <span className="mute" style={{ fontSize: 12 }}>{queue.length} 首 · {mmss(total)}</span>
        </span>
      }
      extra={
        <>
          <button
            className="iconbtn tip"
            data-tip="清空队列"
            onClick={p.clearQueue}
            disabled={!queue.length}
          >
            <Icon name="trash" size={15} />
          </button>
          <button
            className="iconbtn is-on"
            onClick={() => p.cycleMode()}
            title={`播放模式：${mode === 'list' ? '列表循环' : mode === 'single' ? '单曲循环' : '随机播放'}`}
          >
            <Icon name={mode === 'single' ? 'repeatOne' : mode === 'shuffle' ? 'shuffle' : 'repeat'} size={15} />
          </button>
        </>
      }
    >
      {queue.length === 0 ? (
        <div style={{ padding: 20 }}>
          <Empty text="队列是空的" hint="在任意列表里点「加入队列」或直接播放一张专辑" />
        </div>
      ) : (
        <ul>
          {queue.map((id, i) => {
            const s = songMap[id]
            if (!s) return null
            const a = albumMap[s.albumId]
            return (
              <li
                key={id + i}
                className={`qrow ${i === index ? 'is-current' : ''}`}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(i)
                }}
                onDrop={() => {
                  if (drag != null && over != null) p.reorder(drag, over)
                  setDrag(null)
                  setOver(null)
                }}
                onDragEnd={() => {
                  setDrag(null)
                  setOver(null)
                }}
                onClick={() => p.jumpTo(i)}
                style={over === i && drag != null && drag !== i ? { borderTop: '2px solid var(--gold)' } : undefined}
              >
                <span className="qrow__n qrow__drag" title="拖动排序">
                  ⠿
                </span>
                <Cover seed={s.title} title={s.title} size={34} glyphSize={12} />
                <div className="qrow__t">
                  <b>{s.title}</b>
                  <span>{a?.name}</span>
                </div>
                <span className="mono mute" style={{ fontSize: 11 }}>
                  {mmss(s.duration)}
                </span>
                <button
                  className="iconbtn qrow__x"
                  onClick={(e) => {
                    e.stopPropagation()
                    p.removeAt(i)
                  }}
                  aria-label="移除"
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}
