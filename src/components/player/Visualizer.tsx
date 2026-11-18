import { useEffect, useRef } from 'react'
import { engine } from '../../player/engine'
import { usePlayer } from '../../store/player'

/**
 * 频谱可视化。
 * 直接写 DOM style，不进入 React 渲染周期，60fps 也不会带着整页重绘。
 */
export function Visualizer({ bars = 32, height = 58 }: { bars?: number; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const playing = usePlayer((s) => s.playing)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const cells = Array.from(el.children) as HTMLElement[]
    const loop = () => {
      const data = engine.spectrum(bars, engine.time())
      cells.forEach((c, i) => {
        c.style.height = `${Math.max(3, data[i] * height)}px`
      })
      raf = requestAnimationFrame(loop)
    }
    if (playing) raf = requestAnimationFrame(loop)
    else cells.forEach((c) => (c.style.height = '3px'))
    return () => cancelAnimationFrame(raf)
  }, [playing, bars, height])

  return (
    <div className="viz" ref={ref} style={{ height }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <i key={i} style={{ height: 3 }} />
      ))}
    </div>
  )
}
