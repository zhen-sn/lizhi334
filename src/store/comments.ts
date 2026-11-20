import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { api } from '../api/client'
import type { SessionUser } from './auth'

export interface CommentItem {
  id: string
  userId: string
  userName: string
  text: string
  createdAt: number
  /** 离线模式下的点赞用户列表 */
  likes: string[]
  /** 云端点赞数（有值时优先于 likes.length） */
  likeCount?: number
  /** 当前用户是否已点赞（云端） */
  liked?: boolean
  /** 所属根评论；二级回复都挂在根评论下 */
  parentId?: string
  /** 被回复者的昵称 */
  replyToName?: string
}

export type CommentMap = Record<string, CommentItem[]>

interface CommentsState {
  byTarget: CommentMap
  /** 从服务器拉取某对象的评论（失败时保留本地数据） */
  fetchComments: (target: string) => Promise<void>
  add: (
    target: string,
    user: SessionUser,
    text: string,
    parentId?: string,
    replyToName?: string,
  ) => void
  remove: (target: string, id: string) => void
  toggleLike: (target: string, id: string, userId: string) => void
}

const KEY = 'comments'

/** target 形如 song:s01 / video:v01 / short:sc01 */
function parseTarget(target: string): { type: string; id: string } {
  const i = target.indexOf(':')
  return i < 0 ? { type: '', id: target } : { type: target.slice(0, i), id: target.slice(i + 1) }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapApi(c: any): CommentItem {
  return {
    id: String(c.id),
    userId: String(c.userId),
    userName: c.userName,
    text: c.text,
    createdAt: c.createdAt,
    likes: [],
    likeCount: Number(c.likes ?? 0),
    liked: Boolean(c.liked),
    replyToName: c.replyToName,
  }
}

function flatten(roots: any[]): CommentItem[] {
  const out: CommentItem[] = []
  for (const r of roots) {
    out.push(mapApi(r))
    for (const rep of r.replies ?? []) {
      out.push({ ...mapApi(rep), parentId: String(r.id) })
    }
  }
  return out
}

export const useComments = create<CommentsState>((set, get) => ({
  byTarget: load<CommentMap>(KEY, {}),

  async fetchComments(target) {
    const { type, id } = parseTarget(target)
    if (!type || !id) return
    try {
      const roots = await api<any[]>(`/comments/${type}/${encodeURIComponent(id)}`)
      const list = flatten(roots)
      const byTarget = { ...get().byTarget, [target]: list }
      save(KEY, byTarget)
      set({ byTarget })
    } catch {
      // 后端不可用：保留本地数据
    }
  },

  add(target, user, text, parentId, replyToName) {
    const body = text.trim().slice(0, 500)
    if (!body) return
    const item: CommentItem = {
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userName: user.name,
      text: body,
      createdAt: Date.now(),
      likes: [],
      likeCount: 0,
      liked: false,
      parentId,
      replyToName,
    }
    const list = [item, ...(get().byTarget[target] ?? [])]
    const byTarget = { ...get().byTarget, [target]: list }
    save(KEY, byTarget)
    set({ byTarget })

    const { type, id } = parseTarget(target)
    if (!type || !id) return
    void api(`/comments/${type}/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: { text: body, parentId: parentId ?? null, replyToName: replyToName ?? null },
    })
      .then(() => get().fetchComments(target))
      .catch(() => undefined)
  },

  remove(target, id) {
    const list = (get().byTarget[target] ?? []).filter((c) => c.id !== id && c.parentId !== id)
    const byTarget = { ...get().byTarget, [target]: list }
    save(KEY, byTarget)
    set({ byTarget })
    if (/^\d+$/.test(id)) {
      void api(`/comments/${id}`, { method: 'DELETE' }).catch(() => undefined)
    }
  },

  toggleLike(target, id, userId) {
    const list = (get().byTarget[target] ?? []).map((c) => {
      if (c.id !== id) return c
      if (typeof c.likeCount === 'number' || c.liked !== undefined) {
        const liked = !c.liked
        return {
          ...c,
          liked,
          likeCount: Math.max(0, (c.likeCount ?? 0) + (liked ? 1 : -1)),
        }
      }
      const liked = c.likes.includes(userId)
      return {
        ...c,
        likes: liked ? c.likes.filter((x) => x !== userId) : [...c.likes, userId],
      }
    })
    const byTarget = { ...get().byTarget, [target]: list }
    save(KEY, byTarget)
    set({ byTarget })

    if (/^\d+$/.test(id)) {
      void api<{ liked: boolean; likes: number }>(`/comments/${id}/like`, { method: 'POST' })
        .then((res) => {
          const cur = (get().byTarget[target] ?? []).map((c) =>
            c.id === id ? { ...c, liked: res.liked, likeCount: res.likes } : c,
          )
          const next = { ...get().byTarget, [target]: cur }
          save(KEY, next)
          set({ byTarget: next })
        })
        .catch(() => undefined)
    }
  },
}))