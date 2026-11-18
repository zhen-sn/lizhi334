import type { SponsorTier } from './types'

export const sponsors: SponsorTier[] = [
  {
    id: 't1',
    name: '青铜 · 旁听',
    icon: '🎧',
    amount: 10,
    accent: '#8c8c8c',
    benefits: ['赞助墙永久署名', '电子感谢卡一封'],
  },
  {
    id: 't2',
    name: '白银 · 同行',
    icon: '🎫',
    amount: 30,
    accent: '#adadad',
    benefits: ['包含「旁听」全部', '署名在赞助墙加粗显示', '可附一句留言永久展示'],
  },
  {
    id: 't3',
    name: '黄金 · 常驻',
    icon: '🎼',
    amount: 68,
    featured: true,
    accent: '#d9d9d9',
    benefits: ['包含「同行」全部', '支持者名单列入「关于」页', '年度收支明细提前预览'],
  },
  {
    id: 't4',
    name: '钻石 · 共建',
    icon: '🏛',
    amount: 168,
    accent: '#f2f2f2',
    benefits: ['包含「常驻」全部', '赞助墙置顶展示', '网站共建鸣谢（可留站点链接）'],
  },
]

export const payChannels = [
  { key: 'wechat', label: '微信支付', hint: '扫码后输入赞助金额' },
  { key: 'alipay', label: '支付宝', hint: '扫码后输入赞助金额' },
  { key: 'bank', label: '银行转账', hint: '大额 / 对公，需备注昵称' },
]

export const sponsorWall = [
  { nick: '南风', tier: '白银 · 同行', amount: 30, date: '2023-04', words: '把现场带到县城去。' },
  { nick: '阿白', tier: '黄金 · 常驻', amount: 68, date: '2022-09', words: '第 7 年，继续。' },
  { nick: '梧桐', tier: '钻石 · 共建', amount: 168, date: '2021-12', words: '排练室比舞台诚实。' },
  { nick: '一七零', tier: '白银 · 同行', amount: 30, date: '2024-06', words: '刚从 Livehouse 回来。' },
  { nick: '定西路人', tier: '青铜 · 旁听', amount: 10, date: '2025-01', words: '西北的风很大。' },
  { nick: '热河', tier: '黄金 · 常驻', amount: 68, date: '2022-03', words: '一条河能装下很多事。' },
  { nick: '山阴', tier: '白银 · 同行', amount: 30, date: '2023-10', words: '夏天还没结束。' },
  { nick: 'V', tier: '钻石 · 共建', amount: 168, date: '2020-11', words: '334 个城市，一起数。' },
  { nick: '天空之城', tier: '青铜 · 旁听', amount: 10, date: '2025-05', words: '第一次赞助，为了现场。' },
  { nick: '老周', tier: '黄金 · 常驻', amount: 68, date: '2021-07', words: '继续买票，继续听。' },
]

export const sponsorStats = [
  { label: '累计赞助人次', value: '2,486' },
  { label: '服务器 + 域名续费', value: '¥3,860 / 年' },
  { label: '网站维护', value: '¥1,200 / 年' },
]

export const useCases = [
  {
    title: '服务器续费',
    text: '站点与音频托管的云服务器按月付费，赞助优先用于这部分固定支出。',
  },
  {
    title: '域名续费',
    text: '主域名与备用域名每年续费一次，避免站点链接失效。',
  },
  {
    title: '网站维护',
    text: '代码更新、素材整理与故障排查，由维护者利用业余时间完成。',
  },
]
