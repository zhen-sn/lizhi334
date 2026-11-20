/**
 * 把 src/data 下的静态 TS 数据导出为 server/seed/data.json，
 * 供后端 install.php 灌入数据库。设计为可重复运行（幂等）。
 * 用 esbuild（vite 自带）把 TS 打包成 ESM 再 import，避免 Node 直接跑 TS 的兼容问题。
 */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tmpBundle = join(root, '.tmp-seed-bundle.mjs')

function stripFns(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(stripFns)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'function') continue
    out[k] = stripFns(v)
  }
  return out
}

// 成就的判定规则无法把函数序列化，这里按 id 映射为可配置的 metric/threshold
const ACHIEVEMENT_RULES = {
  first:   { metric: 'playCount',       threshold: 1 },
  ten:     { metric: 'playCount',       threshold: 10 },
  fifty:   { metric: 'playedIds',       threshold: 30 },
  full:    { metric: 'playedIds',       threshold: 56 },
  finisher:{ metric: 'completedSongs',  threshold: 5 },
  hours:   { metric: 'totalSeconds',    threshold: 36000 },
  fav:     { metric: 'favoriteCount',   threshold: 10 },
  albums:  { metric: 'albumCoverage',   threshold: 1 },
  keys:    { metric: 'unlockedKeys',    threshold: 8 },
  night:   { metric: 'nightPlays',      threshold: 20 },
  streak:  { metric: 'consecutiveDays', threshold: 7 },
  rain:    { metric: 'easterEgg',       threshold: 1 },
}

// 生成一个临时入口，聚合 index 与 shorts，避免 esbuild 多入口限制
const entryFile = join(root, '.tmp-seed-entry.ts')
writeFileSync(
  entryFile,
  "export * from './src/data/index'\nexport * as shortsMod from './src/data/shorts'\n",
  'utf8'
)

await build({
  entryPoints: [entryFile],
  bundle: true,
  format: 'esm',
  write: true,
  outfile: tmpBundle,
  platform: 'node',
  logLevel: 'warning',
})

const mod = await import('file:///' + tmpBundle.replace(/\\/g, '/'))
const idx = mod
const sh = mod.shortsMod

const data = {
  albums: stripFns(idx.albums),
  songs: stripFns(idx.songs),
  videos: stripFns(idx.videos),
  quotes: stripFns(idx.quotes),
  banners: stripFns(idx.banners),
  chordLibrary: stripFns(idx.chordLibrary),
  sheets: stripFns(idx.sheets),
  progressions: stripFns(idx.progressions),
  difficultyScale: stripFns(idx.difficultyScale),
  profile: stripFns(idx.profile),
  facts: stripFns(idx.facts),
  chapters: stripFns(idx.chapters),
  bandMembers: stripFns(idx.bandMembers),
  faqs: stripFns(idx.faqs),
  awards: stripFns(idx.awards),
  tourCities: stripFns(idx.tourCities),
  timeline: stripFns(idx.timeline),
  tourConfig: {
    target: stripFns(idx.TOUR_TARGET),
    name: stripFns(idx.TOUR_NAME),
    slogan: stripFns(idx.TOUR_SLOGAN),
  },
  sponsors: stripFns(idx.sponsors),
  payChannels: stripFns(idx.payChannels),
  sponsorWall: stripFns(idx.sponsorWall),
  sponsorStats: stripFns(idx.sponsorStats),
  useCases: stripFns(idx.useCases),
  achievements: stripFns(idx.achievements).map((a) => ({
    ...a,
    rule: ACHIEVEMENT_RULES[a.id] || { metric: 'playCount', threshold: 1 },
  })),
  easterEggs: stripFns(idx.easterEggs),
  navItems: stripFns(idx.navItems),
  libItems: stripFns(idx.libItems),
  shorts: stripFns(sh.shorts),
}

mkdirSync(join(root, 'server/seed'), { recursive: true })
writeFileSync(join(root, 'server/seed/data.json'), JSON.stringify(data, null, 2), 'utf8')

const summary = Object.fromEntries(
  Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])
)
console.log('seed exported -> server/seed/data.json')
console.log(JSON.stringify(summary, null, 2))
