export interface Short {
  id: string
  /** 标题 */
  title: string
  /** 上传者昵称（不含 @） */
  author: string
  /** 一句话描述 */
  desc: string
  tags: string[]
  city?: string
  /** 时长（秒） */
  duration: number
  /** 基础点赞数（用户点赞在此之上 +1） */
  likes: number
  /** 基础评论数（真实评论另计） */
  comments: number
  /** 基础收藏数 */
  saves: number
  /** 播放量 */
  views: number
  /** 关联的原声 / 曲目名 */
  song?: string
}

/** 短视频内容（演示数据，水友上传的竖屏片段） */
export const shorts: Short[] = [
  {
    id: 'sc01',
    title: '成都 · 全场接唱的那半句',
    author: '阿远在成都',
    desc: '2023 最后一场，前奏一起台下就跟着唱了，这段一直没舍得删。',
    tags: ['成都', '现场', '万人大合唱'],
    city: '成都',
    duration: 32,
    likes: 18600,
    comments: 412,
    saves: 2360,
    views: 512000,
    song: '成都',
  },
  {
    id: 'sc02',
    title: '南方姑娘 指弹前奏',
    author: '老周的琴',
    desc: '练了三个月的前奏，还是第三小节会滑一下。',
    tags: ['指弹', 'cover', '南方姑娘'],
    duration: 24,
    likes: 6420,
    comments: 138,
    saves: 980,
    views: 138000,
    song: '南方姑娘',
  },
  {
    id: 'sc03',
    title: '小酒馆门口，有人在唱《画》',
    author: '玉林路口',
    desc: '散场以后门口还有人抱着琴，路过的都在跟着哼。',
    tags: ['街头', '画', '成都'],
    city: '成都',
    duration: 41,
    likes: 9310,
    comments: 205,
    saves: 1420,
    views: 227000,
    song: '画',
  },
  {
    id: 'sc04',
    title: '雨里的《理想》，伞都收了',
    author: '西安的风',
    desc: '下小雨，前排没人打伞，唱到副歌全场一起喊。',
    tags: ['理想', '现场', '下雨'],
    city: '西安',
    duration: 37,
    likes: 12400,
    comments: 288,
    saves: 1830,
    views: 341000,
    song: '理想',
  },
  {
    id: 'sc05',
    title: '后台三十秒：调音',
    author: '巡演跟拍',
    desc: '开场前最后一次调弦，所有人都在等那个「可以」。',
    tags: ['后台', '花絮', '调音'],
    duration: 19,
    likes: 3180,
    comments: 64,
    saves: 420,
    views: 76000,
  },
  {
    id: 'sc06',
    title: '三十岁的女人 · 清唱一段',
    author: '木木',
    desc: '宿舍熄灯以后录的，气声有点大，别嫌弃。',
    tags: ['清唱', '翻唱', '三十岁的女人'],
    duration: 28,
    likes: 8740,
    comments: 176,
    saves: 1260,
    views: 196000,
    song: '三十岁的女人',
  },
  {
    id: 'sc07',
    title: '《鼓楼》前奏，鼓手的手',
    author: '鼓手老K',
    desc: '机位固定在鼓这边，能看清每一下军鼓的位置。',
    tags: ['鼓楼', '鼓', '特写'],
    city: '北京',
    duration: 26,
    likes: 5620,
    comments: 91,
    saves: 760,
    views: 118000,
    song: '鼓楼',
  },
  {
    id: 'sc08',
    title: '巡演大巴上哼的两句新词',
    author: '车上的人',
    desc: '不知道会不会收录，先记下来，别外传太久。',
    tags: ['新歌', '花絮', '大巴'],
    duration: 22,
    likes: 15200,
    comments: 397,
    saves: 2140,
    views: 428000,
  },
  {
    id: 'sc09',
    title: '换弦全过程，四分钟压成三十秒',
    author: '琴行小王',
    desc: '民谣吉他换弦，顺带擦了一遍指板，声音真的不一样。',
    tags: ['教程', '换弦', '器材'],
    duration: 30,
    likes: 2410,
    comments: 58,
    saves: 610,
    views: 64000,
  },
  {
    id: 'sc10',
    title: '《我们的时光》副歌合唱',
    author: '郑州现场',
    desc: '副歌一进来，整个场馆的声音压过了返送。',
    tags: ['我们的时光', '合唱', '现场'],
    city: '郑州',
    duration: 34,
    likes: 11000,
    comments: 244,
    saves: 1610,
    views: 302000,
    song: '我们的时光',
  },
  {
    id: 'sc11',
    title: '现场最安静的一分钟',
    author: '第三排左边',
    desc: '没人喊安可，也没人说话，就听着台上那口气。',
    tags: ['现场', '安静', '氛围'],
    duration: 45,
    likes: 7260,
    comments: 133,
    saves: 1120,
    views: 158000,
  },
  {
    id: 'sc12',
    title: '深夜排练室：只开了一盏灯',
    author: '排练室看门人',
    desc: '凌晨两点，还在过第二段编曲。',
    tags: ['排练', '深夜', '花絮'],
    duration: 21,
    likes: 4980,
    comments: 87,
    saves: 690,
    views: 102000,
  },
]

export const shortMap: Record<string, Short> = Object.fromEntries(shorts.map((s) => [s.id, s]))
