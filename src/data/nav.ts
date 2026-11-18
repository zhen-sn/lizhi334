export interface NavItem {
  to: string
  label: string
  icon: string
  desc?: string
  group: 'main' | 'lib'
}

export const navItems: NavItem[] = [
  { to: '/', label: '主页', icon: 'home', group: 'main', desc: '每日推荐与入口' },
  { to: '/songs', label: '歌曲', icon: 'music', group: 'main', desc: '曲目库与专辑' },
  { to: '/videos', label: 'MV 视频', icon: 'video', group: 'main', desc: '现场与纪实' },
  { to: '/shorts', label: '短视频', icon: 'film', group: 'main', desc: '水友竖屏片段' },
  { to: '/more', label: '更多', icon: 'more', group: 'main', desc: '百科 · 巡演 · 报告' },
]

/**
 * 移动端底部导航。
 * 只保留四个一级入口：侧栏的六项在手机上太挤，
 * 「工具」保留在首页入口，「赞助」收进「更多」页。
 */
export const tabItems: { to: string; label: string; icon: string }[] = [
  { to: '/', label: '主页', icon: 'home' },
  { to: '/songs', label: '歌曲', icon: 'music' },
  { to: '/videos', label: '视频', icon: 'video' },
  { to: '/more', label: '更多', icon: 'more' },
]

export const libItems: { to: string; label: string; icon: string }[] = [
  { to: '/playlist/fav', label: '我喜欢', icon: 'heart' },
  { to: '/history', label: '最近播放', icon: 'clock' },
  { to: '/search', label: '搜索', icon: 'search' },
]
