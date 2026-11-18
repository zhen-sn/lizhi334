import { create } from 'zustand'
import { hash32 } from '../lib/hash'
import { load, save } from '../lib/storage'

interface Account {
  id: string
  name: string
  email: string
  /** 仅存哈希，演示用途，不做安全承诺 */
  pass: string
}

export interface SessionUser {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: SessionUser | null
  accounts: Account[]
  /** 成功返回 null，失败返回错误文案 */
  register: (name: string, email: string, pass: string) => string | null
  login: (email: string, pass: string) => string | null
  logout: () => void
}

const KEY_ACCOUNTS = 'accounts'
const KEY_SESSION = 'session'

const hashPass = (email: string, pass: string) =>
  hash32(`${email}::${pass}`).toString(36)

const plain = (a: Account): SessionUser => ({ id: a.id, name: a.name, email: a.email })

export const useAuth = create<AuthState>((set, get) => ({
  user: load<SessionUser | null>(KEY_SESSION, null),
  accounts: load<Account[]>(KEY_ACCOUNTS, []),

  register(name, email, pass) {
    const nick = name.trim()
    const mail = email.trim().toLowerCase()
    if (nick.length < 2) return '昵称至少 2 个字符'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return '请输入有效的邮箱地址'
    if (pass.length < 6) return '密码至少 6 位'
    if (get().accounts.some((a) => a.email === mail)) return '该邮箱已注册，可直接登录'

    const account: Account = {
      id: `u_${Date.now().toString(36)}`,
      name: nick,
      email: mail,
      pass: hashPass(mail, pass),
    }
    const accounts = [...get().accounts, account]
    const user = plain(account)
    save(KEY_ACCOUNTS, accounts)
    save(KEY_SESSION, user)
    set({ accounts, user })
    return null
  },

  login(email, pass) {
    const mail = email.trim().toLowerCase()
    if (!mail || !pass) return '请填写邮箱和密码'
    const account = get().accounts.find((a) => a.email === mail)
    if (!account) return '账号不存在，请先注册'
    if (account.pass !== hashPass(mail, pass)) return '密码不正确'
    const user = plain(account)
    save(KEY_SESSION, user)
    set({ user })
    return null
  },

  logout() {
    save(KEY_SESSION, null)
    set({ user: null })
  },
}))
