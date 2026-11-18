import { useEffect, useState } from 'react'
import { useUi } from '../../store/ui'
import { useLibrary } from '../../store/library'
import { songMap } from '../../data/songs'
import { Modal } from './Overlays'
import { Icon } from './Icon'
import { Empty } from './Primitives'

/** 「加入歌单」弹层：消费 ui.picker 里待加入的曲目 id */
export function PlaylistPicker() {
  const ids = useUi((s) => s.picker)
  const close = useUi((s) => s.closePicker)
  const push = useUi((s) => s.push)
  const playlists = useLibrary((s) => s.playlists)
  const add = useLibrary((s) => s.addToPlaylist)
  const create = useLibrary((s) => s.createPlaylist)
  const [picked, setPicked] = useState<string[]>([])
  const [fresh, setFresh] = useState('')

  useEffect(() => {
    if (ids) setPicked([])
  }, [ids])

  if (!ids) return null
  const titles = ids.map((i) => songMap[i]?.title ?? i)

  const submit = () => {
    const targets = [...picked]
    if (fresh.trim()) targets.push(create(fresh.trim()))
    if (!targets.length) {
      push('先选一个歌单，或写个新名字')
      return
    }
    for (const pid of targets) for (const sid of ids) add(pid, sid)
    push(`已把 ${ids.length} 首加入 ${targets.length} 个歌单`, 'good')
    setFresh('')
    close()
  }

  return (
    <Modal
      title="加入歌单"
      onClose={close}
      width={460}
      footer={
        <>
          <button className="btn btn--ghost" onClick={close}>
            取消
          </button>
          <button className="btn btn--primary" onClick={submit}>
            确定
          </button>
        </>
      }
    >
      <p className="mute" style={{ fontSize: 12, marginBottom: 14 }}>
        {titles.length <= 3
          ? titles.join('、')
          : `${titles.slice(0, 2).join('、')} 等 ${titles.length} 首`}
      </p>

      {playlists.length === 0 ? (
        <Empty text="还没有歌单" hint="在下方输入名字，创建第一个" />
      ) : (
        <div className="list" style={{ border: 0, background: 'none' }}>
          {playlists.map((p) => {
            const all = ids.every((sid) => p.songIds.includes(sid))
            const on = picked.includes(p.id)
            return (
              <label
                key={p.id}
                className="srow"
                style={{ height: 46, cursor: 'pointer', gridTemplateColumns: '20px 1fr auto' }}
              >
                <span className={`chipcheck ${on ? 'is-on' : ''}`} aria-hidden="true">
                  {on && <Icon name="check" size={11} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <b style={{ display: 'block', fontWeight: 550 }} className="nowrap">
                    {p.name}
                  </b>
                  <span className="mute" style={{ fontSize: 11 }}>
                    {p.songIds.length} 首
                  </span>
                </span>
                {all && <span className="tag">已包含</span>}
              </label>
            )
          })}
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <input
          className="inputlike"
          placeholder="新建歌单：比如「雨天」"
          value={fresh}
          onChange={(e) => setFresh(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
    </Modal>
  )
}
