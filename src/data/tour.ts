import type { TourCity, TimelineEvent } from './types'

/** 计划总场数：334 城 × 1 场 */
export const TOUR_TARGET = 334
export const TOUR_NAME = '叁叁肆'
export const TOUR_SLOGAN = '334 座城市 · 334 个现场 · 十年'

/**
 * 演示数据：城市清单。
 * 名字后带 @年份 表示「已完成」，其余为「计划中」。
 * 城市与年份均为占位，正式使用前请按巡演官方记录校订。
 */
const RAW: [string, string][] = [
  ['江苏', '南京@2018 苏州@2018 无锡@2019 常州@2019 徐州@2021 南通@2021 扬州 镇江 泰州 盐城 淮安 连云港 宿迁 昆山 江阴 宜兴'],
  ['浙江', '杭州@2018 宁波@2019 温州@2021 嘉兴 湖州 绍兴 金华 台州 丽水 衢州 舟山 义乌 余杭'],
  ['安徽', '合肥@2019 芜湖@2021 蚌埠 马鞍山 安庆 黄山 阜阳 滁州 宿州 六安'],
  ['上海', '上海市区@2018 嘉定 松江 青浦 奉贤'],
  ['北京', '北京@2018 通州 昌平 大兴'],
  ['天津', '天津@2019 蓟州 滨海'],
  ['广东', '广州@2018 深圳@2018 东莞@2019 佛山@2019 珠海 汕头 湛江 中山 江门 肇庆 惠州 梅州 汕尾 河源 阳江 清远'],
  ['福建', '福州@2019 厦门@2018 泉州 漳州 莆田 龙岩 三明 南平 宁德'],
  ['山东', '济南@2019 青岛@2018 烟台 潍坊 淄博 临沂 威海 泰安 德州 聊城 日照 菏泽 济宁 滨州'],
  ['河南', '郑州@2018 洛阳@2019 开封 新乡 安阳 焦作 濮阳 许昌 漯河 三门峡 南阳 商丘 信阳 周口 驻马店'],
  ['河北', '石家庄@2021 保定 唐山 秦皇岛 邯郸 邢台 张家口 承德 沧州 廊坊 衡水'],
  ['山西', '太原@2021 大同 临汾 运城 晋中 长治 忻州 吕梁'],
  ['陕西', '西安@2018 咸阳 宝鸡 渭南 延安 榆林 汉中 安康 铜川'],
  ['湖北', '武汉@2018 宜昌 襄阳 荆州 黄石 十堰 孝感 荆门 鄂州'],
  ['湖南', '长沙@2018 株洲 湘潭 衡阳 岳阳 常德 益阳 郴州 娄底 邵阳'],
  ['江西', '南昌@2019 九江 赣州 景德镇 萍乡 新余 宜春 上饶 吉安'],
  ['四川', '成都@2018 绵阳 德阳 乐山 宜宾 泸州 南充 达州 自贡 内江 广元 眉山 广安'],
  ['重庆', '重庆@2018 万州 涪陵 江津'],
  ['云南', '昆明@2019 大理@2021 丽江 曲靖 玉溪 保山 昭通 红河 楚雄'],
  ['贵州', '贵阳@2019 遵义 安顺 毕节 铜仁 凯里 都匀'],
  ['广西', '南宁@2019 桂林@2021 柳州 北海 玉林 百色 梧州 贵港'],
  ['辽宁', '沈阳@2019 大连@2019 鞍山 锦州 营口 丹东 抚顺 本溪 辽阳'],
  ['吉林', '长春@2021 吉林 四平 通化 白城 延吉'],
  ['黑龙江', '哈尔滨@2021 齐齐哈尔 大庆 牡丹江 佳木斯 绥化'],
  ['内蒙古', '呼和浩特 包头 鄂尔多斯 赤峰 通辽 乌兰察布 巴彦淖尔'],
  ['甘肃', '兰州@2018 天水 酒泉 张掖 武威 白银 庆阳 平凉 嘉峪关 定西@2019'],
  ['宁夏', '银川 石嘴山 吴忠 固原 中卫'],
  ['青海', '西宁 海东 格尔木 德令哈'],
  ['新疆', '乌鲁木齐 昌吉 克拉玛依 喀什 伊宁 库尔勒 哈密'],
  ['西藏', '拉萨 日喀则 林芝 昌都'],
  ['海南', '海口 三亚 儋州 文昌'],
  ['其他', '三沙 台北 高雄 香港 澳门'],
]

