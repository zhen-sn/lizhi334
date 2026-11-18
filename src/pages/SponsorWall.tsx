import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Section, DemoNotice } from '../components/common/Primitives'
import { sponsorWall } from '../data/sponsors'
import { tourDoneCount, TOUR_TARGET } from '../data/tour'

type WallItem = (typeof sponsorWall)[number]

/** 档位对应的点缀色，只用在圆点上 */
const TIER_COLOR: Record<string, string> = {
  '青铜 · 旁听': '#b08d6a',
  '白银 · 同行': '#b9c2ce',
  '黄金 · 常驻': '#d9b45a',
  '钻石 · 共建': '#7cc7f0',
}

function WallCard({ w }: { w: WallItem }) {
  return (
    <div
      className="wallcard"
      style={{ '--wall-accent': TIER_COLOR[w.tier] ?? 'var(--gold)' } as CSSProperties}
      title={`${w.tier} · 「${w.words}」`}
    >
      <div className="wallcard__top">
        <i className="wallcard__dot" />
        <b className="wallcard__nick">{w.nick}</b>
        <span className="wallcard__tier">{w.tier.split(' · ')[0]}</span>
      </div>
      <div className="wallcard__meta mono">
        <span>¥{w.amount}</span>
        <span className="wallcard__sep">·</span>
        <span>{w.date}</span>
      </div>
      <p className="wallcard__words">「{w.words}」</p>
    </div>
  )
}

/** 一排循环滚动，内容复制三份保证任何屏宽下都不露空档 */
function WallRow({ items, reverse }: { items: WallItem[]; reverse?: boolean }) {
  return (
    <div className={reverse ? 'wallflow__row wallflow__row--rev' : 'wallflow__row'}>
      <div className="wallflow__track">
        {[0, 1, 2].map((g) => (
          <div className="wallflow__group" key={g} aria-hidden={g > 0 || undefined}>
            {items.map((w) => (
              <WallCard key={`${g}-${w.nick}`} w={w} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SponsorWall() {
  const rowA = sponsorWall.filter((_, i) => i % 2 === 0)
  const rowB = sponsorWall.filter((_, i) => i % 2 === 1)

  return (
    <div>
      <header className="page-head">
        <h1>赞助墙</h1>
        <p>所有赞助者的署名、金额与日期永久展示在这里，以滚动墙的形式缓缓流过。</p>
      </header>

      <div className="card" style={{ marginBottom: 26 }}>
        <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <div className="fact">
            <span>赞助者</span>
            <b className="mono">{sponsorWall.length} 位</b>
          </div>
          <div className="spacer" />
          <Link to="/sponsor" className="btn">
            <Icon name="right" size={15} style={{ transform: 'rotate(180deg)' }} /> 回到赞助
          </Link>
        </div>
      </div>

      <Section title="滚动墙" subtitle={`${sponsorWall.length} 位赞助者（演示）· 悬停暂停`}>
        <div className="wallflow">
          <WallRow items={rowA} />
          <WallRow items={rowB} reverse />
        </div>
        <div className="mute" style={{ fontSize: 12, marginTop: 12 }}>
          留言的署名会永久显示在赞助墙上。当前进度：{tourDoneCount} / {TOUR_TARGET} 城。
        </div>
      </Section>

      <Section title="全部署名" subtitle="按赞助时间从近到远">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {sponsorWall.map((w) => (
            <div className="card card--flat" key={w.nick}>
              <div className="row">
                <b style={{ color: 'var(--gold)' }}>{w.nick}</b>
                <div className="spacer" />
                <span className="tag">{w.tier}</span>
              </div>
              <div className="row mute" style={{ marginTop: 7, fontSize: 12 }}>
                <span className="mono">¥{w.amount}</span>
                <span>·</span>
                <span>{w.date}</span>
              </div>
              <p className="mute" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.7 }}>
                「{w.words}」
              </p>
            </div>
          ))}
        </div>
      </Section>

      <DemoNotice>
        赞助墙数据为演示内容；正式版会展示经赞助者确认的署名、金额与日期，且署名提交后长期保留。
      </DemoNotice>
    </div>
  )
}
