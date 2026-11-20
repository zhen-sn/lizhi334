import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Section, Stat, Empty } from '../components/common/Primitives'
import { useAuth } from '../store/auth'
import { useLibrary } from '../store/library'
import { useUploads, type UploadType } from '../store/uploads'
import { useUi } from '../store/ui'
import { humanTime } from '../lib/format'
import { api } from '../api/client'

const TABS = [
  { to: '/me/profile', label: '个人资料', icon: 'user' as const },
  { to: '/me/sponsors', label: '我的赞助', icon: 'crown' as const },
  { to: '/me/uploads', label: '我上传的资源', icon: 'upload' as const },
]

const TYPE_LABEL: Record<UploadType, string> = {
  song: '歌曲',
  mv: 'MV 视频',
  short: '短视频',
  other: '其他资源',
}

interface OrderRow {
  orderNo: string
  subject: string
  amount: number
  provider: string
  channel: string
  status: string
  createdAt: number
  paidAt: number | null
}

const ORDER_STATUS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  closed: '已关闭',
  refunded: '已退款',
}

/** 拉取当前账号的订单 */
function useOrders() {
  const user = useAuth((s) => s.user)
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user) {
      setRows([])
      return
    }
    let alive = true
    setLoading(true)
    api<OrderRow[]>('/orders/mine')
      .then((data) => {
        if (alive) setRows(data ?? [])
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [user])

  return { rows, loading, err }
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
          <p>个人资料、赞助记录与投稿记录都在登录后可见。</p>
        </header>
        <div className="card card--flat">
          <p className="mute" style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 14 }}>
            登录后可编辑个人资料、修改密码，并查看自己的赞助订单与投稿审核状态。
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
  const push = useUi((s) => s.push)
  const uploads = useUploads((s) => s.items)
  const { rows } = useOrders()
  const mine = uploads.filter((u) => u.author === user.name)
  const paid = rows.filter((r) => r.status === 'paid')

  const [name, setName] = useState(user.name)
  const [avatar, setAvatar] = useState(user.avatar ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passErr, setPassErr] = useState('')

  useEffect(() => {
    setName(user.name)
    setAvatar(user.avatar ?? '')
    setBio(user.bio ?? '')
  }, [user.name, user.avatar, user.bio])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setErr('')
    setSaving(true)
    const msg = await useAuth.getState().updateProfile({ name, avatar, bio })
    setSaving(false)
    if (msg) {
      setErr(msg)
      return
    }
    push('资料已保存', 'good')
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (passBusy) return
    setPassErr('')
    if (newPass !== confirmPass) {
      setPassErr('两次输入的新密码不一致')
      return
    }
    setPassBusy(true)
    const msg = await useAuth.getState().changePassword(oldPass, newPass)
    setPassBusy(false)
    if (msg) {
      setPassErr(msg)
      return
    }
    push('密码已修改，下次登录请使用新密码', 'good')
    setOldPass('')
    setNewPass('')
    setConfirmPass('')
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <Cover seed={user.name} title={user.name} size={76} glyphSize={30} />
          )}
          <div style={{ minWidth: 200, flex: 1 }}>
            <div className="serif" style={{ fontSize: 22 }}>{user.name}</div>
            <div className="mute" style={{ fontSize: 12.5, marginTop: 4 }}>{user.email}</div>
            {user.bio && (
              <p className="mute" style={{ fontSize: 12.5, marginTop: 6 }}>{user.bio}</p>
            )}
            <div className="chips" style={{ marginTop: 10 }}>
              <span className="tag">账号 ID · {user.id}</span>
              {user.role === 'admin' && <span className="tag">管理员</span>}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => nav('/me/sponsors')}>
              <Icon name="crown" size={15} /> 我的赞助
            </button>
            <button className="btn" onClick={() => nav('/me/uploads')}>
              <Icon name="upload" size={15} /> 我上传的资源
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                useAuth.getState().logout()
                push('已退出登录')
              }}
            >
              退出登录
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
        <Stat value={paid.length} label="已支持次数" />
        <Stat value={mine.length} label="提交的资源" />
      </div>

      <Section title="编辑资料" subtitle="昵称会显示在评论与投稿中">
        <form className="card card--flat" onSubmit={saveProfile}>
          <div className="auth__field" style={{ marginBottom: 12 }}>
            <span>昵称</span>
            <input
              className="inputlike"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="2-16 个字符"
            />
          </div>
          <div className="auth__field" style={{ marginBottom: 12 }}>
            <span>头像地址</span>
            <input
              className="inputlike"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://…（留空则使用默认封面）"
            />
          </div>
          <div className="auth__field" style={{ marginBottom: 12 }}>
            <span>简介</span>
            <textarea
              className="inputlike"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="一句话介绍自己（选填）"
            />
            <div className="uphint" style={{ textAlign: 'right' }}>{bio.length}/160</div>
          </div>
          {err && <p className="auth__err">{err}</p>}
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存资料'}
          </button>
        </form>
      </Section>

      <Section title="修改密码" subtitle="修改后其他设备需要重新登录">
        <form className="card card--flat" onSubmit={savePassword}>
          <div className="auth__field" style={{ marginBottom: 12 }}>
            <span>原密码</span>
            <input
              className="inputlike"
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="auth__field" style={{ marginBottom: 12 }}>
            <span>新密码</span>
            <input
              className="inputlike"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
          </div>
          <div className="auth__field" style={{ marginBottom: 12 }}>
            <span>确认新密码</span>
            <input
              className="inputlike"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {passErr && <p className="auth__err">{passErr}</p>}
          <button className="btn" type="submit" disabled={passBusy}>
            {passBusy ? '提交中…' : '修改密码'}
          </button>
        </form>
      </Section>

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
    </>
  )
}

