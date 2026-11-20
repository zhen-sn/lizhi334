import { useEffect, useState } from 'react'
import { ensureSongDetail, isSongDetailReady } from '../api/content'

/**
 * 单曲详情（歌词 + 完整和弦谱）是否就绪。
 * bootstrap 不再包含大字段，进入详情/播放页时按需拉取。
 */
export function useSongDetail(songId?: string | null): boolean {
  const [ready, setReady] = useState(() => (songId ? isSongDetailReady(songId) : true))

  useEffect(() => {
    if (!songId) {
      setReady(true)
      return
    }
    if (isSongDetailReady(songId)) {
      setReady(true)
      return
    }
    let alive = true
    setReady(false)
    ensureSongDetail(songId).then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [songId])

  return ready
}