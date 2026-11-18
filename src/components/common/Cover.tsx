import { coverGlyph, coverStyle } from '../../lib/hash'
import type { Song } from '../../data/types'
import { Icon } from './Icon'

export interface CoverProps {
  seed: string
  title?: string
  year?: number | string
  size?: number | string
  shape?: 'square' | 'wide'
  glyphSize?: number
  onPlay?: () => void
  className?: string
  song?: Song
  spin?: boolean
}

/**
 * 无素材封面：由标题哈希生成固定渐变 + 首字，
 * 保证同一曲目在任何位置出现时视觉一致。
 * 真实封面接入后，只需在内部改为优先渲染 <img src> 即可。
 */
export function Cover({
  seed,
  title,
  year,
  size,
  shape = 'square',
  glyphSize,
  onPlay,
  className = '',
  spin,
}: CoverProps) {
  const style = coverStyle(seed)
  const gs = glyphSize ?? (typeof size === 'number' ? size * 0.32 : 30)
  return (
    <div
      className={`cover cover--${shape} ${className} ${spin ? 'spin' : ''}`}
      style={{ width: typeof size === 'number' ? size : undefined, ...style }}
    >
      <span className="cover__glyph" style={{ fontSize: gs }}>
        {coverGlyph(title ?? seed)}
      </span>
      {year ? <span className="cover__year">{year}</span> : null}
      {onPlay && (
        <button className="cover__play" onClick={onPlay} aria-label="播放">
          <Icon name="play" size={26} />
        </button>
      )}
    </div>
  )
}

export function CoverStack({ songs, size = 54 }: { songs: Song[]; size?: number }) {
  const four = songs.slice(0, 4)
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderRadius: 'var(--r-sm)',
        overflow: 'hidden',
        flex: 'none',
        boxShadow: 'var(--shadow-1)',
      }}
    >
      {four.map((s) => (
        <div key={s.id} style={coverStyle(s.title)} />
      ))}
      {Array.from({ length: Math.max(0, 4 - four.length) }).map((_, i) => (
        <div key={'e' + i} style={{ background: 'var(--bg-3)' }} />
      ))}
    </div>
  )
}
