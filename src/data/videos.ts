import type { Video } from './types'

/**
 * 演示数据：视频条目。
 * videoUrl 留空时，播放页会渲染一台「模拟放映机」（Canvas 动效 + 计时进度），
 * 把真实视频放进 public/media/video/{id}.mp4 并在设置里开启本地媒体即可自动切换。
 */
const rows: [string, Video['category'], number, string, number, string?, string?][] = [
  ['叁叁肆 · 第 100 场 开场纪录', 'documentary', 612, '2019', 214530, '成都'],
  ['山阴路的夏天 · 现场', 'live', 358, '2018', 186420, '南京', 's33'],
  ['你离开了南京，从此没有人和我说话 · 现场', 'live', 425, '2019', 302180, '南京', 's45'],
  ['关于郑州的记忆 · MV', 'mv', 401, '2015', 421660, '郑州', 's21'],
  ['热河 · 现场', 'live', 399, '2017', 145230, '承德', 's39'],
  ['梵高先生 · 排练室', 'behind', 526, '2018', 68940, '南京'],
  ['定西 · 回家路上（巡演花絮）', 'documentary', 738, '2019', 92100, '定西'],
  ['天空之城 · 万人合唱', 'live', 336, '2019', 388720, '武汉', 's44'],
  ['这个世界会好吗 · 现场', 'live', 441, '2018', 121450, '西安', 's50'],
  ['乐队成员的一天', 'behind', 864, '2020', 45210, '南京'],
  ['人民不需要自由 · 现场', 'live', 344, '2019', 176300, '重庆', 's51'],
  ['你好，郑州 · 城市影像', 'mv', 356, '2016', 98760, '郑州', 's20'],
  ['巡演路上的 334 个夜晚', 'documentary', 1102, '2021', 231400],
  ['彩排：调音与试声', 'behind', 415, '2019', 28930, '南京'],
  ['杭州 · 现场', 'live', 372, '2018', 156800, '杭州', 's22'],
  ['和弦教学：天空之城', 'behind', 690, '2020', 214650, '南京', 's09'],
]

export const videos: Video[] = rows.map((r, i) => ({
  id: 'v' + String(i + 1).padStart(2, '0'),
  title: r[0],
  category: r[1],
  duration: r[2],
  year: Number(r[3]),
  views: r[4],
  city: r[5],
  relatedSongId: r[6],
  videoUrl: '',
  poster: '',
  description: '',
}))

export const videoMap: Record<string, Video> = Object.fromEntries(
  videos.map((v) => [v.id, v]),
)

export const videoCategories: {
  key: Video['category'] | 'all'
  label: string
}[] = [
  { key: 'all', label: '全部' },
  { key: 'live', label: '现场' },
  { key: 'mv', label: 'MV' },
  { key: 'documentary', label: '巡演纪实' },
  { key: 'behind', label: '幕后' },
]

export const videoCategoryLabel: Record<Video['category'], string> = {
  live: '现场',
  mv: 'MV',
  documentary: '巡演纪实',
  behind: '幕后',
}
