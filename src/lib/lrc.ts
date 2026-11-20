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
