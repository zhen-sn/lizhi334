/**
 * 全局数据契约。
 * 前端阶段所有数据均由 src/data 下的静态模块提供，字段与后端接口保持一致，
 * 后续接入后端时只需把 src/data 换成 fetch 即可。
 */

export type AlbumType = 'studio' | 'live' | 'ep' | 'single' | 'compilation'

export interface Album {
  id: string
  name: string
  /** 发行年份 */
  year: number
  /** 精确发行日，演示数据允许只到年份 */
  date: string
  type: AlbumType
  /** 专辑简介（演示占位文本，需人工校订） */
  description: string
  songIds: string[]
}

export interface Song {
  id: string
  title: string
  albumId: string
  /** 时长（秒） */
  duration: number
  /** 音频地址；留空则播放器走「模拟时钟」模式，无媒体文件也能完整体验 */
  audioUrl: string
  /** LRC 文本；留空则由 buildLrc() 生成结构占位歌词 */
  lyrics: string
  bpm: number
  /** 原调，如 'G' / 'Em' / '#F' */
  key: string
  /** 变调夹品位，0 表示不夹 */
  capo: number
  /** 弹唱难度 1-5 */
  difficulty: number
  tags: string[]
  playCount: number
  year: number
  /** 城市关联，用于主题聚合 */
  city?: string
}

export type VideoCategory = 'live' | 'mv' | 'documentary' | 'behind'

export interface Video {
  id: string
  title: string
  videoUrl: string
  poster: string
  duration: number
  category: VideoCategory
  year: number
  city?: string
  relatedSongId?: string
  description: string
  views: number
}

export interface ChordSection {
  name: string
  lines: string[]
}

export interface ChordSheet {
  songId: string
  /** 六线谱/和弦谱正文（纯文本，含和弦标记） */
  sections: ChordSection[]
  intro: string
  tuning: string
  notes: string
}

export interface SponsorTier {
  id: string
  name: string
  icon: string
  /** 按次赞助金额（元） */
  amount: number
  benefits: string[]
  featured?: boolean
  accent: string
}

export interface TourCity {
  city: string
  province: string
  year: number
  venue: string
  done: boolean
}

export interface Quote {
  text: string
  source: string
}

export interface TimelineEvent {
  date: string
  year: number
  title: string
  text: string
  kind: 'album' | 'tour' | 'life' | 'other'
}
