import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { navItems, libItems, tabItems } from '../../data/nav'
import { Icon } from '../common/Icon'
import { useUi } from '../../store/ui'
import { useAuth } from '../../store/auth'
import { useLibrary } from '../../store/library'
import { usePlayer } from '../../store/player'
import { useSettings, resolvedTheme } from '../../store/settings'
import iconUrl from '../../assets/icon.png'

export function Brand() {
  return (
    <div className="nav__brand">
      <img className="nav__mark" src={iconUrl} alt="叁叁肆" />
      <div>
        <div className="nav__title">保持理智</div>
        <div className="nav__sub">认真听歌中……</div>
      </div>
    </div>
  )
}

export function SideNav() {
  const favCount = useLibrary((s) => s.favorites.length)
  const histCount = useLibrary((s) => s.history.length)
  const playlists = useLibrary((s) => s.playlists)

  return (
    <nav className="nav" aria-label="主导航">
      <Brand />
      <div className="nav__scroll">
        <div className="nav__group">
          <div className="nav__label">菜单</div>
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={it.icon} size={17} />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav__group">
          <div className="nav__label">我的</div>
          {libItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={it.icon} size={17} />
              <span>{it.label}</span>
              <span className="nav__count">
                {it.to === '/playlist/fav' ? favCount : it.to === '/history' ? histCount : ''}
              </span>
            </NavLink>
          ))}
          {playlists.map((p) => (
            <NavLink
              key={p.id}
              to={`/playlist/${p.id}`}
              className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name="queue" size={17} />
              <span className="nowrap">{p.name}</span>
              <span className="nav__count">{p.songIds.length}</span>
            </NavLink>
          ))}
          <AddPlaylistInline />
        </div>

        <div className="nav__group">
          <div className="nav__label">浏览</div>
          <NavLink to="/more/tour" className="nav__item">
            <Icon name="map" size={17} />
            <span>叁叁肆巡演</span>
          </NavLink>
          <NavLink to="/sponsor" className="nav__item">
            <Icon name="crown" size={17} />
            <span>赞助</span>
          </NavLink>
          <NavLink to="/more/stats" className="nav__item">
            <Icon name="star" size={17} />
            <span>听歌报告</span>
          </NavLink>
        </div>
      </div>

      <div className="nav__foot">
        <ThemeToggle />
        <div className="spacer" />
        <NavLink to="/settings" className="iconbtn tip" data-tip="设置">
          <Icon name="gear" size={17} />
        </NavLink>
      </div>
    </nav>
  )
}

function AddPlaylistInline() {
  const create = useLibrary((s) => s.createPlaylist)
  return (
    <button
      className="nav__item"
      onClick={() => {
        const name = window.prompt('新歌单名称', '新歌单')
        if (!name) return
        const id = create(name)
        location.hash = `#/playlist/${id}`
      }}
    >
      <Icon name="plus" size={17} />
      <span>新建歌单</span>
    </button>
  )
}

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme)
  const set = useSettings((s) => s.set)
  const dark = resolvedTheme(useSettings.getState()) === 'dark'
  const next = theme === 'system' ? (dark ? 'light' : 'dark') : theme === 'dark' ? 'light' : 'system'
  return (
    <button
      className="iconbtn tip"
      data-tip={theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}
      onClick={() => set({ theme: next as 'dark' | 'light' | 'system' })}
      aria-label="切换主题"
    >
      <Icon name={theme === 'system' ? 'globe' : dark ? 'moon' : 'sun'} size={17} />
    </button>
  )
}

