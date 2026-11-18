import { create } from 'zustand'
import { load, save } from '../lib/storage'

export type UploadType = 'song' | 'mv' | 'short' | 'other'

export interface UploadItem {
  id: string
  type: UploadType
  title: string
  /** 关联曲目（可选） */
  songRef?: string
  /** 本地文件名（演示阶段不上传真实文件） */
  fileName?: string
  /** 或者一个资源链接 */
  link?: string
  /** 备注 */
  note: string
  contact?: string
  /** 提交者昵称 */
  author?: string
  createdAt: number
  status: '待审核'
}

interface UploadsState {
  items: UploadItem[]
  add: (item: Omit<UploadItem, 'id' | 'createdAt' | 'status'>) => void
  remove: (id: string) => void
}

const KEY = 'uploads'

export const useUploads = create<UploadsState>()((set, get) => ({
  items: load<UploadItem[]>(KEY, []),

  add: (item) => {
    const next: UploadItem = {
      ...item,
      id: `up_${Date.now().toString(36)}`,
      createdAt: Date.now(),
      status: '待审核',
    }
    const items = [next, ...get().items]
    save(KEY, items)
    set({ items })
  },

  remove: (id) => {
    const items = get().items.filter((x) => x.id !== id)
    save(KEY, items)
    set({ items })
  },
}))
