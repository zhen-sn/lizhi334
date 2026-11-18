/**
 * 媒体地址解析。
 *
 * 地址优先级（高到低）：
 * 1. 显式传入 explicit（Song/Video 上的 audioUrl 字段）
 * 2. 离线曲库映射（library.json 里按 id 找 folder/{audioFileName}.mp3）
 * 3. public/media/{audio,video}/{id}.{mp3,mp4} —— 需要「本地媒体」开关
 * 4. 空字符串 → 模拟时钟
 */

export type MediaKind = 'audio' | 'video'

const candidates = new Map<string, string>()

/** 运行时离线曲库覆盖。key 是 id，value 是 file:///... 的绝对 URL */
const offlineMap = new Map<string, string>()

export function setOfflineLibrarySongs(songs: Record<string, { id?: string; audioFileName?: string; videoFileName?: string }>, folder: string) {
  offlineMap.clear()
  if (!songs || !folder) return
  for (const song of Object.values(songs)) {
    const id = song.id
    if (!id) continue
    if (song.audioFileName) {
      offlineMap.set('audio' + id, `file://${folder.replace(/\\/g, '/')}/${song.audioFileName}`)
    }
    if (song.videoFileName) {
      offlineMap.set('video' + id, `file://${folder.replace(/\\/g, '/')}/${song.videoFileName}`)
    }
  }
}

export function clearOfflineLibrary() {
  offlineMap.clear()
}

export function mediaUrl(
  kind: MediaKind,
  id: string,
  explicit: string,
  enabled: boolean,
  offlineEnabled: boolean,
): string {
  if (explicit) return explicit
  if (offlineEnabled) {
    const hit = offlineMap.get(kind + id)
    if (hit) return hit
  }
  if (!enabled) return ''
  const hit2 = candidates.get(kind + id)
  if (hit2) return hit2
  return `media/${kind}/${id}.${kind === 'audio' ? 'mp3' : 'mp4'}`
}

export function rememberMediaOk(key: string, url: string) {
  candidates.set(key, url)
}
