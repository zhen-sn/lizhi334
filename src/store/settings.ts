import { create } from 'zustand'
import { load, save } from '../lib/storage'

export type ThemeMode = 'dark' | 'light' | 'system'
export type Accent = 'gold' | 'teal' | 'rust' | 'violet'
export type LyricSize = 's' | 'm' | 'l' | 'xl'

export interface SettingsState {
  theme: ThemeMode
  accent: Accent
  lyricSize: LyricSize
  /** 尝试读取 public/media 下的真实音视频 */
  localMedia: boolean
  /** 音质档位，后端接入前仅作 UI 预留 */
  quality: 'low' | 'standard' | 'high' | 'lossless'
  showViz: boolean
  hotkeys: boolean
  autoResume: boolean
  desktopLyric: boolean
  easterEgg: boolean
  /** 手动打开生日模式，便于演示彩蛋 */
  birthdayMode: boolean
  floatingOrb: boolean
  /** 手机端收起播放条，只保留迷你一行 */
  barCollapsed: boolean
  /** 是否启用离线曲库（本地文件夹 + library.json） */
  offlineLibrary: boolean
  /** 离线曲库当前启用的库名，对应 library.json 里的 folder 字段 */
  libraryName: string
  set: (patch: Partial<SettingsState>) => void
  reset: () => void
}

const DEFAULTS = {
  theme: 'dark' as ThemeMode,
  accent: 'gold' as Accent,
  lyricSize: 'm' as LyricSize,
  localMedia: false,
  quality: 'standard' as SettingsState['quality'],
  showViz: true,
  hotkeys: true,
  autoResume: true,
  desktopLyric: false,
  easterEgg: true,
  birthdayMode: false,
  floatingOrb: false,
  barCollapsed: false,
  offlineLibrary: false,
  libraryName: '',
}

export const useSettings = create<SettingsState>((set) => ({
  ...DEFAULTS,
  ...load('settings', {} as Partial<SettingsState>),
  set: (patch) =>
    set((s) => {
      const next = { ...s, ...patch }
      const { set: _drop, reset: _drop2, ...persist } = next
      save('settings', persist)
      return patch
    }),
  reset: () => {
    save('settings', DEFAULTS)
    set({ ...DEFAULTS })
  },
}))

/** 解析出真正生效的明暗 */
export function resolvedTheme(s: SettingsState): 'dark' | 'light' {
  if (s.theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return s.theme
}
