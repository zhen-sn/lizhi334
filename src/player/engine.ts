/**
 * 全局播放引擎（单例）。
 *
 * 两种模式：
 *  real —— 有可用媒体文件时走 HTMLAudioElement，支持真实解码与 WebAudio 分析；
 *  sim  —— 没有媒体文件时用 performance.now() 推进虚拟时钟，
 *          进度条 / 歌词同步 / 自动切歌 / 定时关闭等逻辑完全一致。
 *
 * 上层（store/player.ts）只订阅快照，不关心当前处于哪种模式，
 * 因此后端接入后无需修改 UI 代码。
 */

export type EngineMode = 'real' | 'sim'

export interface TrackSpec {
  src: string
  duration: number
  startAt?: number
}

type Void = () => void

class Engine {
  el: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private freq = new Uint8Array(0)
  private sourceBound = false

  mode: EngineMode = 'sim'
  private running = false
  private duration = 0
  private simBase = 0
  private simStart = 0
  private rate = 1
  private volume = 0.8
  private muted = false
  private timer: ReturnType<typeof setInterval> | null = null
  private pendingSeek: number | null = null

  private subs = new Set<Void>()
  private endSubs = new Set<Void>()
  private loadFailSubs = new Set<Void>()

  constructor() {
    this.ensureElement()
    this.timer = setInterval(() => this.tick(), 100)
  }

  private ensureElement() {
    if (this.el) return
    const el = new Audio()
    el.preload = 'metadata'
    el.volume = this.volume
    el.playbackRate = this.rate
    el.addEventListener('ended', () => this.fireEnded())
    el.addEventListener('error', () => {
      // 媒体取不到 → 静默退回模拟时钟，保证体验连续
      if (this.mode === 'real') {
        const at = this.simBase
        this.el!.removeAttribute('src')
        this.el!.load()
        this.mode = 'sim'
        this.simBase = at
        this.simStart = performance.now()
        this.loadFailSubs.forEach((f) => f())
        this.emit()
      }
    })
    el.addEventListener('loadedmetadata', () => {
      const d = this.el!.duration
      if (isFinite(d) && d > 0) this.duration = d
      if (this.pendingSeek != null) {
        try {
          this.el!.currentTime = this.pendingSeek
        } catch {
          /* 元数据不可seek时忽略 */
        }
        this.pendingSeek = null
      }
      this.emit()
    })
    this.el = el
  }

  /** 首次用户手势时调用，解锁 WebAudio */
  resumeContext() {
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
  }

  private bindAnalyser() {
    if (this.sourceBound || !this.el) return
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      this.ctx = new Ctx()
      const src = this.ctx.createMediaElementSource(this.el)
      const an = this.ctx.createAnalyser()
      an.fftSize = 256
      an.smoothingTimeConstant = 0.8
      src.connect(an)
      an.connect(this.ctx.destination)
      this.analyser = an
      this.freq = new Uint8Array(an.frequencyBinCount)
      this.sourceBound = true
    } catch {
      this.analyser = null
    }
  }

  setTrack(spec: TrackSpec) {
    const startAt = spec.startAt ?? 0
    this.duration = spec.duration
    this.simBase = startAt

    if (spec.src) {
      this.ensureElement()
      this.mode = 'real'
      this.bindAnalyser()
      const abs = new URL(spec.src, document.baseURI).href
      if (this.el!.src !== abs) {
        this.el!.src = abs
        this.el!.load()
      }
      // currentTime 需要等元数据就绪，交由 loadedmetadata 应用
      this.pendingSeek = startAt > 0 ? startAt : null
      if (startAt > 0) {
        try {
          this.el!.currentTime = startAt
          this.pendingSeek = null
        } catch {
          /* ignore */
        }
      }
    } else {
      this.mode = 'sim'
      if (this.el && this.el.getAttribute('src')) {
        this.el.removeAttribute('src')
        this.el.load()
      }
    }
    this.emit()
  }

  play() {
    if (this.running) return
    this.running = true
    if (this.mode === 'real' && this.el) {
      this.resumeContext()
      this.el.volume = this.muted ? 0 : this.volume
      this.el.play().catch(() => {
        /* 自动播放被拦截时保持 UI 状态一致 */
      })
    } else {
      this.simStart = performance.now()
    }
    this.emit()
  }

  pause() {
    if (!this.running) return
    if (this.mode === 'real' && this.el) {
      this.simBase = this.el.currentTime
      this.el.pause()
    } else {
      this.simBase = this.time()
    }
    this.running = false
    this.emit()
  }

  toggle() {
    this.running ? this.pause() : this.play()
  }

  seek(t: number) {
    const v = Math.max(0, Math.min(this.duration, t))
    if (this.mode === 'real' && this.el) {
      try {
        this.el.currentTime = v
      } catch {
        /* 元数据未就绪时忽略 */
      }
    }
    this.simBase = v
    this.simStart = performance.now()
    this.emit()
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.el) this.el.volume = this.muted ? 0 : this.volume
    this.emit()
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.el) this.el.volume = m ? 0 : this.volume
    this.emit()
  }

  setRate(r: number) {
    this.rate = r
    if (this.el) this.el.playbackRate = r
    this.emit()
  }

  time() {
    if (this.mode === 'real' && this.el) return this.el.currentTime
    const extra = this.running
      ? ((performance.now() - this.simStart) / 1000) * this.rate
      : 0
    return Math.min(this.simBase + extra, this.duration)
  }

  durationOf() {
    return this.duration
  }

  isPlaying() {
    return this.running
  }

  currentVolume() {
    return this.volume
  }

  isMuted() {
    return this.muted
  }

  /**
   * 取 32 段频谱用于可视化。
   * 真实音频走 AnalyserNode；模拟模式下按当前时间点合成一个「像音乐」的包络，
   * 这样在没有素材时可视化依然有呼吸感。
   */
  spectrum(bars: number, t: number): number[] {
    const out: number[] = []
    if (this.mode === 'real' && this.analyser && this.freq.length) {
      this.analyser.getByteFrequencyData(this.freq)
      const step = Math.floor(this.freq.length / bars) || 1
      for (let i = 0; i < bars; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) sum += this.freq[i * step + j] || 0
        out.push(Math.min(1, sum / step / 200))
      }
      return out
    }
    if (!this.running) return new Array(bars).fill(0)
    for (let i = 0; i < bars; i++) {
      const a = Math.sin((t * 2.1 + i * 0.55) * 1.7)
      const b = Math.sin((t * 0.8 + i * 0.23) * 2.9)
      const env = Math.sin((t / Math.max(this.duration, 1)) * Math.PI)
      const v = (a * 0.5 + b * 0.5) * 0.5 + 0.5
      out.push(Math.min(1, v * (0.35 + env * 0.65)))
    }
    return out
  }

  subscribe(fn: Void) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }

  onEnded(fn: Void) {
    this.endSubs.add(fn)
    return () => this.endSubs.delete(fn)
  }

  onLoadFail(fn: Void) {
    this.loadFailSubs.add(fn)
    return () => this.loadFailSubs.delete(fn)
  }

  private fireEnded() {
    this.running = false
    this.simBase = 0
    this.endSubs.forEach((f) => f())
    this.emit()
  }

  private tick() {
    if (this.running && this.mode === 'sim' && this.time() >= this.duration - 0.05) {
      this.fireEnded()
      return
    }
    this.emit()
  }

  private emit() {
    this.subs.forEach((f) => f())
  }
}

export const engine = new Engine()
