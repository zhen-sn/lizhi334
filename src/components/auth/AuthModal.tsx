import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../common/Overlays'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { useLibrary } from '../../store/library'
import { useShorts } from '../../store/shorts'
import { useUploads } from '../../store/uploads'

/** 登录后拉取该账号的云端数据（收藏 / 歌单 / 投稿） */
function syncAccountData() {
  void Promise.all([
    useLibrary.getState().syncFromServer(),
    useShorts.getState().syncFromServer(),
    useUploads.getState().syncFromServer(),
  ]).catch(() => undefined)
}

export function AuthModal() {
  const mode = useUi((s) => s.authModal)
  const openAuth = useUi((s) => s.openAuth)
  const closeAuth = useUi((s) => s.closeAuth)
  const push = useUi((s) => s.push)
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setErr('')
    setPass('')
    setConfirm('')
    setShowPass(false)
  }, [mode])

  if (!mode) return null
  const isLogin = mode === 'login'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const msg = isLogin ? await login(email, pass) : await register(name, email, pass, confirm)
    setBusy(false)
    if (msg) {
      setErr(msg)
      return
    }
    syncAccountData()
    push(isLogin ? '已登录，欢迎回来' : '注册成功，已自动登录', 'good')
    setName('')
    setEmail('')
    setPass('')
    setConfirm('')
    closeAuth()
  }

  return (
    <Modal title={isLogin ? '登录' : '注册'} onClose={closeAuth} width={420}>
      <div className="auth">
        <div className="auth__tabs">
          <button
            type="button"
            className={isLogin ? 'is-on' : ''}
            onClick={() => openAuth('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={!isLogin ? 'is-on' : ''}
            onClick={() => openAuth('register')}
          >
            注册
          </button>
        </div>

        <form className="auth__form" onSubmit={submit} noValidate>
          {!isLogin && (
            <label className="auth__field">
              <span>昵称</span>
              <input
                className="inputlike"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="评论中展示的名字，2-16 个字符"
                maxLength={16}
                autoComplete="nickname"
                autoFocus
              />
            </label>
          )}
          <label className="auth__field">
            <span>邮箱</span>
            <input
              className="inputlike"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              autoFocus={isLogin}
            />
          </label>
          <label className="auth__field">
            <span>密码</span>
            <input
              className="inputlike"
              type={showPass ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={isLogin ? '输入密码' : '至少 6 位'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>
          {!isLogin && (
            <label className="auth__field">
              <span>确认密码</span>
              <input
                className="inputlike"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再输入一次密码"
                autoComplete="new-password"
              />
            </label>
          )}

          <button
            type="button"
            className="linklike"
            style={{ alignSelf: 'flex-start', fontSize: 12 }}
            onClick={() => setShowPass((v) => !v)}
          >
            {showPass ? '隐藏密码' : '显示密码'}
          </button>

          {err && <p className="auth__err">{err}</p>}

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? '请稍候…' : isLogin ? '登录' : '注册并登录'}
          </button>
        </form>

        <p className="auth__hint">
          {isLogin
            ? '登录后可同步收藏、歌单与投稿记录。'
            : '账号保存在服务器，注册后会自动登录。'}{' '}
          登录后可在「我的」编辑资料与修改密码。
        </p>
      </div>
    </Modal>
  )
}