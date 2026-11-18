/**
 * 数据出口。
 * 后端接入后，本文件改为异步 fetch + 内存缓存，
 * 页面层通过同一组名字取数，无需修改调用点。
 */
export * from './types'
export { albums, albumMap, albumTypeLabel } from './albums'
export {
  songs,
  songMap,
  getSong,
  songsOfAlbum,
  allTags,
  allCities,
  categories,
  filterByCategory,
  topSongs,
} from './songs'
export {
  videos,
  videoMap,
  videoCategories,
  videoCategoryLabel,
} from './videos'
export {
  chordLibrary,
  chordMap,
  sheets,
  sheetMap,
  progressions,
  difficultyScale,
} from './chords'
export { quotes, banners } from './quotes'
export {
  tourCities,
  tourByProvince,
  tourDoneCount,
  tourProgress,
  tourProvinces,
  tourYears,
  citiesInYear,
  timeline,
  TOUR_TARGET,
  TOUR_NAME,
  TOUR_SLOGAN,
} from './tour'
export { profile, facts, chapters, bandMembers, faqs, awards } from './bio'
export { sponsors, payChannels, sponsorWall, sponsorStats, useCases } from './sponsors'
export { achievements, easterEggs } from './achievements'
export type { Achievement, StatSnapshot } from './achievements'
export { navItems, libItems } from './nav'
export type { NavItem } from './nav'
