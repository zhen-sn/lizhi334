import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../common/Overlays'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'

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
  const [err, setErr] = useState('')

  useEffect(() => {
    setErr('')
  }, [mode])

  if (!mode) return null
  const isLogin = mode === 'login'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const msg = isLogin ? login(email, pass) : register(name, email, pass)
    if (msg) {
      setErr(msg)
      return
    }
    push(isLogin ? '已登录，欢迎回来' : '注册成功，已自动登录', 'good')
    setName('')
    setEmail('')
    setPass('')
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

        <form className="auth__form" onSubmit={submit}>
          {!isLogin && (
            <label className="auth__field">
              <span>昵称</span>
              <input
                className="inputlike"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="评论中展示的名字，2-16 个字符"
                maxLength={16}
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
            />
          </label>
          <label className="auth__field">
            <span>密码</span>
            <input
              className="inputlike"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={isLogin ? '输入密码' : '至少 6 位'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>

          {err && <p className="auth__err">{err}</p>}

          <button className="btn btn--primary btn--block" type="submit">
            {isLogin ? '登录' : '注册并登录'}
          </button>
        </form>

        <p className="auth__hint">演示模式：账号与评论仅保存在本机浏览器，不会上传服务器。</p>
      </div>
    </Modal>
  )
}
