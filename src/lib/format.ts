export const mmss = (sec: number) => {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export const hms = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export const humanTime = (sec: number) => {
  if (sec < 60) return `${Math.round(sec)} 秒`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟`
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

/** 播放量：41.2 万 */
export const playCount = (n: number) => {
  if (n < 10000) return String(n)
  return (n / 10000).toFixed(n < 100000 ? 1 : 0) + ' 万'
}

export const ordinal = (n: number) => String(n).padStart(2, '0')

export const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, v))

export const pct = (v: number) => `${Math.round(v * 100)}%`

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return '还没睡'
  if (h < 11) return '早上好'
  if (h < 14) return '午安'
  if (h < 18) return '下午好'
  if (h < 23) return '晚上好'
  return '夜深了'
}
