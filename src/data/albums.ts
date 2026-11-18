import type { Album } from './types'

/**
 * 演示数据：专辑目录。
 * 名称与年份用于前端占位，正式使用前需按权威资料逐条校订。
 */
export const albums: Album[] = [
  {
    id: 'a01',
    name: '被解放的欲望',
    year: 2004,
    date: '2004',
    type: 'studio',
    description:
      '早期自制版本，编曲粗粝，词作已显露出对城市与个体的持续注视。共 6 首。',
    songIds: ['s01', 's02', 's03', 's04', 's05', 's06'],
  },
  {
    id: 'a02',
    name: '在劫难逃',
    year: 2005,
    date: '2005',
    type: 'studio',
    description: '城市叙事开始成形的阶段，木吉他与口琴的比重明显下降。共 6 首。',
    songIds: ['s07', 's08', 's09', 's10', 's11', 's12'],
  },
  {
    id: 'a03',
    name: '梵高先生',
    year: 2007,
    date: '2007',
    type: 'studio',
    description:
      '确立乐队化编曲的一张，长段落与反复吟唱成为标志。共 7 首。',
    songIds: ['s13', 's14', 's15', 's16', 's17', 's18', 's19'],
  },
  {
    id: 'a04',
    name: '你好，郑州',
    year: 2009,
    date: '2009',
    type: 'studio',
    description: '以城市为线索的集中写作期，多地现场曲目取自这一阶段。共 7 首。',
    songIds: ['s20', 's21', 's22', 's23', 's24', 's25', 's26'],
  },
  {
    id: 'a05',
    name: '1701',
    year: 2011,
    date: '2011',
    type: 'studio',
    description: '录音室制作最完整的一张，乐队合奏与动态层次显著增强。共 6 首。',
    songIds: ['s27', 's28', 's29', 's30', 's31', 's32'],
  },
  {
    id: 'a06',
    name: '山阴路的夏天',
    year: 2011,
    date: '2011',
    type: 'ep',
    description: '南京题材短辑，街道名成为地理坐标。共 3 首。',
    songIds: ['s33', 's34', 's35'],
  },
  {
    id: 'a07',
    name: '定西',
    year: 2012,
    date: '2012',
    type: 'ep',
    description: '回到西北故乡的写作，编曲回到极简配置。共 3 首。',
    songIds: ['s36', 's37', 's38'],
  },
  {
    id: 'a08',
    name: '热河',
    year: 2014,
    date: '2014',
    type: 'studio',
    description: '巡演前最后一张录音室专辑，旋律线更开放。共 5 首。',
    songIds: ['s39', 's40', 's41', 's42', 's43'],
  },
  {
    id: 'a09',
    name: '叁叁肆 · 现场辑',
    year: 2019,
    date: '2019',
    type: 'live',
    description: '叁叁肆巡演途中录制的现场版本合集。共 8 首。',
    songIds: ['s44', 's45', 's46', 's47', 's48', 's49', 's50', 's51'],
  },
  {
    id: 'a10',
    name: '散佚与单曲',
    year: 2016,
    date: '2006—2016',
    type: 'single',
    description: '未收录进正式专辑的单曲、影视歌曲与再版曲目。共 5 首。',
    songIds: ['s52', 's53', 's54', 's55', 's56'],
  },
]

export const albumMap: Record<string, Album> = Object.fromEntries(
  albums.map((a) => [a.id, a]),
)

export const albumTypeLabel: Record<Album['type'], string> = {
  studio: '录音室专辑',
  live: '现场专辑',
  ep: 'EP',
  single: '单曲集',
  compilation: '合辑',
}
