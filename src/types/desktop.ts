export interface DesktopState {
  songId: string | null
  title: string
  artist: string
  album: string
  playing: boolean
  time: number
  duration: number
}

export interface LyricLine {
  time: number
  text: string
}

export interface LyricState {
  songId: string | null
  title: string
  artist: string
  playing: boolean
  lines: LyricLine[]
  activeIndex: number
}

export interface LibraryPayload {
  folder: string
  /** songs.json 原始对象；运行时 media.ts 按 id 读取其中的 audio/videoUrl */
  songs: Record<string, { id?: string; audioUrl?: string; videoUrl?: string; [k: string]: unknown }>
  createdAt: number
}

export interface DesktopApi {
  isDesktop: boolean
  platform: string

  openMini: () => void
  closeMini: () => void
  hideMain: () => void

  minimize: () => void
  maximize: () => void
  closeWindow: () => void
  onMaxState: (cb: (maxed: boolean) => void) => () => void

  openLyric: () => void
  closeLyric: () => void
  lyricLock: () => void
  lyricUnlock: () => void

  pickLibraryFolder: () => Promise<string | null>
  saveLibrary: (payload: LibraryPayload) => Promise<{ ok: boolean; error?: string }>
  loadLibrary: () => Promise<{ ok: boolean; data: LibraryPayload | null; error?: string }>
  clearLibrary: () => Promise<{ ok: boolean; error?: string }>

  sendCommand: (cmd: 'toggle' | 'next' | 'prev') => void
  sendState: (state: DesktopState) => void
  sendLyricState: (state: LyricState) => void
  requestState: () => void

  onCommand: (cb: (cmd: string) => void) => () => void
  onState: (cb: (state: DesktopState) => void) => () => void
  onLyricState: (cb: (state: LyricState) => void) => () => void
}

declare global {
  interface Window {
    /** 仅在 Electron 客户端内存在，浏览器里为 undefined */
    desktop?: DesktopApi
  }
}

export {}
