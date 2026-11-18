import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { clamp } from '../../lib/format'

export interface SliderProps {
  value: number
  max: number
  onScrub: (v: number) => void
  onCommit?: (v: number) => void
  format?: (v: number) => string
  className?: string
  disabled?: boolean
  /** 是否只在松手时提交（音量条用 false，进度条用 true 更顺滑） */
  live?: boolean
}

/** 可键盘操作的进度/音量条 */
export function Slider({
  value,
  max,
  onScrub,
  onCommit,
  format,
  className = '',
  disabled,
  live = true,
}: SliderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragV, setDragV] = useState(0)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const at = useCallback(
    (clientX: number) => {
      const el = ref.current
      if (!el) return 0
      const r = el.getBoundingClientRect()
      return clamp((clientX - r.left) / Math.max(r.width, 1), 0, 1) * max
    },
    [max],
  )

  const shown = dragging ? dragV : value
  const p = max > 0 ? clamp(shown / max, 0, 1) : 0

  return (
    <div
      ref={ref}
      className={`slider ${className} ${dragging ? 'is-drag' : ''}`}
      style={{ '--p': p } as CSSProperties}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(shown)}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const v = at(e.clientX)
        setDragging(true)
        setDragV(v)
        if (live) onScrub(v)
      }}
      onPointerMove={(e) => {
        if (disabled) return
        setHoverX(e.clientX)
        if (dragging) {
          const v = at(e.clientX)
          setDragV(v)
          if (live) onScrub(v)
        }
      }}
      onPointerUp={(e) => {
        if (!dragging) return
        const v = at(e.clientX)
        setDragging(false)
        if (live) onCommit?.(v)
        else {
          onScrub(v)
          onCommit?.(v)
        }
      }}
      onPointerLeave={() => setHoverX(null)}
      onKeyDown={(e) => {
        if (disabled) return
        const step = max / 20
        if (e.key === 'ArrowRight') {
          const v = clamp(value + step, 0, max)
          onScrub(v)
          onCommit?.(v)
        } else if (e.key === 'ArrowLeft') {
          const v = clamp(value - step, 0, max)
          onScrub(v)
          onCommit?.(v)
        }
      }}
    >
      <div className="slider__rail">
        <div className="slider__fill" />
        <div className="slider__knob" />
      </div>
      {hoverX != null && format && (
        <div
          className="slider__tip"
          style={{ left: `${clamp((hoverX - (ref.current?.getBoundingClientRect().left ?? 0)) / Math.max(ref.current?.getBoundingClientRect().width ?? 1, 1), 0, 1) * 100}%` }}
        >
          {format(at(hoverX))}
        </div>
      )}
    </div>
  )
}