const VENUES = [
  '1701 Live House',
  '南方剧院',
  '文化馆小剧场',
  '山丘-livehouse',
  '工人文化宫',
  '老城影剧院',
  '大学城音乐厅',
  '红星现场',
]

export const tourCities: TourCity[] = []

RAW.forEach(([province, list]) => {
  list.trim().split(/\s+/).forEach((token, i) => {
    const m = /^(.+)@(\d{4})$/.exec(token)
    tourCities.push({
      city: m ? m[1] : token,
      province,
      year: m ? Number(m[2]) : 0,
      venue: VENUES[(province.length + i) % VENUES.length],
      done: !!m,
    })
  })
})

export const tourDoneCount = tourCities.filter((c) => c.done).length
export const tourProvinces = Array.from(new Set(tourCities.map((c) => c.province)))
export const tourProgress = tourDoneCount / TOUR_TARGET

export interface ProvinceGroup {
  province: string
  cities: TourCity[]
  done: number
}

export const tourByProvince: ProvinceGroup[] = tourProvinces
  .map((p) => {
    const cities = tourCities.filter((c) => c.province === p)
    return {
      province: p,
      cities,
      done: cities.filter((c) => c.done).length,
    }
  })
  .sort((a, b) => b.done - a.done || b.cities.length - a.cities.length)

export const tourYears = Array.from(
  new Set(tourCities.filter((c) => c.done).map((c) => c.year)),
).sort()

export const citiesInYear = (year: number) =>
  tourCities.filter((c) => c.done && c.year === year)

/** 大事记（演示占位，需校订） */
export const timeline: TimelineEvent[] = [
  { date: '2004', year: 2004, kind: 'album', title: '首张自制版本发行', text: '词曲、录音、封面、售卖全部一人完成，开始在网络上流通。' },
  { date: '2007', year: 2007, kind: 'album', title: '乐队化编曲确立', text: '从「一个人加一把吉他」转向完整乐队编制，长段落反复吟唱成为标志。' },
  { date: '2009', year: 2009, kind: 'album', title: '城市题材集中写作', text: '以地名为线索的作品成批出现，构成后来现场歌单的骨架。' },
  { date: '2011', year: 2011, kind: 'album', title: '录音室专辑《1701》', text: '制作完成度最高的一张，同期启动小型巡演。' },
  { date: '2014', year: 2014, kind: 'album', title: '专辑《热河》', text: '巡演前最后一张录音室专辑。' },
  { date: '2017.01', year: 2017, kind: 'tour', title: '宣布叁叁肆计划', text: '未来十年在 334 座城市各办一场演出，把现场带到没有 livehouse 的地方。' },
  { date: '2018.03', year: 2018, kind: 'tour', title: '叁叁肆正式启动', text: '首批城市开演，乐队大巴开始按月循环。' },
  { date: '2019', year: 2019, kind: 'tour', title: '累计破百场', text: '推出巡演途中录制的现场辑。' },
  { date: '2020', year: 2020, kind: 'other', title: '线下暂停期', text: '演出停摆，转向线上直播与排练室内容。' },
  { date: '2021', year: 2021, kind: 'tour', title: '恢复巡演 · 转向更小场地', text: '补齐西北、华北、东北多个此前未覆盖的省份。' },
  { date: '至今', year: 2026, kind: 'tour', title: `已完成 ${tourDoneCount} / ${TOUR_TARGET}`, text: '本页面数据为演示占位，实际进度以官方公布为准。' },
]
