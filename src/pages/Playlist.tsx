import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cover, CoverStack } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { SongList } from '../components/music/SongList'
import { Modal } from '../components/common/Overlays'
import { DemoNotice, Empty, PlayAll, Section, Stat, Level } from '../components/common/Primitives'
import { songMap, songs } from '../data/songs'
import { albumMap } from '../data/albums'
import { sheetMap } from '../data/chords'
import { mmss } from '../lib/format'
import { coverPalette } from '../lib/hash'
import { useLibrary } from '../store/library'
import { usePlayer } from '../store/player'
import { useUi } from '../store/ui'
import type { Song } from '../data/types'

/**
 * /playlist/:id —— 歌单详情。
 * id 为 'fav' 时是「我喜欢」（数据来自 library.favorites），其余走自建歌单。
 * 两种模式共用同一套渲染，只是删除 / 改名 / 删除歌单的行为不同。
 */
export default function PlaylistPage() {
  const { id = 'fav' } = useParams()
  const nav = useNavigate()
  const lib = useLibrary()
  const playQueue = usePlayer((s) => s.playQueue)
  const enqueue = usePlayer((s) => s.enqueue)
  const push = useUi((s) => s.push)

  const isFav = id === 'fav'
  const pl = isFav ? undefined : lib.playlists.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const list: Song[] = useMemo(() => {
    const ids = isFav ? lib.favorites : pl?.songIds ?? []
    return ids.map((x) => songMap[x]).filter(Boolean)
  }, [isFav, lib.favorites, pl])

  const ids = useMemo(() => list.map((s) => s.id), [list])
  const total = list.reduce((a, s) => a + s.duration, 0)
  const avgDiff = list.length ? list.reduce((a, s) => a + s.difficulty, 0) / list.length : 0

  // 该歌单里还没被收录进去的曲目，用于「补几首进来」
  const candidates = useMemo(() => {
    const pool = songs.filter((s) => !ids.includes(s.id))
    if (!list.length) return pool.slice(0, 6)
    const keys = new Set(list.map((s) => s.albumId))
    const diff = list.map((s) => s.difficulty).sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 3
    return pool
      .sort((a, b) => {
        const sa = (keys.has(a.albumId) ? 2 : 0) + (Math.abs(a.difficulty - diff) <= 1 ? 1 : 0)
        const sb = (keys.has(b.albumId) ? 2 : 0) + (Math.abs(b.difficulty - diff) <= 1 ? 1 : 0)
        return sb - sa
      })
      .slice(0, 6)
  }, [ids, list])

  const shufflePlay = () => {
    if (ids.length < 2) {
      playQueue(ids, 0)
      return
    }
    const r = [...ids]
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[r[i], r[j]] = [r[j], r[i]]
    }
    playQueue(r, 0)
    push('已随机打乱顺序播放', 'good')
  }

  const removeOne = (sid: string) => {
    if (isFav) {
      lib.toggleFav(sid)
      push('已从「我喜欢」移除')
    } else if (pl) {
      lib.removeFromPlaylist(pl.id, sid)
      push(`已从「${pl.name}」移除`)
    }
  }

  if (!isFav && !pl) {
    return (
      <div>
        <header className="page-head">
          <h1>歌单</h1>
          <p>自建歌单只保存在本机。</p>
        </header>
        <Empty
          text="找不到这个歌单"
          hint={`地址里的编号「${id}」不存在，可能被删除了。`}
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/playlist/fav" className="btn btn--primary">
                去「我喜欢」
              </Link>
              <button className="btn" onClick={() => setCreating(true)}>
                <Icon name="plus" size={15} /> 新建歌单
              </button>
            </div>
          }
        />
        <PlaylistList onCreate={() => setCreating(true)} />
        <CreateModal
          open={creating}
          name={name}
          desc={desc}
          setName={setName}
          setDesc={setDesc}
          onClose={() => setCreating(false)}
          onSubmit={(n, d) => {
            const nid = lib.createPlaylist(n, d)
            setCreating(false)
            setName('')
            setDesc('')
            push('歌单已创建', 'good')
            nav(`/playlist/${nid}`)
          }}
        />
      </div>
    )
  }

  const title = isFav ? '我喜欢' : pl!.name
  const subtitle = isFav
    ? '所有点过心的曲目，收藏即入库，只存在这台设备上。'
    : pl!.desc || '还没有简介，点右侧「编辑」补一句。'

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, fontSize: 12 }}>
        <Link to="/" className="mute">
          音乐库
        </Link>
        <Icon name="right" size={12} />
        <span>{isFav ? '我喜欢' : '歌单'}</span>
      </div>

      <div
        className="album-hero"
        style={{
          gridTemplateColumns: '200px 1fr',
          gap: 26,
          backgroundImage: `radial-gradient(120% 140% at 12% 0%, ${
            coverPalette(title).from
          }, transparent 62%)`,
        }}
      >
        {list.length ? (
          <CoverStack songs={list} size={200} />
        ) : (
          <Cover seed={title} title={title} size={200} glyphSize={62} />
        )}
        <div style={{ minWidth: 0 }}>
          <div className="mute" style={{ fontSize: 11, letterSpacing: '0.22em', marginBottom: 8 }}>
            {isFav ? 'FAVORITES' : 'PLAYLIST'}
          </div>
          <h1 className="serif" style={{ fontSize: 32, marginBottom: 10 }}>
            {title}
          </h1>
          <div className="album-hero__meta">
            <span>{list.length} 首</span>
            <span>{mmss(total)}</span>
            {list.length > 0 && (
              <span>
                调性 {Array.from(new Set(list.map((s) => s.key))).slice(0, 4).join(' / ')}
              </span>
            )}
            {!isFav && <span>创建于 {new Date(pl!.createdAt).toLocaleDateString()}</span>}
            <span className="tag">仅本机</span>
          </div>
          <p className="album-hero__desc">{subtitle}</p>

          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            {list.length > 0 ? (
              <>
                <PlayAll onClick={() => playQueue(ids, 0)} />
                <button className="btn" onClick={shufflePlay}>
                  <Icon name="shuffle" size={15} /> 随机播放
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    enqueue(ids)
                    push(`已把 ${ids.length} 首排到队尾`, 'good')
                  }}
                >
                  <Icon name="queue" size={15} /> 排到队尾
                </button>
              </>
            ) : (
              <Link to="/songs" className="btn btn--primary">
                <Icon name="plus" size={15} /> 去曲库添加
              </Link>
            )}
            <div className="spacer" />
            {!isFav && (
              <>
                <button
                  className="btn"
                  onClick={() => {
                    setName(pl!.name)
                    setDesc(pl!.desc)
                    setEditing(true)
                  }}
                >
                  <Icon name="edit" size={15} /> 编辑
                </button>
                <button className="btn btn--ghost" onClick={() => setConfirmDel(true)}>
                  <Icon name="trash" size={15} /> 删除歌单
                </button>
              </>
            )}
            {list.length > 0 && (
              <Link to="/search" className="btn btn--ghost">
                <Icon name="plus" size={15} /> 继续找歌
              </Link>
            )}
          </div>
        </div>
      </div>

      {list.length > 0 && (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 26 }}
        >
          <Stat value={list.length} label="曲目" />
          <Stat value={mmss(total)} label="总时长" />
          <Stat
            value={
              <span>
                <Level n={Math.round(avgDiff)} />
              </span>
            }
            label={`平均难度 ${avgDiff.toFixed(1)}`}
          />
          <Stat value={list.filter((s) => sheetMap[s.id]).length} label="已有和弦谱" />
          <Stat value={new Set(list.map((s) => s.albumId)).size} label="涉及专辑" />
        </div>
      )}

      {list.length === 0 ? (
        <Empty
          text={isFav ? '还没有喜欢的歌' : '这个歌单还是空的'}
          hint="在任意曲目行点 ❤ 收藏，或点 ＋ 加入歌单。"
          action={
            <Link to="/songs" className="btn btn--primary">
              浏览曲库
            </Link>
          }
        />
      ) : (
        <SongList songs={list} head showAlbum showKey={false} onRemove={removeOne} />
      )}

      {candidates.length > 0 && (
        <Section
          title="可以补进来"
          subtitle={
            list.length
              ? '按同专辑 / 相近难度挑的，点一下就加入'
              : '先加几首，歌单就有了骨架'
          }
          actions={
            <Link to="/songs" className="section__more">
              全部曲库 <Icon name="right" size={13} />
            </Link>
          }
        >
          <div className="chips">
            {candidates.map((s) => (
              <button
                key={s.id}
                className="chip"
                onClick={() => {
                  if (isFav) lib.toggleFav(s.id)
                  else lib.addToPlaylist(pl!.id, s.id)
                  push(`已加入「${s.title}」`, 'good')
                }}
                title={`${albumMap[s.albumId]?.name ?? ''} · ${mmss(s.duration)}`}
              >
                <Icon name="plus" size={12} /> {s.title}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="我的其它歌单">
        <PlaylistList onCreate={() => setCreating(true)} />
      </Section>

      <DemoNotice>
        歌单、收藏与排序全部写在本机 localStorage（命名空间 lz334:）。接入后端后，把{' '}
        <code className="mono">playlists</code> 换成 <code className="mono">GET /playlists</code>，
        增删改走 <code className="mono">POST / DELETE</code> 即可，页面结构不用动。
      </DemoNotice>

      {/* ---------- 弹层 ---------- */}
      {editing && pl && (
        <Modal
          title="编辑歌单"
          width={460}
          onClose={() => setEditing(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  if (!name.trim()) {
                    push('歌单名不能为空')
                    return
                  }
                  lib.renamePlaylist(pl.id, name.trim())
                  setEditing(false)
                  push('已保存', 'good')
                }}
              >
                保存
              </button>
            </>
          }
        >
          <div className="srowform">
            <div className="srowform__label">
              <b>名称</b>
              <span>方便在歌单列表里认出来</span>
            </div>
            <input
              className="inputlike"
              style={{ width: 240 }}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="比如「夜里适合弹的」"
            />
          </div>
          <div className="srowform">
            <div className="srowform__label">
              <b>简介</b>
              <span>可以留空</span>
            </div>
            <input
              className="inputlike"
              style={{ width: 240 }}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="一句话说明适合什么场景"
            />
          </div>
        </Modal>
      )}

      {confirmDel && pl && (
        <Modal
          title="删除歌单"
          width={420}
          onClose={() => setConfirmDel(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setConfirmDel(false)}>
                再想想
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  lib.deletePlaylist(pl.id)
                  setConfirmDel(false)
                  push(`已删除「${pl.name}」`, 'good')
                  nav('/playlist/fav')
                }}
              >
                <Icon name="trash" size={15} /> 确认删除
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.8 }}>
            将从本机删除「<b>{pl.name}</b>」及其 {pl.songIds.length} 条引用。曲目本身仍在曲库里，
            收藏不受影响。此操作不可撤销。
          </p>
        </Modal>
      )}

      <CreateModal
        open={creating}
        name={name}
        desc={desc}
        setName={setName}
        setDesc={setDesc}
        onClose={() => setCreating(false)}
        onSubmit={(n, d) => {
          const nid = lib.createPlaylist(n, d)
          setCreating(false)
          setName('')
          setDesc('')
          push('歌单已创建', 'good')
          nav(`/playlist/${nid}`)
        }}
      />
    </div>
  )
}

