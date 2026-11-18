import type { Quote } from './types'

/**
 * 主页「每日一句」与分享卡文案池。
 * 这里刻意不使用任何真实歌词，全部为占位文案；
 * 上线前请替换为已获授权的歌词摘录或原创评述。
 */
export const quotes: Quote[] = [
  { text: '把一首歌唱到第两百遍，它就不再属于我了。', source: '演示文案 · 访谈节选' },
  { text: '城市是一条一条的路，路上是一个一个的人。', source: '演示文案 · 巡演手记' },
  { text: '乐队现场的意义，是让一群人同时承认同一件事。', source: '演示文案 · 现场口白' },
  { text: '我不写口号，我写我路过的地方。', source: '演示文案 · 访谈节选' },
  { text: '三千三百四十，是一个不太可能、但值得每天醒来的数字。', source: '演示文案 · 叁叁肆计划' },
  { text: '观众唱得比我还熟，那我就不用唱了。', source: '演示文案 · 现场口白' },
  { text: '排练室的灯光比舞台诚实。', source: '演示文案 · 幕后记录' },
  { text: '一首歌写完，就和作者没关系了。', source: '演示文案 · 访谈节选' },
  { text: '离开一座城市的时候，才听得见它的声音。', source: '演示文案 · 巡演手记' },
  { text: '老歌单里全是自己二十几岁的样子。', source: '演示文案 · 访谈节选' },
  { text: '先把地方唱明白，再谈别的。', source: '演示文案 · 叁叁肆计划' },
  { text: '现场会有杂音，但杂音也是那晚的一部分。', source: '演示文案 · 现场口白' },
]

/** 主页轮播位 */
export const banners: {
  kicker: string
  title: string
  desc: string
  songId?: string
  to?: string
  hue: number
}[] = [
  {
    kicker: 'FEATURED',
    title: '叁叁肆',
    desc: '334 座城市，334 个现场。把音乐带到没有演出的地方去。',
    to: '/more/tour',
    hue: 208,
  },
  {
    kicker: 'ALBUM · 2014',
    title: '热河',
    desc: '巡演前最后一张录音室专辑，旋律线最开放的一次。',
    to: '/songs/album/a08',
    hue: 32,
  },
  {
    kicker: 'LIVE',
    title: '天空之城 · 万人合唱',
    desc: '第 100 场现场纪录，副歌部分完全交给台下。',
    to: '/videos/v08',
    songId: 's44',
    hue: 268,
  },
  {
    kicker: 'TOOLS',
    title: '吉他弹唱工具集',
    desc: '全曲目和弦、Capo 建议、节拍器与调音器，一次配齐。',
    to: '/tools',
    hue: 158,
  },
]
