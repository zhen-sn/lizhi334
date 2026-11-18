/**
 * 和弦库与谱表（演示数据）。
 * 说明：为避免歌词版权问题，谱面段落只给出「和弦走向 + 段落标记」，
 * 不复制任何歌词文本；正式接入时由用户在后台绑定已授权歌词。
 */

export interface ChordShape {
  name: string
  display: string
  /** 6 根弦从 6 弦（最低音）到 1 弦，-1 =  mute，0 = 空弦，n = 第 n 品 */
  frets: number[]
  /** 对应手指，-1 表示不弹 */
  fingers: number[]
  /** 大横按起始品位 */
  barre?: number
  rootString: number
  quality: 'major' | 'minor' | 'seventh' | 'add9' | 'sus' | 'minor7'
}

export const chordLibrary: ChordShape[] = [
  { name: 'C', display: 'C', frets: [-1, 3, 2, 0, 1, 0], fingers: [-1, 3, 2, -1, 1, -1], rootString: 5, quality: 'major' },
  { name: 'D', display: 'D', frets: [-1, -1, 0, 2, 3, 2], fingers: [-1, -1, -1, 1, 3, 2], rootString: 4, quality: 'major' },
  { name: 'Dm', display: 'Dm', frets: [-1, -1, 0, 2, 3, 1], fingers: [-1, -1, -1, 2, 3, 1], rootString: 4, quality: 'minor' },
  { name: 'E', display: 'E', frets: [0, 2, 2, 1, 0, 0], fingers: [-1, 2, 3, 1, -1, -1], rootString: 6, quality: 'major' },
  { name: 'Em', display: 'Em', frets: [0, 2, 2, 0, 0, 0], fingers: [-1, 2, 3, -1, -1, -1], rootString: 6, quality: 'minor' },
  { name: 'Em7', display: 'Em7', frets: [0, 2, 0, 0, 0, 0], fingers: [-1, 2, -1, -1, -1, -1], rootString: 6, quality: 'minor7' },
  { name: 'F', display: 'F', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: 1, rootString: 6, quality: 'major' },
  { name: 'G', display: 'G', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, -1, -1, -1, 3], rootString: 6, quality: 'major' },
  { name: 'G7', display: 'G7', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, -1, -1, -1, 1], rootString: 6, quality: 'seventh' },
  { name: 'A', display: 'A', frets: [-1, 0, 2, 2, 2, 0], fingers: [-1, -1, 1, 2, 3, -1], rootString: 5, quality: 'major' },
  { name: 'A7', display: 'A7', frets: [-1, 0, 2, 0, 2, 0], fingers: [-1, -1, 2, -1, 3, -1], rootString: 5, quality: 'seventh' },
  { name: 'Am', display: 'Am', frets: [-1, 0, 2, 2, 1, 0], fingers: [-1, -1, 2, 3, 1, -1], rootString: 5, quality: 'minor' },
  { name: 'Bb', display: 'B♭', frets: [-1, 1, 3, 3, 3, 1], fingers: [-1, 1, 2, 3, 4, 1], barre: 1, rootString: 5, quality: 'major' },
  { name: 'Bm', display: 'Bm', frets: [-1, 2, 4, 4, 3, 2], fingers: [-1, 1, 2, 4, 3, 1], barre: 2, rootString: 5, quality: 'minor' },
  { name: 'B7', display: 'B7', frets: [-1, 2, 1, 2, 0, 2], fingers: [-1, 2, 1, 3, -1, 4], rootString: 5, quality: 'seventh' },
  { name: 'Cadd9', display: 'Cadd9', frets: [-1, 3, 2, 0, 3, 3], fingers: [-1, 2, 1, -1, 3, 4], rootString: 5, quality: 'add9' },
  { name: 'Csus2', display: 'Csus2', frets: [-1, 3, 0, 0, 3, -1], fingers: [-1, 2, -1, -1, 3, -1], rootString: 5, quality: 'sus' },
  { name: 'Dsus2', display: 'Dsus2', frets: [-1, -1, 0, 2, 3, 0], fingers: [-1, -1, -1, 2, 3, 1], rootString: 4, quality: 'sus' },
  { name: 'F#m', display: 'F♯m', frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: 2, rootString: 6, quality: 'minor' },
  { name: 'D7', display: 'D7', frets: [-1, -1, 0, 2, 1, 2], fingers: [-1, -1, -1, 2, 1, 3], rootString: 4, quality: 'seventh' },
]

