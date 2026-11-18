import { usePlayer } from '../store/player'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'

export function useSongActions() {
  const playQueue = usePlayer((s) => s.playQueue)
  const currentId = usePlayer((s) => s.currentId)
  const toggleFav = useLibrary((s) => s.toggleFav)
  const favs = useLibrary((s) => s.favorites)
  const push = useUi((s) => s.push)
  const openPicker = useUi((s) => s.openPicker)

  const playSong = (songId: string, list?: string[]) => {
    const ids = list?.length ? list : [songId]
    if (!ids.includes(songId)) playQueue([songId, ...ids], 0)
    else playQueue(ids, ids.indexOf(songId))
  }

  return {
    playSong,
    toggle(id: string, list?: string[]) {
      if (currentId === id) usePlayer.getState().toggle()
      else playSong(id, list)
    },
    fav(songId: string) {
      const on = toggleFav(songId)
      push(on ? '已加入「我喜欢」' : '已从「我喜欢」移除', 'good')
      useLibrary.getState().checkAchievements()
    },
    isFav: (songId: string) => favs.includes(songId),
    addToPlaylist(songIds: string[]) {
      openPicker(songIds)
    },
    enqueueNext(songId: string) {
      usePlayer.getState().enqueue([songId])
      push('已插入到下一首', 'good')
    },
  }
}
