/** 乐理小工具：调名、转调、Capo 换算 */

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

/** 常用别名：把 #F / F# / bG 统一成带 # 的形式 */
const FLAT_MAP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

const QUALITIES = ['m', 'M', '7', 'm7', 'maj7', 'sus2', 'sus4', 'add9', 'dim', 'aug']

export function parseKey(key: string) {
  const raw = key.trim()
  const rootRaw = raw.match(/^[A-G](#|b)?/)?.[0]
  if (!rootRaw) return { semitone: 0, suffix: '', root: 'C' }
  const root = FLAT_MAP[rootRaw] ?? rootRaw
  const suffix = raw.slice(rootRaw.length)
  let note = root.replace('b', '#')
  if (FLAT_MAP[note]) note = FLAT_MAP[note]
  const semi = NOTE_NAMES.indexOf(note as (typeof NOTE_NAMES)[number])
  return { semitone: semi < 0 ? 0 : semi, suffix, root: note }
}

export function shiftKey(key: string, semitones: number) {
  const { semitone, suffix } = parseKey(key)
  const n = (((semitone + semitones) % 12) + 12) % 12
  return NOTE_NAMES[n] + suffix
}

export const keySemitone = (key: string) => parseKey(key).semitone

/**
 * Capo 换算：你想唱 T 调，那么用哪个「顺手的指型 + 几品夹子」最省力。
 * 规则：遍历 0-10 品，找出第一个落在吉他常用指型里的调，品位越小越优先。
 */
export function capoSuggest(targetKey: string, originalKey?: string) {
  const t = parseKey(targetKey)
  const isMinor = t.suffix.startsWith('m') && !t.suffix.startsWith('maj')
  const pool = isMinor
    ? ['Am', 'Em', 'Dm', 'Bm', 'Fm', 'Cm', 'Gm']
    : ['G', 'C', 'D', 'A', 'E', 'F', 'Bb', 'B']
  let best = { capo: 0, shape: NOTE_NAMES[t.semitone] + t.suffix }
  for (let capo = 0; capo <= 10; capo++) {
    const shape = NOTE_NAMES[(((t.semitone - capo) % 12) + 12) % 12] + (isMinor ? 'm' : '')
    if (pool.includes(shape)) {
      best = { capo, shape }
      break
    }
  }
  const upBy = originalKey
    ? (((t.semitone - parseKey(originalKey).semitone) % 12) + 12) % 12
    : 0
  return { ...best, upBy, originalKey }
}

/** 适合人声的常用调排序（吉他开放指型优先） */
export const GUITAR_FRIENDLY = ['G', 'C', 'D', 'A', 'E', 'Am', 'Em', 'Dm']

export function friendlyShape(key: string) {
  const { semitone, suffix } = parseKey(key)
  const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj')
  const pool = isMinor ? ['Am', 'Em', 'Dm', 'Bm', 'Cm', 'Fm', 'Gm'] : GUITAR_FRIENDLY
  let best = { capo: 0, shape: key }
  for (let capo = 0; capo <= 11; capo++) {
    const shape =
      NOTE_NAMES[(((semitone - capo) % 12) + 12) % 12] + (isMinor ? 'm' : '')
    if (pool.includes(shape)) {
      best = { capo, shape }
      break
    }
  }
  return best
}

/** 半音 → 频率（A4 = 440Hz），供调音器使用 */
export function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export const STANDARD_TUNING = [
  { string: 6, note: 'E2', midi: 40 },
  { string: 5, note: 'A2', midi: 45 },
  { string: 4, note: 'D3', midi: 50 },
  { string: 3, note: 'G3', midi: 55 },
  { string: 2, note: 'B3', midi: 59 },
  { string: 1, note: 'E4', midi: 64 },
]

export const midiToName = (midi: number) => {
  const n = NOTE_NAMES[((midi % 12) + 12) % 12]
  return `${n}${Math.floor(midi / 12) - 1}`
}