export const chordMap: Record<string, ChordShape> = Object.fromEntries(
  chordLibrary.map((c) => [c.name, c]),
)

/** 调内常用四级走向，用于「变调夹计算器」与难度提示 */
export const progressions: {
  name: string
  roman: string
  degrees: (1 | 2 | 3 | 4 | 5 | 6 | 7)[]
  example: string
  hint: string
}[] = [
  { name: '卡农走向', roman: 'I–V–vi–IV', degrees: [1, 5, 6, 4], example: 'G–D–Em–C', hint: '最常用，适合大多数抒情曲目' },
  { name: '四三六二', roman: 'I–vi–IV–V', degrees: [1, 6, 4, 5], example: 'C–Am–F–G', hint: '民谣主歌常用' },
  { name: '小调下行', roman: 'i–VII–VI–V', degrees: [6, 5, 4, 3], example: 'Em–D–C–B7', hint: '副歌情绪推进' },
  { name: '五三六四', roman: 'IV–I–vi–V', degrees: [4, 1, 6, 5], example: 'C–G–Em–D', hint: '反复段落、长尾音' },
  { name: '二五一', roman: 'ii–V–I', degrees: [2, 5, 1], example: 'Am–D7–G', hint: '带爵士色彩，转调衔接' },
]

export interface SheetSong {
  songId: string
  tuning: string
  tempoMark: string
  levelText: string
  intro: string[]
  sections: { name: string; chords: string[]; lines: number }[]
  tips: string[]
  usedChords: string[]
}

/**
 * 谱表：给出段落和弦走向，段落内的歌词由用户自行绑定。
 * songId 对应 src/data/songs.ts
 */