function MySponsors() {
  const { rows, loading, err } = useOrders()

  return (
    <Section
      title="我的赞助"
      subtitle={loading ? '加载中…' : `共 ${rows.length} 笔订单`}
      actions={
        <Link to="/sponsor" className="section__more">
          去赞助 <Icon name="right" size={13} />
        </Link>
      }
    >
      {err ? (
        <Empty text="订单加载失败" hint={err} />
      ) : rows.length === 0 ? (
        loading ? (
          <p className="mute" style={{ fontSize: 12.5 }}>正在读取订单…</p>
        ) : (
          <Empty text="还没有赞助记录" hint="在赞助页选择任意档位并完成支付后，这里会出现订单。" />
        )
      ) : (
        <div className="list">
          {rows.map((r, i) => (
            <div
              className="srow"
              key={r.orderNo}
              style={{ gridTemplateColumns: '40px minmax(0,1.4fr) 1fr 90px 90px', height: 48 }}
            >
              <span className="srow__idx">{i + 1}</span>
              <span className="nowrap" style={{ fontSize: 13 }}>{r.subject}</span>
              <span className="mute nowrap" style={{ fontSize: 12 }}>
                ¥{r.amount.toFixed(2)} · {r.channel === 'wxpay' ? '微信' : '支付宝'}
              </span>
              <span className="tag" style={{ justifySelf: 'start' }}>
                {ORDER_STATUS[r.status] ?? r.status}
              </span>
              <span className="mute mono" style={{ fontSize: 11 }}>
                {new Date(r.paidAt ?? r.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
        订单号可用于核对支付记录：{rows[0]?.orderNo ?? '—'}
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
      subtitle={`共 ${mine.length} 条`}
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
              style={{ gridTemplateColumns: '86px minmax(0,1fr) 120px 90px 40px', height: 56 }}
            >
              <span className="tag" style={{ justifySelf: 'start' }}>{TYPE_LABEL[u.type]}</span>
              <span style={{ minWidth: 0 }}>
                <b className="nowrap" style={{ display: 'block', fontSize: 13.5 }}>{u.title}</b>
                <span className="mute nowrap" style={{ fontSize: 11.5 }}>
                  {(u.fileName || u.link || '未附文件')} · {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </span>
              <span className="mute nowrap" style={{ fontSize: 12 }}>{u.note || '（无备注）'}</span>
              <span className="tag" style={{ justifySelf: 'start' }}>{u.status}</span>
              <div className="srow__acts" style={{ opacity: 1, justifyContent: 'flex-end' }}>
                <button
                  className="iconbtn tip"
                  data-tip="撤回这条提交"
                  onClick={async () => {
                    const err = await remove(u.id)
                    push(err || '已撤回这条提交', err ? 'info' : 'good')
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