/** 无边框客户端的自定义标题栏按钮；浏览器里不渲染 */
function WinControls() {
  const [maxed, setMaxed] = useState(false)

  useEffect(() => {
    const desktop = window.desktop
    if (!desktop?.onMaxState) return
    return desktop.onMaxState(setMaxed)
  }, [])

  return (
    <div className="wincontrols">
      <button
        className="wincontrols__btn"
        onClick={() => window.desktop?.minimize()}
        aria-label="最小化"
        title="最小化"
      >
        <Icon name="minus" size={16} />
      </button>
      <button
        className="wincontrols__btn"
        onClick={() => window.desktop?.maximize()}
        aria-label={maxed ? '还原' : '最大化'}
        title={maxed ? '还原' : '最大化'}
      >
        <Icon name={maxed ? 'collapse' : 'expand'} size={15} />
      </button>
      <button
        className="wincontrols__btn wincontrols__btn--close"
        onClick={() => window.desktop?.closeWindow()}
        aria-label="关闭（收进托盘）"
        title="关闭（收进托盘）"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}

export function TopBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const search = useUi((s) => s.search)
  const setSearch = useUi((s) => s.setSearch)
  const playing = usePlayer((s) => s.playing)
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktop)

  return (
    <header className={`topbar ${isDesktop ? 'topbar--frameless' : ''}`}>
      <MobileBrand />
      <div className="search">
        <Icon name="search" size={15} style={{ color: 'var(--fg-3)' }} />
        <input
          value={search}
          placeholder="搜歌名、专辑、城市、标签…"
          aria-label="搜索"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.trim()) nav(`/search?q=${encodeURIComponent(search.trim())}`)
            if (e.key === 'Escape') setSearch('')
          }}
        />
        {search ? (
          <button className="iconbtn" style={{ width: 22, height: 22 }} onClick={() => setSearch('')} aria-label="清空">
            <Icon name="close" size={13} />
          </button>
        ) : (
          <kbd className="mute" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            /
          </kbd>
        )}
      </div>

      <div className="spacer" />

      {!loc.pathname.startsWith('/upload') && (
        <NavLink to="/upload" className="btn btn--primary" style={{ height: 34 }}>
          <Icon name="upload" size={15} />
          上传资源
        </NavLink>
      )}
      <NavLink
        to="/random"
        className="iconbtn tip"
        data-tip="随机来一首（命运模式）"
        aria-label="随机播放"
      >
        <Icon name="dice" size={18} />
      </NavLink>
      <span className="live-dot" title={playing ? '正在播放' : '已暂停'} data-on={playing} />
      <AccountEntry />
      {isDesktop && <WinControls />}
    </header>
  )
}

/** 顶栏账号入口：未登录显示登录按钮，登录后显示头像与退出菜单 */
function AccountEntry() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const openAuth = useUi((s) => s.openAuth)
  const push = useUi((s) => s.push)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!user) {
    return (
      <button className="account__btn account__btn--plain" onClick={() => openAuth('login')}>
        <Icon name="user" size={16} />
        登录
      </button>
    )
  }

  return (
    <div className="account" ref={box}>
      <button className="account__btn" onClick={() => setOpen((v) => !v)} aria-label="账号菜单">
        <span className="account__avatar">{user.name.slice(0, 1)}</span>
        <span className="account__name nowrap">{user.name}</span>
      </button>
      {open && (
        <div className="account__menu">
          <div className="account__menu-head">{user.email}</div>
          <NavLink to="/me/profile" onClick={() => setOpen(false)}>
            <Icon name="user" size={15} />
            个人资料
          </NavLink>
          <NavLink to="/me/sponsors" onClick={() => setOpen(false)}>
            <Icon name="crown" size={15} />
            我的赞助
          </NavLink>
          <NavLink to="/me/uploads" onClick={() => setOpen(false)}>
            <Icon name="upload" size={15} />
            我上传的资源
          </NavLink>
          <button
            className="account__menu-quit"
            onClick={() => {
              logout()
              setOpen(false)
              push('已退出登录')
            }}
          >
            <Icon name="logout" size={15} />
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}

function MobileBrand() {
  return (
    <div className="row" style={{ display: 'none' }} id="mobile-brand">
      <div className="nav__mark" style={{ width: 30, height: 30, fontSize: 16 }}>李</div>
    </div>
  )
}

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="底部导航">
      {tabItems.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) => (isActive ? 'is-active' : '')}
        >
          <Icon name={it.icon} size={19} />
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
