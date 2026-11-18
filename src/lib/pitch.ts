/**
 * 音高检测（自相关 / ACF）。
 * 只依赖 AnalyserNode 的时域数据，不引入任何分析库。
 * 拿不到麦克风时，调用方可退回到「手动输入频率」模式。
 */

export interface PitchResult {
  /** 检测到的基频，Hz；无有效结果时为 0 */
  freq: number
  /** 归一化清晰度 0~1，可理解为「有没有在弹」 */
  clarity: number
  /** 相对参照音的音分偏差（-50 ~ 50 之外表示差了一个半音） */
  cents: number
  /** 最近的 MIDI 音高编号 */
  midi: number
}

/** 时域采样 → 基频；算法取自著名的 ACF2+ 简化版 */
export function detectPitch(buf: Float32Array, sampleRate: number): { freq: number; clarity: number } {
  const SIZE = buf.length
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.012) return { freq: 0, clarity: 0 }

  // 去掉首尾低于 10% 峰值的静音段，缩短搜索窗口
  const thr = 0.2
  let start = 0
  let end = SIZE - 1
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thr) {
      start = i
      break
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thr) {
      end = SIZE - i
      break
    }
  }
  const slice = buf.slice(start, end)
  const n = slice.length
  if (n < 512) return { freq: 0, clarity: 0 }

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / 55)) // 下限约 55Hz
  const minLag = Math.max(2, Math.floor(sampleRate / 1400)) // 上限约 1400Hz
  if (maxLag <= minLag) return { freq: 0, clarity: 0 }

  let bestLag = -1
  let bestCorr = -1
  let energy = 0
  for (let i = 0; i < n; i++) energy += slice[i] * slice[i]
  const base = energy / n || 1

  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0
    for (let i = 0; i < n - lag; i++) c += slice[i] * slice[i + lag]
    const score = Math.min(1, Math.max(0, c / (n - lag) / base))
    if (score > bestCorr) {
      bestCorr = score
      bestLag = lag
    }
  }

  if (bestLag < 0 || bestCorr < 0.35) return { freq: 0, clarity: Math.max(0, bestCorr) }
  return { freq: sampleRate / bestLag, clarity: bestCorr }
}

export const freqToMidi = (f: number) => Math.round(69 + 12 * Math.log2(f / 440))
export const midiToCents = (f: number, midi: number) =>
  100 * (12 * Math.log2(f / 440) + 69 - midi)

/** 一次分析帧：给出频率、最近音名与音分偏差 */
export function analyze(buf: Float32Array, sampleRate: number, refA4 = 440): PitchResult | null {
  const { freq, clarity } = detectPitch(buf, sampleRate)
  if (!freq) return null
  const scaled = (freq * refA4) / 440
  const midi = freqToMidi(scaled)
  return { freq, clarity, midi, cents: midiToCents(scaled, midi) }
}

export interface MicSession {
  stop: () => void
}

/**
 * 请求麦克风并开始逐帧分析。
 * resolve(true) 表示已授权并开始；resolve(false) 表示被拒绝或浏览器不支持。
 */
export async function startMic(
  onFrame: (buf: Float32Array, sampleRate: number) => void,
): Promise<MicSession | null> {
  const md = navigator.mediaDevices
  if (!md?.getUserMedia) return null
  let stream: MediaStream
  try {
    stream = await md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
  } catch {
    return null
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctor()
  const src = ctx.createMediaStreamSource(stream)
  const an = ctx.createAnalyser()
  an.fftSize = 2048
  src.connect(an)
  const buf = new Float32Array(an.fftSize)
  let timer = 0
  const loop = () => {
    an.getFloatTimeDomainData(buf)
    onFrame(buf, ctx.sampleRate)
    timer = requestAnimationFrame(loop)
  }
  timer = requestAnimationFrame(loop)
  return {
    stop() {
      cancelAnimationFrame(timer)
      stream.getTracks().forEach((t) => t.stop())
      ctx.close().catch(() => {})
    },
  }
}
