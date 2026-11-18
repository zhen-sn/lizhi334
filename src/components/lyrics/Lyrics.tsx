import { useEffect, useMemo, useRef } from 'react'
import type { Song } from '../../data/types'
import { activeIndex, buildPlaceholderLrc, parseLrc } from '../../lib/lrc'
import { useSettings } from '../../store/settings'

export function useSongLyric(song?: Song | null) {
  return useMemo(() => {
    if (!song) return { lines: [], placeholder: true }
    const raw = song.lyrics?.trim() || buildPlaceholderLrc(song.duration, song.title)
    return {
      lines: parseLrc(raw),
      placeholder: raw.includes('结构占位歌词'),
    }
  }, [song])
}

export function Lyrics({
  song,
  time,
  onSeek,
  height,
  className = '',
}: {
  song?: Song | null
  time: number
  onSeek?: (t: number) => void
  height?: number | string
  className?: string
}) {
  const { lines, placeholder } = useSongLyric(song)
  const ref = useRef<HTMLUListElement>(null)
  const idx = activeIndex(lines, time)
  const lastIdx = useRef(-1)
  const size = useSettings((s) => s.lyricSize)

  useEffect(() => {
    if (idx === lastIdx.current) return
    lastIdx.current = idx
    const el = ref.current
    if (!el) return
    const row = el.children[idx < 0 ? 0 : idx] as HTMLElement | undefined
    if (!row) return
    el.scrollTo({
      top: row.offsetTop - el.clientHeight / 2 + row.offsetHeight / 2,
      behavior: idx < 0 ? 'auto' : 'smooth',
    })
  }, [idx])

  return (
    <div className="lyric-wrap" data-lyric-size={size}>
      <ul ref={ref} className={`lyrics ${className}`} style={height ? { height } : undefined}>
        {placeholder && (
          <li className="lyrics__meta" style={{ cursor: 'default' }}>
            ⚠ 结构占位歌词 · 需绑定已授权文本
          </li>
        )}
        {lines.length === 0 && (
          <li className="lyrics__meta" style={{ cursor: 'default' }}>
            暂无歌词
          </li>
        )}
        {lines.map((l, i) => (
          <li
            key={i}
            className={i === idx ? 'is-on' : i === idx + 1 ? 'is-next' : ''}
            onClick={() => onSeek?.(l.time)}
            title={onSeek ? '跳转到此处' : undefined}
          >
            {l.text || '♪'}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 迷你播放条用的单行歌词 */
export function LyricsTicker({ song, time }: { song?: Song | null; time: number }) {
  const { lines } = useSongLyric(song)
  const idx = activeIndex(lines, time)
  const text = idx >= 0 ? lines[idx].text : song ? '♪ ♪ ♪' : ''
  return (
    <div className="nowrap ticker" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
      {text}
    </div>
  )
}
