import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { api } from '../api/client'
import { useAuth } from './auth'

export type UploadType = 'song' | 'mv' | 'short' | 'other'
export type UploadStatus = '待审核' | '已通过' | '未通过'

export interface UploadItem {
  id: string
  type: UploadType
  title: string
  /** 关联曲目（可选） */
  songRef?: string
  /** 本地文件名 */
  fileName?: string
  /** 上传后的文件地址 */
  fileUrl?: string
  /** 或者一个资源链接 */
  link?: string
  /** 备注 */
  note: string
  contact?: string
  /** 提交者昵称 */
  author?: string
  createdAt: number
  status: UploadStatus
}

interface UploadsState {
  items: UploadItem[]
  /** 提交到服务器；成功返回 null，失败返回错误文案 */
  add: (item: Omit<UploadItem, 'id' | 'createdAt' | 'status'>) => Promise<string | null>
  /** 撤回自己待审核的投稿 */
  remove: (id: string) => Promise<string | null>
  /** 登录后拉取「我的投稿」及审核状态 */
  syncFromServer: () => Promise<void>
}

const KEY = 'uploads'

const TYPE_TO_API: Record<UploadType, string> = {
  song: 'audio',
  mv: 'video',
  short: 'video',
  other: 'other',
}

const STATUS_MAP: Record<string, UploadStatus> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '未通过',
}

export const useUploads = create<UploadsState>()((set, get) => ({
  items: load<UploadItem[]>(KEY, []),

  add: async (item) => {
    const user = useAuth.getState().user
    if (!user && !item.author?.trim()) return '请先登录或填写署名'
    try {
      const res = await api<{ id: number }>('/uploads', {
        method: 'POST',
        body: {
          type: TYPE_TO_API[item.type] ?? 'other',
          title: item.title,
          songRef: item.songRef ?? null,
          fileName: item.fileName ?? null,
          fileUrl: item.fileUrl ?? null,
          link: item.link ?? null,
          note: item.note ?? '',
          contact: item.contact ?? null,
          author: item.author ?? user?.name ?? '',
        },
      })
      if (user) {
        await get().syncFromServer()
      } else {
        const next: UploadItem = {
          ...item,
          id: `up_${res.id}`,
          createdAt: Date.now(),
          status: '待审核',
        }
        const items = [next, ...get().items]
        save(KEY, items)
        set({ items })
      }
      return null
    } catch (e) {
      return e instanceof Error ? e.message : '提交失败，请稍后重试'
    }
  },

  remove: async (id) => {
    const user = useAuth.getState().user
    const item = get().items.find((x) => x.id === id)
    if (user && item && /^\d+$/.test(id)) {
      try {
        await api(`/uploads/${id}`, { method: 'DELETE' })
      } catch (e) {
        return e instanceof Error ? e.message : '撤回失败，请稍后重试'
      }
    }
    const items = get().items.filter((x) => x.id !== id)
    save(KEY, items)
    set({ items })
    return null
  },

  async syncFromServer() {
    if (!useAuth.getState().user) return
    try {
      const rows = await api<
        {
          id: number
          type: string
          title: string
          songRef?: string
          fileName?: string
          fileUrl?: string
          link?: string
          note?: string
          status: string
          createdAt: number
        }[]
      >('/uploads/mine')
      const rev: Record<string, UploadType> = { audio: 'song', video: 'mv', tab: 'other', photo: 'other', other: 'other' }
      const me = useAuth.getState().user
      const items: UploadItem[] = (rows ?? []).map((r) => ({
        id: String(r.id),
        type: rev[r.type] ?? 'other',
        title: r.title,
        songRef: r.songRef ?? undefined,
        fileName: r.fileName ?? undefined,
        fileUrl: r.fileUrl ?? undefined,
        link: r.link ?? undefined,
        note: r.note ?? '',
        author: me?.name,
        createdAt: r.createdAt,
        status: STATUS_MAP[r.status] ?? '待审核',
      }))
      save(KEY, items)
      set({ items })
    } catch {
      // 离线：保留本地记录
    }
  },
}))