export interface LrcLine {
  time: number
  text: string
}

const TIME_RE = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g

/** 解析标准 LRC；同一行多个时间标签会展开为多条 */
export function parseLrc(raw: string): LrcLine[] {
  const out: LrcLine[] = []
  for (const line of raw.split(/\r?\n/)) {
    const times = [...line.matchAll(TIME_RE)]
    if (!times.length) continue
    const text = line.replace(TIME_RE, '').trim()
    for (const t of times) {
      const ms = t[3] ? Number(('' + t[3]).padEnd(3, '0').slice(0, 3)) : 0
      out.push({
        time: Number(t[1]) * 60 + Number(t[2]) + ms / 1000,
        text,
      })
    }
  }
  return out.sort((a, b) => a.time - b.time)
}

/** 当前应高亮的行索引；返回 -1 表示前奏 */
export function activeIndex(lines: LrcLine[], t: number) {
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= t + 0.05) idx = i
    else break
  }
  return idx
}

const STRUCTURE = [
  '「前奏」',
  '「第一段 · 主歌」',
  '（此处由用户绑定已授权歌词）',
  '「预副歌」',
  '（此处由用户绑定已授权歌词）',
  '「副歌」',
  '（此处由用户绑定已授权歌词）',
  '（此处由用户绑定已授权歌词）',
  '「间奏」',
  '「第二段 · 主歌」',
  '（此处由用户绑定已授权歌词）',
  '（此处由用户绑定已授权歌词）',
  '「副歌」',
  '（此处由用户绑定已授权歌词）',
  '（此处由用户绑定已授权歌词）',
  '「桥段」',
  '（此处由用户绑定已授权歌词）',
  '「末段反复」',
  '（此处由用户绑定已授权歌词）',
  '（渐弱结束）',
]

/**
 * 没有歌词文件时，生成一份「结构占位歌词」：
 * 只标注段落，不复制任何受版权保护的歌词文本。
 * 时间轴按曲目时长均匀铺开，保证歌词滚动、点击跳转等交互完整可用。
 */
export function buildPlaceholderLrc(duration: number, title: string): string {
  const intro = Math.min(24, duration * 0.1)
  const tail = Math.min(18, duration * 0.08)
  const span = duration - intro - tail
  const step = span / (STRUCTURE.length + 1)
  const lines: string[] = [`[00:00.00] ${title}`, `[00:00.01] 结构占位歌词 · 非正式文本`]
  STRUCTURE.forEach((text, i) => {
    const t = intro + step * i
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    const ms = Math.floor((t % 1) * 100)
    lines.push(
      `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(
        ms,
      ).padStart(2, '0')}] ${text}`,
    )
  })
  return lines.join('\n')
}

export const isPlaceholder = (raw: string) => raw.includes('结构占位歌词')
