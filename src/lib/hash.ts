import type { CSSProperties } from 'react'

/** 稳定哈希：把字符串映射为 32 位整数，用于生成占位封面配色 */
export function hash32(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Palette {
  from: string
  to: string
  hue: number
  angle: number
}

/** 由标题推导出一组固定渐变，保证同一首歌任何时候颜色一致 */
export function coverPalette(seed: string): Palette {
  const h = hash32(seed)
  const hue = h % 360
  const hue2 = (hue + 40 + (h >>> 9) % 120) % 360
  const angle = (h >>> 17) % 360
  const sat = 34 + ((h >>> 5) % 26)
  const light = 30 + ((h >>> 11) % 18)
  return {
    from: `hsl(${hue} ${sat}% ${light}%)`,
    to: `hsl(${hue2} ${sat + 8}% ${light - 12}%)`,
    hue,
    angle,
  }
}

export function coverStyle(seed: string): CSSProperties {
  const p = coverPalette(seed)
  return {
    background: `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})`,
  }
}

/** 按日期取当日确定性随机（每日推荐同一天不变） */
export function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function pickBySeed<T>(list: T[], seed: number): T {
  const r = seededRandom(seed)
  return list[Math.floor(r() * list.length) % list.length]
}

/** 取标题首字（拉丁字母则取前两个字母）作为封面字符 */
export function coverGlyph(title: string) {
  const clean = title.replace(/[（(].*$/, '').trim()
  if (/^[A-Za-z]/.test(clean)) return clean.slice(0, 2).toUpperCase()
  const digits = clean.match(/\d+/)
  if (digits && digits.index === 0) return digits[0].slice(-2)
  return clean.slice(0, 1)
}
