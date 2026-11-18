import { create } from 'zustand'
import { load, save } from '../lib/storage'
import type { SessionUser } from './auth'

export interface CommentItem {
  id: string
  userId: string
  userName: string
  text: string
  createdAt: number
  likes: string[]
  /** 所属根评论；二级回复都挂在根评论下 */
  parentId?: string
  /** 被回复者的昵称 */
  replyToName?: string
}

export type CommentMap = Record<string, CommentItem[]>

interface CommentsState {
  byTarget: CommentMap
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

export const useComments = create<CommentsState>((set, get) => ({
  byTarget: load<CommentMap>(KEY, {}),

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
      parentId,
      replyToName,
    }
    const list = [item, ...(get().byTarget[target] ?? [])]
    const byTarget = { ...get().byTarget, [target]: list }
    save(KEY, byTarget)
    set({ byTarget })
  },

  remove(target, id) {
    const list = (get().byTarget[target] ?? []).filter(
      (c) => c.id !== id && c.parentId !== id,
    )
    const byTarget = { ...get().byTarget, [target]: list }
    save(KEY, byTarget)
    set({ byTarget })
  },

  toggleLike(target, id, userId) {
    const list = (get().byTarget[target] ?? []).map((c) => {
      if (c.id !== id) return c
      const liked = c.likes.includes(userId)
      return {
        ...c,
        likes: liked ? c.likes.filter((x) => x !== userId) : [...c.likes, userId],
      }
    })
    const byTarget = { ...get().byTarget, [target]: list }
    save(KEY, byTarget)
    set({ byTarget })
  },
}))
