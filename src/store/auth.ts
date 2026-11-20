import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { api, clearCsrf } from '../api/client'

export interface SessionUser {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  role?: string
}

export interface ProfileInput {
  name: string
  avatar: string
  bio: string
}

interface AuthState {
  user: SessionUser | null
  /** 成功返回 null，失败返回错误文案 */
  register: (name: string, email: string, pass: string, confirm: string) => Promise<string | null>
  login: (email: string, pass: string) => Promise<string | null>
  logout: () => void
  /** 从服务器同步当前会话（启动时调用） */
  refresh: () => Promise<void>
  /** 保存个人资料 */
  updateProfile: (input: ProfileInput) => Promise<string | null>
  /** 修改密码 */
  changePassword: (oldPass: string, newPass: string) => Promise<string | null>
}

const KEY_SESSION = 'session'

type ApiUser = {
  id: number | string
  name: string
  email: string
  avatar?: string
  bio?: string
  role?: string
}

const fromApi = (u: ApiUser): SessionUser => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  avatar: u.avatar || '',
  bio: u.bio || '',
  role: u.role || 'user',
})

const fail = (e: unknown) => (e instanceof Error ? e.message : '操作失败，请稍后重试')

export const useAuth = create<AuthState>((set, get) => ({
  user: load<SessionUser | null>(KEY_SESSION, null),

  async register(name, email, pass, confirm) {
    const nick = name.trim()
    const mail = email.trim().toLowerCase()
    if (nick.length < 2 || nick.length > 16) return '昵称需为 2-16 个字符'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return '请输入有效的邮箱地址'
    if (pass.length < 6) return '密码至少 6 位'
    if (pass !== confirm) return '两次输入的密码不一致'

    try {
      const u = await api<ApiUser>('/auth/register', {
        method: 'POST',
        body: { name: nick, email: mail, password: pass, passwordConfirm: confirm },
      })
      const user = fromApi(u)
      save(KEY_SESSION, user)
      set({ user })
      return null
    } catch (e) {
      return fail(e)
    }
  },

  async login(email, pass) {
    const mail = email.trim().toLowerCase()
    if (!mail || !pass) return '请填写邮箱和密码'
    try {
      const u = await api<ApiUser>('/auth/login', {
        method: 'POST',
        body: { email: mail, password: pass },
      })
      const user = fromApi(u)
      save(KEY_SESSION, user)
      set({ user })
      return null
    } catch (e) {
      return fail(e)
    }
  },

  logout() {
    save(KEY_SESSION, null)
    set({ user: null })
    // 服务端会话异步销毁；失败无妨
    void api('/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearCsrf()
  },

  async refresh() {
    try {
      const u = await api<ApiUser | null>('/auth/me', { timeout: 4000 })
      if (u) {
        const user = fromApi(u)
        save(KEY_SESSION, user)
        set({ user })
      } else if (get().user) {
        // 服务端无会话：以服务端为准（可能已在别处登出）
        save(KEY_SESSION, null)
        set({ user: null })
      }
    } catch {
      // 后端不可用：保留本地缓存，等待下次刷新
    }
  },

  async updateProfile(input) {
    const name = input.name.trim()
    const avatar = input.avatar.trim()
    const bio = input.bio.trim()
    if (name.length < 2 || name.length > 16) return '昵称需为 2-16 个字符'
    if (avatar && !/^https?:\/\//i.test(avatar)) return '头像需填写 http(s) 图片地址'
    if (bio.length > 160) return '简介最多 160 个字符'
    try {
      const u = await api<ApiUser>('/auth/profile', {
        method: 'POST',
        body: { name, avatar, bio },
      })
      const user = fromApi(u)
      save(KEY_SESSION, user)
      set({ user })
      return null
    } catch (e) {
      return fail(e)
    }
  },

  async changePassword(oldPass, newPass) {
    if (newPass.length < 6) return '新密码至少 6 位'
    if (newPass === oldPass) return '新密码不能与原密码相同'
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { old: oldPass, new: newPass },
      })
      return null
    } catch (e) {
      return fail(e)
    }
  },
}))