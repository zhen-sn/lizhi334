import { useMemo } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Section, Stat, Empty, DemoNotice } from '../components/common/Primitives'
import { useAuth } from '../store/auth'
import { useLibrary } from '../store/library'
import { useUploads, type UploadType } from '../store/uploads'
import { useUi } from '../store/ui'
import { load } from '../lib/storage'
import { humanTime } from '../lib/format'
import { sponsors } from '../data/sponsors'

/** 与赞助页写进本地的记录保持同一结构 */
interface SupportRecord {
  tierId: string
  nick: string
  at: number
}

const TABS = [
  { to: '/me/profile', label: '个人资料', icon: 'user' },
  { to: '/me/sponsors', label: '我的赞助', icon: 'crown' },
  { to: '/me/uploads', label: '我上传的资源', icon: 'upload' },
]

const TYPE_LABEL: Record<UploadType, string> = {
  song: '歌曲',
  mv: 'MV 视频',
  short: '短视频',
  other: '其他资源',
}

export default function Account() {
  const loc = useLocation()
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)

  const view = loc.pathname.endsWith('/sponsors')
    ? 'sponsors'
    : loc.pathname.endsWith('/uploads')
      ? 'uploads'
      : 'profile'

  if (!user) {
    return (
      <div>
        <header className="page-head">
          <h1>我的</h1>
          <p>个人资料、赞助记录与上传记录都在登录后可见。</p>
        </header>
        <div className="card card--flat">
          <p className="mute" style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 14 }}>
            这里的数据只存在你自己的浏览器里（命名空间 lz334:），登录后即可查看。
          </p>
          <button className="btn btn--primary" onClick={() => openAuth('login')}>
            <Icon name="user" size={15} /> 登录 / 注册
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="page-head">
        <h1>我的</h1>
        <p>{user.name} · {user.email}</p>
      </header>

      <div className="chips" style={{ marginBottom: 22 }}>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `chip ${isActive ? 'is-on' : ''}`}
          >
            <Icon name={t.icon} size={13} /> {t.label}
          </NavLink>
        ))}
      </div>

      {view === 'profile' && <Profile />}
      {view === 'sponsors' && <MySponsors />}
      {view === 'uploads' && <MyUploads />}
    </div>
  )
}

function Profile() {
  const user = useAuth((s) => s.user)!
  const lib = useLibrary()
  const nav = useNavigate()
  const uploads = useUploads((s) => s.items)
  const records = useMemo(() => load<SupportRecord[]>('sponsor.records', []), [])
  const mine = uploads.filter((u) => u.author === user.name)

  return (
    <>
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
          <Cover seed={user.name} title={user.name} size={76} glyphSize={30} />
          <div style={{ minWidth: 200, flex: 1 }}>
            <div className="serif" style={{ fontSize: 22 }}>{user.name}</div>
            <div className="mute" style={{ fontSize: 12.5, marginTop: 4 }}>{user.email}</div>
            <div className="chips" style={{ marginTop: 10 }}>
              <span className="tag">账号 ID · {user.id}</span>
              <span className="tag">数据存在本机</span>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => nav('/me/sponsors')}>
              <Icon name="crown" size={15} /> 我的赞助
            </button>
            <button className="btn" onClick={() => nav('/me/uploads')}>
              <Icon name="upload" size={15} /> 我上传的资源
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        <Stat value={lib.favorites.length} label="我喜欢" />
        <Stat value={lib.playlists.length} label="自建歌单" />
        <Stat value={lib.history.length} label="播放记录" />
        <Stat value={humanTime(lib.totalSeconds)} label="累计收听" />
        <Stat value={records.length} label="赞助次数" />
        <Stat value={mine.length} label="提交的资源" />
      </div>

      <Section title="快捷入口">
        <div className="card card--flat">
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Link to="/upload" className="btn"><Icon name="upload" size={15} /> 上传资源</Link>
            <Link to="/playlist/fav" className="btn"><Icon name="heart" size={15} /> 我喜欢</Link>
            <Link to="/history" className="btn"><Icon name="clock" size={15} /> 最近播放</Link>
            <Link to="/more/stats" className="btn"><Icon name="star" size={15} /> 听歌报告</Link>
          </div>
        </div>
      </Section>

      <DemoNotice>
        账号与这里的统计数据都保存在当前浏览器，换设备或清空浏览器数据后不会保留；正式版本接入后端后由服务端账户体系接管。
      </DemoNotice>
    </>
  )
}

function MySponsors() {
  const records = useMemo(() => load<SupportRecord[]>('sponsor.records', []), [])

  return (
    <Section
      title="我的赞助"
      subtitle={`本机共 ${records.length} 条记录`}
      actions={
        <Link to="/sponsor" className="section__more">
          去赞助 <Icon name="right" size={13} />
        </Link>
      }
    >
      {records.length === 0 ? (
        <Empty text="还没有赞助记录" hint="在赞助页选择任意档位并确认后，这里会出现对应记录。" />
      ) : (
        <div className="list">
          {records.map((r, i) => {
            const t = sponsors.find((x) => x.id === r.tierId)
            return (
              <div
                className="srow"
                key={r.at}
                style={{ gridTemplateColumns: '40px minmax(0,1.2fr) 1fr 90px', height: 48 }}
              >
                <span className="srow__idx">{i + 1}</span>
                <span className="nowrap" style={{ fontSize: 13 }}>
                  {t?.icon} {t?.name ?? '未知档位'}
                </span>
                <span className="mute nowrap" style={{ fontSize: 12 }}>
                  ¥{t ? t.amount : '—'} / 次 · 署名「{r.nick}」
                </span>
                <span className="mute mono" style={{ fontSize: 11 }}>
                  {new Date(r.at).toLocaleDateString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
        记录只写在浏览器本地，用于演示「支持过什么」，不构成任何凭证。
      </p>
    </Section>
  )
}

function MyUploads() {
  const user = useAuth((s) => s.user)!
  const items = useUploads((s) => s.items)
  const remove = useUploads((s) => s.remove)
  const push = useUi((s) => s.push)
  const mine = items.filter((u) => u.author === user.name)

  return (
    <Section
      title="我上传的资源"
      subtitle={`共 ${mine.length} 条 · 均待审核`}
      actions={
        <Link to="/upload" className="section__more">
          继续上传 <Icon name="right" size={13} />
        </Link>
      }
    >
      {mine.length === 0 ? (
        <Empty text="还没有提交过资源" hint="去「上传资源」页填一份，提交后会出现在这里。" />
      ) : (
        <div className="list">
          {mine.map((u) => (
            <div
              className="srow"
              key={u.id}
              style={{ gridTemplateColumns: '86px minmax(0,1fr) 120px 40px', height: 56 }}
            >
              <span className="tag" style={{ justifySelf: 'start' }}>{TYPE_LABEL[u.type]}</span>
              <span style={{ minWidth: 0 }}>
                <b className="nowrap" style={{ display: 'block', fontSize: 13.5 }}>{u.title}</b>
                <span className="mute nowrap" style={{ fontSize: 11.5 }}>
                  {u.fileName || u.link || '未附文件'} · {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </span>
              <span className="mute nowrap" style={{ fontSize: 12 }}>{u.note || '（无备注）'}</span>
              <div className="srow__acts" style={{ opacity: 1, justifyContent: 'flex-end' }}>
                <button
                  className="iconbtn tip"
                  data-tip="撤回这条提交"
                  onClick={() => {
                    remove(u.id)
                    push('已撤回这条提交')
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
