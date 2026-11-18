import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Empty, Section } from '../components/common/Primitives'
import { navItems } from '../data/nav'
import { useUi } from '../store/ui'

/** 走错的地址也留个入口：HashRouter 下任意未知路径都会落到这里 */
export default function NotFound() {
  const loc = useLocation()
  const nav = useNavigate()
  const setSearch = useUi((s) => s.setSearch)

  return (
    <div>
      <div
        className="card card--flat"
        style={{ textAlign: 'center', padding: '44px 22px', marginBottom: 26 }}
      >
        <div className="mute mono" style={{ fontSize: 11, letterSpacing: '0.32em', marginBottom: 12 }}>
          404 · OFF THE ROAD
        </div>
        <h1 className="serif" style={{ fontSize: 40, marginBottom: 10 }}>
          这一站还没排进路线
        </h1>
        <p className="mute" style={{ fontSize: 13.5, marginBottom: 6 }}>
          叁叁肆要走 334 个县城，你现在输入的地址不在地图上。
        </p>
        <p className="mono" style={{ fontSize: 12, color: 'var(--gold)' }}>
          {loc.pathname}
          {loc.search}
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn--primary">
            <Icon name="home" size={15} /> 回主页
          </Link>
          <Link to="/songs" className="btn">
            <Icon name="music" size={15} /> 曲库
          </Link>
          <button
            className="btn"
            onClick={() => {
              setSearch('')
              nav('/search')
            }}
          >
            <Icon name="search" size={15} /> 去搜索
          </button>
        </div>
      </div>

      <Section title="换个入口" subtitle="六个主菜单都在下面">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(228px,1fr))' }}>
          {navItems.map((n) => (
            <Link key={n.to} to={n.to} className="toolcard">
              <span className="toolcard__ic">
                <Icon name={n.icon} size={18} />
              </span>
              <span style={{ minWidth: 0, textAlign: 'left' }}>
                <h3 className="nowrap">{n.label}</h3>
                <p className="nowrap">{n.desc}</p>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="常见原因" subtitle="如果是从别处点过来的">
        <div className="card card--flat">
          <ul style={{ display: 'grid', gap: 9, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.8, paddingLeft: 18 }}>
            <li>曲目 / 专辑 / 歌单的编号写错了 —— 演示库里的 id 形如 <code className="mono">s01</code>、<code className="mono">a03</code>、<code className="mono">p-default</code>。</li>
            <li>歌单被删掉了 —— 回到「我喜欢」再找其它歌单。</li>
            <li>把 <code className="mono">/tools/chords/&lt;songId&gt;</code> 指向了还没录入谱的曲目 —— 先去谱库看看有哪些。</li>
            <li>链接是别人手打的 —— 让他直接分享页面顶部地址栏里的 <code className="mono">#/...</code>。</li>
          </ul>
        </div>
      </Section>

      <Empty
        text="还是找不到？"
        hint="数据都写在 src/data 里，缺什么页都能一眼看到。"
        action={
          <Link to="/more" className="btn btn--ghost">
            看看「更多」页的说明
          </Link>
        }
      />
    </div>
  )
}
