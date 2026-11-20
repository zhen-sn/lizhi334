/**
 * 内容数据加载：用后端 /api/bootstrap 覆盖 src/data 中的静态种子。
 * - 采用「原地替换」写入模块级数组/映射，页面层调用点无需改动
 * - 请求在渲染前完成（见 main.tsx），因此不会出现静态数据闪一下的情况
 * - 后端不可用时静默失败，保持静态数据可用（离线/开发期友好）
 */
import { tryApi } from './client'
import { albums, albumMap } from '../data/albums'
import { songs, songMap, recomputeSongFacets } from '../data/songs'
import { videos, videoMap } from '../data/videos'
import { shorts, shortMap } from '../data/shorts'
import {
  chordLibrary,
  chordMap,
  sheets,
  sheetMap,
  progressions,
  difficultyScale,
} from '../data/chords'
import { quotes, banners } from '../data/quotes'
import { profile, facts, chapters, bandMembers, faqs, awards } from '../data/bio'
import { sponsors, payChannels, sponsorWall, sponsorStats, useCases } from '../data/sponsors'
import { easterEggs, achievements } from '../data/achievements'
import { navItems, libItems } from '../data/nav'
import { tourCities, timeline, applyTourConfig } from '../data/tour'

/* eslint-disable @typescript-eslint/no-explicit-any */

type Bootstrap = Record<string, any>

/** 是否已连上后端（决定歌词/谱面是否需要懒加载） */
let fromApi = false
/** 已拉取完整详情的曲目 */
const detailLoaded = new Set<string>()
const detailPending = new Map<string, Promise<boolean>>()

function swapArray<T>(target: T[], next: unknown) {
  // 后端返回空数组时也要覆盖：列表为空就是为空，不能残留静态种子
  if (!Array.isArray(next)) return
  target.splice(0, target.length, ...(next as T[]))
}

function fillMap<T>(target: Record<string, T>, next: unknown, key: (item: T) => string) {
  if (!Array.isArray(next)) return
  for (const k of Object.keys(target)) delete target[k]
  for (const item of next as T[]) target[key(item)] = item
}

function assignObject(target: object, next: unknown) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) return
  for (const k of Object.keys(target)) delete (target as any)[k]
  Object.assign(target, next)
}

function apply(d: Bootstrap) {
  detailLoaded.clear()
  detailPending.clear()
  swapArray(albums, d.albums)
  fillMap(albumMap, d.albums, (a) => a.id)

  swapArray(songs, d.songs)
  fillMap(songMap, d.songs, (s) => s.id)
  recomputeSongFacets()

  swapArray(videos, d.videos)
  fillMap(videoMap, d.videos, (v) => v.id)

  swapArray(shorts, d.shorts)
  fillMap(shortMap, d.shorts, (s) => s.id)

  swapArray(chordLibrary, d.chordLibrary)
  fillMap(chordMap, d.chordLibrary, (c) => c.name)
  swapArray(sheets, d.sheets)
  fillMap(sheetMap, d.sheets, (s) => s.songId)
  swapArray(progressions, d.progressions)
  swapArray(difficultyScale, d.difficultyScale)

  swapArray(quotes, d.quotes)
  swapArray(banners, d.banners)

  assignObject(profile, d.profile)
  swapArray(facts, d.facts)
  swapArray(chapters, d.chapters)
  swapArray(bandMembers, d.bandMembers)
  swapArray(faqs, d.faqs)
  swapArray(awards, d.awards)

  swapArray(sponsors, d.sponsors)
  swapArray(payChannels, d.payChannels)
  swapArray(sponsorWall, d.sponsorWall)
  swapArray(sponsorStats, d.sponsorStats)
  swapArray(useCases, d.useCases)

  assignObject(easterEggs, d.easterEggs)

  swapArray(navItems, d.navItems)
  swapArray(libItems, d.libItems)

  swapArray(tourCities, d.tourCities)
  applyTourConfig(d.tourConfig)
  swapArray(timeline, d.timeline)

  // 成就：后端下发文案与图标，判定函数仍在前端（基于本地统计）
  if (Array.isArray(d.achievements)) {
    for (const item of d.achievements) {
      const a = achievements.find((x) => x.id === item.id)
      if (!a) continue
      if (item.name) a.name = item.name
      if (item.hint) a.hint = item.hint
      if (item.icon) a.icon = item.icon
    }
  }
}

let loaded = false

/** 拉取后端内容；成功返回 true，后端不可用返回 false */
export async function loadContent(timeout = 6000): Promise<boolean> {
  if (loaded) return true
  const d = await tryApi<Bootstrap>('/bootstrap', { timeout })
  if (!d) return false
  apply(d)
  fromApi = true
  loaded = true
  return true
}

/** 重新拉取（后台改完内容后或手动刷新时用） */
export async function reloadContent(): Promise<boolean> {
  loaded = false
  return loadContent()
}

/** 未连后端（静态种子数据本身是完整的）或已拉过详情时视为就绪 */
export function isSongDetailReady(id: string): boolean {
  return !fromApi || detailLoaded.has(id)
}

/**
 * 按需拉取单曲详情：歌词 + 完整和弦谱。
 * bootstrap 只下发轻量数据，进入详情页/播放页时再补全。
 */
export function ensureSongDetail(id: string): Promise<boolean> {
  if (!id || isSongDetailReady(id)) return Promise.resolve(true)
  const pending = detailPending.get(id)
  if (pending) return pending

  const task = (async () => {
    const d = await tryApi<Record<string, any>>(`/songs/${encodeURIComponent(id)}`, { timeout: 8000 })
    if (!d) return false
    const song = songMap[id]
    if (song && typeof d.lyrics === 'string') song.lyrics = d.lyrics

    const sheet = d.sheet
    if (sheet && typeof sheet === 'object') {
      const stub = sheetMap[id]
      if (stub) Object.assign(stub, sheet)
      else {
        sheetMap[id] = sheet
        sheets.push(sheet)
      }
    }
    detailLoaded.add(id)
    return true
  })().finally(() => detailPending.delete(id))

  detailPending.set(id, task)
  return task
}