/**
 * 轻量 WebAudio 工具：节拍器与调音器共用。
 * 所有方法在无 AudioContext 的环境下安全降级（返回 null / no-op）。
 */

type Ctor = typeof AudioContext
const ac: Ctor | undefined =
  typeof window !== 'undefined'
    ? window.AudioContext ||
      (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext
    : undefined

let ctx: AudioContext | null = null

/** 首次用户手势时调用；浏览器拦截自动播放时返回 null */
export function ensureCtx(): AudioContext | null {
  if (!ac) return null
  if (!ctx) {
    try {
      ctx = new ac()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export const ctxNow = () => (ctx ? ctx.currentTime : 0)

export function resumeAll() {
  ensureCtx()
}

/** 在指定绝对时刻发一个短促音（节拍器点击声） */
export function blip(
  at: number,
  opts: { freq: number; gain?: number; dur?: number; type?: OscillatorType } = {
    freq: 1000,
  },
) {
  const c = ctx || ensureCtx()
  if (!c) return
  const { freq, gain = 0.16, dur = 0.05, type = 'square' } = opts
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

/** 播放一个持续纯音（调音器参考音） */
export function tone(freq: number, seconds = 1.2, gain = 0.12) {
  const c = ctx || ensureCtx()
  if (!c) return
  const at = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.03)
  g.gain.setValueAtTime(gain, at + seconds - 0.08)
  g.gain.linearRampToValueAtTime(0, at + seconds)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(at)
  osc.stop(at + seconds + 0.05)
}
