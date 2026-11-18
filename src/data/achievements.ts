/** 成就 / 收集徽章：全部基于本地播放统计（localStorage），无后端也能生效 */
export interface Achievement {
  id: string
  icon: string
  name: string
  hint: string
  /** 判定函数入参为当前统计快照 */
  test: (s: StatSnapshot) => boolean
}

export interface StatSnapshot {
  playedIds: string[]
  playCount: number
  totalSeconds: number
  favoriteCount: number
  albumCoverage: number
  completedSongs: number
  consecutiveDays: number
  unlockedKeys: number
  nightPlays: number
}

export const achievements: Achievement[] = [
  { id: 'first', icon: '🌱', name: '第一次播放', hint: '随便点开一首', test: (s) => s.playCount >= 1 },
  { id: 'ten', icon: '🎸', name: '十首过耳', hint: '累计播放 10 次', test: (s) => s.playCount >= 10 },
  { id: 'fifty', icon: '🎼', name: '半张歌单', hint: '听过 30 首不同的歌', test: (s) => s.playedIds.length >= 30 },
  { id: 'full', icon: '🏛', name: '全曲目通读', hint: '听过库里全部曲目', test: (s) => s.playedIds.length >= 56 },
  { id: 'finisher', icon: '⏱', name: '听完一整首', hint: '完整播完 5 首', test: (s) => s.completedSongs >= 5 },
  { id: 'hours', icon: '🕯', name: '十小时', hint: '累计收听 10 小时', test: (s) => s.totalSeconds >= 36000 },
  { id: 'fav', icon: '❤️', name: '有了收藏', hint: '收藏 10 首', test: (s) => s.favoriteCount >= 10 },
  { id: 'albums', icon: '💿', name: '整张听完', hint: '完整听完任意一张专辑', test: (s) => s.albumCoverage >= 1 },
  { id: 'keys', icon: '🔑', name: '转调者', hint: '在变调夹工具里换算 8 次', test: (s) => s.unlockedKeys >= 8 },
  { id: 'night', icon: '🌙', name: '深夜听众', hint: '0 点后听过 20 次', test: (s) => s.nightPlays >= 20 },
  { id: 'streak', icon: '🔥', name: '连续一周', hint: '连续 7 天打开', test: (s) => s.consecutiveDays >= 7 },
  { id: 'rain', icon: '🌧', name: '南京下雨了', hint: '触发一次隐藏彩蛋', test: () => false },
]

/** 隐藏彩蛋配置 */
export const easterEggs = {
  /** 播放这些曲目时页面下雨 */
  rainSongIds: ['s34', 's45', 's40', 's41', 's53', 's55'],
  /** 生日模式：月-日，取自 data/bio.ts 的 profile.birthday */
  birthdayNote: '李志生日当天自动切换金色皮肤并撒纸屑（演示中可在设置里手动开启）',
}
