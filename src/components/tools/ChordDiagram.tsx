import type { ChordShape } from '../../data/chords'

/**
 * 和弦指法图：纯 SVG 绘制，不依赖图片。
 * 品位窗口按指型自动上下平移（高把位和弦也能正常显示）。
 */
export function ChordDiagram({
  shape,
  width = 72,
  showName = true,
}: {
  shape: ChordShape
  width?: number
  showName?: boolean
}) {
  const FRETS = 5
  const xs = Array.from({ length: 6 }, (_, s) => 7 + s * 9.6)
  const nut = 20
  const fh = 13

  const pressed = shape.frets.filter((f) => f > 0)
  const lowest = pressed.length ? Math.min(...pressed) : 1
  const start = lowest >= 5 ? lowest - 1 : 1

  const label = (f: number) => {
    if (f < start || f > start + FRETS - 1) return null
    return f - start
  }

  const height = nut + fh * FRETS + 8
  return (
    <svg
      viewBox={`0 0 62 ${height}`}
      width={width}
      height={(width / 62) * height}
      style={{ display: 'block', color: 'var(--fg-3)' }}
      role="img"
      aria-label={`${shape.display} 和弦指法图`}
    >
      {showName && (
        <text
          x="31"
          y="12"
          textAnchor="middle"
          fill="var(--fg)"
          style={{ font: '600 12px var(--font-mono)' }}
        >
          {shape.display}
        </text>
      )}

      {/* 品格网格 */}
      {Array.from({ length: FRETS + 1 }).map((_, i) => (
        <line
          key={'h' + i}
          x1={xs[0]}
          x2={xs[5]}
          y1={nut + i * fh}
          y2={nut + i * fh}
          stroke="currentColor"
          strokeWidth={i === 0 && start === 1 ? 2.6 : 0.9}
        />
      ))}
      {xs.map((x, i) => (
        <line key={'v' + i} x1={x} x2={x} y1={nut} y2={nut + FRETS * fh} stroke="currentColor" strokeWidth="0.9" />
      ))}

      {/* 大横按 */}
      {shape.barre != null && shape.barre >= start && (
        <rect
          x={xs[0] - 3.6}
          y={nut + (shape.barre - start) * fh + fh / 2 - 4.2}
          width={xs[5] - xs[0] + 7.2}
          height={8.4}
          rx={4.2}
          fill="var(--gold)"
          opacity="0.9"
        />
      )}

      {/* 每根弦的标记 */}
      {shape.frets.map((f, s) => {
        const row = label(f)
        if (row === null) {
          return f === -1 ? (
            <text
              key={s}
              x={xs[s]}
              y={nut - 5}
              textAnchor="middle"
              fill="var(--fg-3)"
              style={{ font: '600 9px var(--font-mono)' }}
            >
              ×
            </text>
          ) : f === 0 && start === 1 ? (
            <circle key={s} cx={xs[s]} cy={nut - 8} r="2.6" fill="none" stroke="var(--fg-2)" strokeWidth="1" />
          ) : null
        }
        const finger = shape.fingers[s]
        return (
          <g key={s}>
            <circle cx={xs[s]} cy={nut + row * fh + fh / 2} r="4.4" fill="var(--gold)" />
            {finger > 0 && (
              <text
                x={xs[s]}
                y={nut + row * fh + fh / 2 + 2.6}
                textAnchor="middle"
                fill="var(--on-gold)"
                style={{ font: '700 7px var(--font-mono)' }}
              >
                {finger}
              </text>
            )}
          </g>
        )
      })}

      {/* 品位数字 */}
      {start > 1 && (
        <text
          x={xs[5] + 5}
          y={nut + fh / 2 + 3}
          fill="var(--fg-3)"
          style={{ font: '600 8px var(--font-mono)' }}
        >
          {start}fr
        </text>
      )}
    </svg>
  )
}

/** 简化版：只显示和弦名 + 指法图，用于谱面里的和弦条 */
export function ChordChip({ shape }: { shape?: ChordShape }) {
  if (!shape) return null
  return (
    <span className="chord" style={{ padding: 8, display: 'inline-block' }}>
      <ChordDiagram shape={shape} width={62} />
    </span>
  )
}