export const sheets: SheetSong[] = [
  {
    songId: 's09',
    tuning: '标准调弦（原调 Am）',
    tempoMark: '♩= 76 · 舒缓',
    levelText: '入门友好 · 四个和弦走完全曲',
    intro: ['Am', 'F', 'C', 'G'],
    sections: [
      { name: '主歌 A', chords: ['Am', 'F', 'C', 'G'], lines: 4 },
      { name: '主歌 B', chords: ['Am', 'F', 'C', 'G'], lines: 4 },
      { name: '预副歌', chords: ['F', 'G', 'Am', 'Am'], lines: 2 },
      { name: '副歌', chords: ['F', 'G', 'C', 'Am', 'F', 'G', 'Am'], lines: 4 },
      { name: '间奏', chords: ['Am', 'F', 'C', 'G'], lines: 2 },
      { name: '尾奏', chords: ['Am', 'F', 'Am'], lines: 2 },
    ],
    tips: [
      '全曲分解为主：53231323，副歌第二段可切换成下下上上下上',
      'Am → F 的转换用无名指作支撑点，减少手掌抬起',
      '原曲人声偏低，女生可 Cap 3 品改按 Gm 指型',
    ],
    usedChords: ['Am', 'F', 'C', 'G', 'Em'],
  },
  {
    songId: 's33',
    tuning: '标准调弦（原调 G）',
    tempoMark: '♩= 78 · 中速摇摆',
    levelText: '一级 · F 和弦可用小 F 替代',
    intro: ['G', 'Em', 'C', 'D'],
    sections: [
      { name: '主歌 A', chords: ['G', 'Em', 'C', 'D'], lines: 4 },
      { name: '主歌 B', chords: ['G', 'Em', 'C', 'D'], lines: 4 },
      { name: '副歌', chords: ['C', 'D', 'G', 'Em', 'C', 'D', 'G'], lines: 4 },
      { name: '桥段', chords: ['Em', 'C', 'G', 'D'], lines: 4 },
      { name: '尾奏', chords: ['C', 'D', 'G'], lines: 2 },
    ],
    tips: [
      '扫弦重音放在 2、4 拍，手腕放松，不要靠手臂',
      '桥段建议改用手掌闷音（palm mute）贴近琴桥',
      '现场版在副歌后有一段 8 小节间奏，Solo 走 G 大调五声音阶',
    ],
    usedChords: ['G', 'Em', 'C', 'D', 'Am', 'Bm'],
  },
  {
    songId: 's34',
    tuning: '标准调弦（原调 Em）',
    tempoMark: '♩= 72 · 自由',
    levelText: '三级 · 长段落 + 大横按',
    intro: ['Em', 'C', 'G', 'D'],
    sections: [
      { name: '前奏（指弹）', chords: ['Em', 'Cadd9', 'G', 'D'], lines: 4 },
      { name: '主歌 A', chords: ['Em', 'C', 'G', 'D'], lines: 8 },
      { name: '主歌 B', chords: ['Em', 'C', 'G', 'D'], lines: 8 },
      { name: '副歌', chords: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B7'], lines: 4 },
      { name: '间奏（乐队）', chords: ['Em', 'D', 'C', 'B7'], lines: 4 },
      { name: '尾声反复', chords: ['Em', 'C', 'G', 'D'], lines: 6 },
    ],
    tips: [
      '前奏是这首歌的记忆点，建议单独慢速练习到肌肉记忆',
      '主歌 8 句不断反复同一走向，靠力度层次而非和弦变化推进',
      'B7 出现的位置是全曲情绪最高点，可放慢半拍进入',
    ],
    usedChords: ['Em', 'C', 'G', 'D', 'Cadd9', 'B7'],
  },
  {
    songId: 's21',
    tuning: '标准调弦（原调 G）',
    tempoMark: '♩= 76 · 行板',
    levelText: '二级 · Capo 建议 0 品（原调）',
    intro: ['G', 'D/F#', 'Em', 'C'],
    sections: [
      { name: '主歌 A', chords: ['G', 'D/F#', 'Em', 'C'], lines: 4 },
      { name: '主歌 B', chords: ['G', 'D/F#', 'Em', 'C'], lines: 4 },
      { name: '副歌', chords: ['C', 'G', 'Am', 'Em', 'C', 'D', 'G'], lines: 4 },
      { name: '间奏', chords: ['Em', 'C', 'G', 'D'], lines: 4 },
      { name: '尾奏', chords: ['C', 'D', 'G', 'G'], lines: 2 },
    ],
    tips: [
      'D/F# 用拇指勾 6 弦 2 品，低音下行是这首歌的关键',
      '副歌进入前留一个整小节的空拍，不要抢',
      '指弹版把 3、4 弦旋律线提出来，节奏会更像原版',
    ],
    usedChords: ['G', 'D', 'Em', 'C', 'Am', 'D/F#'],
  },
  {
    songId: 's39',
    tuning: '标准调弦（原调 G · Capo 2）',
    tempoMark: '♩= 76 · 稍快摇摆',
    levelText: '二级 · 实际音高比指型高全音',
    intro: ['G', 'Em', 'C', 'D'],
    sections: [
      { name: '主歌 A', chords: ['G', 'Em', 'C', 'D'], lines: 4 },
      { name: '主歌 B', chords: ['G', 'Em', 'C', 'D'], lines: 4 },
      { name: '副歌', chords: ['C', 'D', 'G', 'Em', 'C', 'D', 'G'], lines: 4 },
      { name: '反复段', chords: ['G', 'Em', 'C', 'D'], lines: 8 },
      { name: '尾奏', chords: ['C', 'D', 'G'], lines: 2 },
    ],
    tips: [
      'Capo 2 + G 指型 = 实际 A 调，人声偏高时取下 Capo 0',
      '反复段是全场合唱部分，力度做渐强即可，不要加花',
      '扫弦型：下 下上 上 下上，第二拍的空隙要保持',
    ],
    usedChords: ['G', 'Em', 'C', 'D', 'Am'],
  },
  {
    songId: 's36',
    tuning: '标准调弦（原调 Am）',
    tempoMark: '♩= 70 · 缓慢',
    levelText: '三级 · 长音 + 反复，需控制气息',
    intro: ['Am', 'G', 'F', 'E'],
    sections: [
      { name: '主歌 A', chords: ['Am', 'G', 'F', 'E'], lines: 6 },
      { name: '主歌 B', chords: ['Am', 'G', 'F', 'E'], lines: 6 },
      { name: '副歌', chords: ['F', 'G', 'Am', 'Am', 'F', 'G', 'E'], lines: 4 },
      { name: '间奏（口琴）', chords: ['Am', 'F', 'G', 'Am'], lines: 4 },
      { name: '尾声', chords: ['Am', 'G', 'F', 'Am'], lines: 4 },
    ],
    tips: [
      'E 大和弦在这里是属和弦，不要弹太重，它是一个过渡',
      '全曲靠音量的起伏推进，右手最多到 mf',
      '口琴间奏部分可加一段 4 小节的鼓点，现场版常见处理',
    ],
    usedChords: ['Am', 'G', 'F', 'E', 'Em'],
  },
  {
    songId: 's13',
    tuning: '标准调弦（原调 Em）',
    tempoMark: '♩= 74 · 中速',
    levelText: '四级 · 段落多、反复长',
    intro: ['Em', 'C', 'G', 'D'],
    sections: [
      { name: '主歌 A', chords: ['Em', 'C', 'G', 'D'], lines: 8 },
      { name: '副歌', chords: ['C', 'G', 'Am', 'Em', 'C', 'G', 'D'], lines: 4 },
      { name: '主歌 B', chords: ['Em', 'C', 'G', 'D'], lines: 8 },
      { name: '器乐段', chords: ['Am', 'Em', 'C', 'D'], lines: 8 },
      { name: '末段反复', chords: ['C', 'G', 'Am', 'Em'], lines: 8 },
    ],
    tips: [
      '器乐段是整首歌的动态峰值，吉他可切换到电吉他 + Overdrive',
      '末段反复建议做 4 次 mp → mf 的渐强，第 4 次直接收',
      '人声在此曲偏低，女声建议 Capo 3',
    ],
    usedChords: ['Em', 'C', 'G', 'D', 'Am', 'Bm'],
  },
  {
    songId: 's19',
    tuning: '标准调弦（原调 Am）',
    tempoMark: '♩= 68 · 自由',
    levelText: '四级 · 节奏不规则，需先跟原曲数拍',
    intro: ['Am', 'F', 'Dm', 'E'],
    sections: [
      { name: '主歌 A', chords: ['Am', 'F', 'Dm', 'E'], lines: 6 },
      { name: '副歌', chords: ['Dm', 'Am', 'E', 'Am'], lines: 4 },
      { name: '主歌 B', chords: ['Am', 'F', 'Dm', 'E'], lines: 6 },
      { name: '尾声', chords: ['Am', 'F', 'E', 'Am'], lines: 6 },
    ],
    tips: [
      '小调色彩为主，E 和弦出现的每一次都要给它足够的重量',
      '尾声 6 句不断反复同一走向，直到渐弱结束',
      '琴颈拾音器位置比琴桥拾音器更接近原版音色',
    ],
    usedChords: ['Am', 'F', 'Dm', 'E', 'Em'],
  },
]

export const sheetMap: Record<string, SheetSong> = Object.fromEntries(
  sheets.map((s) => [s.songId, s]),
)

/** 全部歌曲难度分布（1-5），用于工具页统计条 */
export const difficultyScale = [
  { level: 1, label: '入门', desc: '不超过 3 个和弦' },
  { level: 2, label: '简单', desc: '开放和弦 + 基础扫弦' },
  { level: 3, label: '中等', desc: '含大横按或分解变化' },
  { level: 4, label: '较难', desc: '段落多、动态控制要求高' },
  { level: 5, label: '困难', desc: '指弹改编或特殊调弦' },
]
