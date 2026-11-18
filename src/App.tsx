import { useEffect, useRef, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SideNav, TopBar, TabBar } from './components/layout/Shell'
import { PlayerBar } from './components/player/PlayerBar'
import { QueueDrawer } from './components/player/QueueDrawer'
import { FullPlayer } from './components/player/FullPlayer'
import { Toasts } from './components/common/Overlays'
import { PlaylistPicker } from './components/common/PlaylistPicker'
import { AuthModal } from './components/auth/AuthModal'
import {
  Confetti,
  DesktopLyric,
  FloatingOrb,
  Grain,
  Rain,
} from './components/fx/Essentials'
import { usePlayer } from './store/player'
import { useLibrary } from './store/library'
import { useSettings, resolvedTheme } from './store/settings'
import { syncEasterEggs, useUi } from './store/ui'
import { recordNightPlay } from './store/library'
import { useHotkeys } from './hooks/useHotkeys'
import { useDesktopBridge, useDesktopLyricTick } from './hooks/useDesktopBridge'
import { Modal } from './components/common/Overlays'
import { HOTKEYS } from './hooks/useHotkeys'

import Home from './pages/Home'
import Songs from './pages/Songs'
import AlbumDetail from './pages/AlbumDetail'
import SongDetail from './pages/SongDetail'
import Videos from './pages/Videos'
import VideoDetail from './pages/VideoDetail'
import Shorts from './pages/Shorts'
import Upload from './pages/Upload'
import Account from './pages/Account'
import Tools from './pages/Tools'
import Chords from './pages/Chords'
import ChordDetail from './pages/ChordDetail'
import Metronome from './pages/Metronome'
import Tuner from './pages/Tuner'
import Capo from './pages/Capo'
import More from './pages/More'
import Biography from './pages/Biography'
import Tour334 from './pages/Tour334'
import Stats from './pages/Stats'
import Sponsor from './pages/Sponsor'
import SponsorWall from './pages/SponsorWall'
import PlayerPage from './pages/PlayerPage'
import Search from './pages/Search'
import PlaylistPage from './pages/Playlist'
import History from './pages/History'
import Settings from './pages/Settings'
import Random from './pages/Random'
import NotFound from './pages/NotFound'
import Mini from './pages/Mini'
import Lyric from './pages/Lyric'

/** 主题令牌落到 <html> 上，CSS 只负责取值 */
function useThemeAttrs() {
  const theme = useSettings((s) => s.theme)
  const accent = useSettings((s) => s.accent)
  const lyricSize = useSettings((s) => s.lyricSize)
  const birthday = useSettings((s) => s.birthdayMode)

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      root.dataset.theme = resolvedTheme(useSettings.getState())
      root.dataset.accent = accent
      root.dataset.lyricSize = lyricSize
    }
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme, accent, lyricSize])

  useEffect(() => {
    document.documentElement.dataset.birthday = birthday ? '1' : ''
  }, [birthday])
}

/** 换曲时判定彩蛋；深夜收听单独计数 */
function useEasterEggs() {
  const currentId = usePlayer((s) => s.currentId)
  const playing = usePlayer((s) => s.playing)
  const prevPlay = useRef(false)

  useEffect(() => {
    syncEasterEggs(currentId)
  }, [currentId])

  useEffect(() => {
    if (playing && !prevPlay.current) {
      const h = new Date().getHours()
      if (h < 5 || h >= 23) recordNightPlay()
    }
    prevPlay.current = playing
  }, [playing])
}

/** 路由切换后把内容区滚回顶部 */
function useScrollTop() {
  const loc = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [loc.pathname])
  return ref
}

function Shell() {
  const ref = useScrollTop()
  const [help, setHelp] = useState(false)
  const barCollapsed = useSettings((s) => s.barCollapsed)
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktop)
  useDesktopBridge()
  useDesktopLyricTick()
  useEasterEggs()
  useHotkeys({ onHelp: () => setHelp(true) })

  // 首次进入就核对一次成就，避免老用户看不到已达成的徽章
  useEffect(() => {
    useLibrary.getState().checkAchievements()
  }, [])

  return (
    <div className={`app ${barCollapsed ? 'app--bar-min' : ''}`}>
      <SideNav />
      <div className="main">
        <TopBar />
        <div className="content" ref={ref}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/songs/album/:id" element={<AlbumDetail />} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/videos/:id" element={<VideoDetail />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/me" element={<Account />} />
            <Route path="/me/profile" element={<Account />} />
            <Route path="/me/sponsors" element={<Account />} />
            <Route path="/me/uploads" element={<Account />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/chords" element={<Chords />} />
            <Route path="/tools/chords/:songId" element={<ChordDetail />} />
            <Route path="/tools/metronome" element={<Metronome />} />
            <Route path="/tools/tuner" element={<Tuner />} />
            <Route path="/tools/capo" element={<Capo />} />
            <Route path="/more" element={<More />} />
            <Route path="/more/biography" element={<Biography />} />
            <Route path="/more/tour" element={<Tour334 />} />
            <Route path="/more/stats" element={<Stats />} />
            <Route path="/sponsor" element={<Sponsor />} />
            <Route path="/sponsor/wall" element={<SponsorWall />} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/random" element={<Random />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      <PlayerBar />
      <TabBar />

      <QueueDrawer />
      <FullPlayer />
      <PlaylistPicker />
      <AuthModal />
      <Toasts />
      <Grain />
      <Rain />
      <Confetti />
      {!isDesktop && <DesktopLyric />}
      <FloatingOrb />

      {help && (
        <Modal title="快捷键" onClose={() => setHelp(false)}>
          <div className="list" style={{ border: 0, background: 'none' }}>
            {HOTKEYS.map(([k, d]) => (
              <div className="fact" key={k}>
                <span className="mono">{k}</span>
                <b>{d}</b>
              </div>
            ))}
          </div>
          <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>
            可在「设置」中关闭快捷键，避免与浏览器冲突。
          </p>
        </Modal>
      )}
    </div>
  )
}

/** 迷你窗和歌词窗都是独立窗口，不套主界面框架 */
function Root() {
  const { pathname } = useLocation()
  if (pathname === '/mini') return <Mini />
  if (pathname === '/lyric') return <Lyric />
  return <Shell />
}

export default function App() {
  const desktopLyric = useSettings((s) => s.desktopLyric)
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktop)
  // 迷你窗 / 歌词窗是独立窗口，不能在里面再调 openLyric/closeLyric
  const hashPath = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '/'
  const isAuxWindow = hashPath.startsWith('/mini') || hashPath.startsWith('/lyric')
  useThemeAttrs()

  useEffect(() => {
    if (!isDesktop) {
      if (desktopLyric) useUi.getState().setDesktopLyric(true)
      return
    }
    // 独立窗口（迷你/歌词）不碰主进程窗口管理
    if (isAuxWindow) return
    // Desktop 环境：desktopLyric 开关映射到独立窗
    if (desktopLyric) window.desktop?.openLyric()
    else window.desktop?.closeLyric()

    const off = () => useSettings.getState().set({ desktopLyric: false })
    window.addEventListener('sqy:lyric-close', off)
    return () => window.removeEventListener('sqy:lyric-close', off)
  }, [desktopLyric, isDesktop, isAuxWindow])

  return (
    <HashRouter>
      <Root />
    </HashRouter>
  )
}