/** 歌单入口列表：fav + 自建，附「新建」按钮 */
function PlaylistList({ onCreate }: { onCreate: () => void }) {
  const lib = useLibrary()
  const counts = lib.favorites.length
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
        <Link to="/playlist/fav" className="card card--hover" style={{ padding: 12 }}>
          <Cover seed="我喜欢" title="我" size="100%" glyphSize={40} />
          <div className="nowrap" style={{ marginTop: 10, fontWeight: 550, fontSize: 13 }}>
            我喜欢
          </div>
          <div className="mute" style={{ fontSize: 11.5 }}>
            {counts} 首 · 收藏即入
          </div>
        </Link>
        {lib.playlists.map((p) => {
          const list = p.songIds.map((x) => songMap[x]).filter(Boolean)
          return (
            <Link key={p.id} to={`/playlist/${p.id}`} className="card card--hover" style={{ padding: 12 }}>
              {list.length ? (
                <CoverStack songs={list} size={96} />
              ) : (
                <Cover seed={p.name} title={p.name} size="100%" glyphSize={34} />
              )}
              <div className="nowrap" style={{ marginTop: 10, fontWeight: 550, fontSize: 13 }}>
                {p.name}
              </div>
              <div className="mute nowrap" style={{ fontSize: 11.5 }}>
                {p.songIds.length} 首
              </div>
            </Link>
          )
        })}
        <button
          className="card card--hover"
          style={{
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderStyle: 'dashed',
            color: 'var(--fg-3)',
          }}
          onClick={onCreate}
        >
          <Icon name="plus" size={22} />
          <span style={{ fontSize: 13 }}>新建歌单</span>
        </button>
      </div>
      {lib.playlists.length === 0 && (
        <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
          还没有自建歌单。示例歌单可以在「设置 → 数据」里一键清空。
        </p>
      )}
    </>
  )
}

function CreateModal({
  open,
  name,
  desc,
  setName,
  setDesc,
  onClose,
  onSubmit,
}: {
  open: boolean
  name: string
  desc: string
  setName: (v: string) => void
  setDesc: (v: string) => void
  onClose: () => void
  onSubmit: (name: string, desc: string) => void
}) {
  const push = useUi((s) => s.push)
  if (!open) return null
  return (
    <Modal
      title="新建歌单"
      width={440}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              if (!name.trim()) {
                push('先写个名字')
                return
              }
              onSubmit(name.trim(), desc.trim())
            }}
          >
            创建
          </button>
        </>
      }
    >
      <div className="srowform">
        <div className="srowform__label">
          <b>名称</b>
          <span>必填</span>
        </div>
        <input
          className="inputlike"
          style={{ width: 240 }}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSubmit(name.trim(), desc.trim())}
          placeholder="比如「叁叁肆路上」"
        />
      </div>
      <div className="srowform">
        <div className="srowform__label">
          <b>简介</b>
          <span>可以留空</span>
        </div>
        <input
          className="inputlike"
          style={{ width: 240 }}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="适合什么场景听"
        />
      </div>
      <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>
        创建后可以马上从曲库勾选曲目，也可以用「可以补进来」的推荐一键加入。
      </p>
    </Modal>
  )
}
