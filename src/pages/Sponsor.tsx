import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Section, Stat, DemoNotice } from '../components/common/Primitives'
import { Modal } from '../components/common/Overlays'
import { sponsors, payChannels, sponsorWall, sponsorStats, useCases } from '../data/sponsors'
import { hash32 } from '../lib/hash'
import { copyText } from '../lib/share'
import { load, save } from '../lib/storage'
import { useUi } from '../store/ui'
import type { SponsorTier } from '../data/types'

interface SupportRecord {
  tierId: string
  nick: string
  at: number
}

export default function Sponsor() {
  const push = useUi((s) => s.push)
  const [picked, setPicked] = useState<SponsorTier | null>(null)
  const [channel, setChannel] = useState(payChannels[0].key)
  const [nick, setNick] = useState(() => load('sponsor.nick', '' as string))
  const [records, setRecords] = useState<SupportRecord[]>(() => load('sponsor.records', [] as SupportRecord[]))

  const cheapest = useMemo(() => Math.min(...sponsors.map((t) => t.amount)), [])
  const myTiers = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.tierId] = (acc[r.tierId] ?? 0) + 1
    return acc
  }, {})

  const close = () => setPicked(null)

  const confirm = () => {
    if (!picked) return
    const name = nick.trim() || '未填昵称'
    save('sponsor.nick', nick.trim())
    const next = [{ tierId: picked.id, nick: name, at: Date.now() }, ...records].slice(0, 30)
    setRecords(next)
    save('sponsor.records', next)
    close()
    push(`已记录你的赞助意向（${picked.name}）· 正式支付接口接入后才会真正扣款`, 'good')
  }

  return (
    <div>
      <header className="page-head">
        <h1>赞助</h1>
        <p>本站完全靠自愿赞助维持：不卖会员、不设付费墙，费用只用于服务器、域名续费与网站维护。</p>
      </header>

      {/* 顶部说明 */}
      <div className="card" style={{ marginBottom: 26 }}>
        <div className="row" style={{ gap: 26, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 260, flex: 1.4 }}>
            <div className="serif" style={{ fontSize: 20, marginBottom: 10 }}>
              赞助不是购买，是自愿搭把手
            </div>
            <p className="mute" style={{ fontSize: 13, lineHeight: 1.9, maxWidth: 620 }}>
              本站不卖会员、不设付费墙，所有内容免费开放。赞助完全自愿、按次支持，不自动续费；
              收到的钱只用于服务器与域名续费、网站维护，不用于任何商业用途。
            </p>
            <div className="chips" style={{ marginTop: 14 }}>
              <span className="chip is-on">按次赞助</span>
              <span className="chip">不自动续费</span>
              <span className="chip">仅用于服务器与维护</span>
            </div>
          </div>
          <div style={{ minWidth: 210, flex: 1 }}>
            {sponsorStats.map((s) => (
              <div className="fact" key={s.label}>
                <span>{s.label}</span>
                <b className="mono">{s.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 档位 */}
      <Section title="赞助档位" subtitle={`按次赞助 · 最低 ¥${cheapest} · 不自动续费`}>
        <div className="grid grid--tiers">
          {sponsors.map((t) => (
            <div className={`tier ${t.featured ? 'is-featured' : ''}`} key={t.id}>
              {t.featured && <span className="tier__flag">最多人选择</span>}
              <div className="row" style={{ gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span className="tier__name">{t.name}</span>
              </div>
              <div className="row" style={{ alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                <span className="tier__price" style={{ color: t.accent }}>
                  ¥{t.amount}
                </span>
                <span className="tier__unit">/ 次</span>
              </div>
              <div className="mute" style={{ fontSize: 11.5, minHeight: 18 }}>
                一次性赞助，不自动续费
              </div>
              <ul className="tier__list">
                {t.benefits.map((b) => (
                  <li key={b}>
                    <Icon name="check" size={13} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {myTiers[t.id] ? (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--primary btn--block" onClick={() => setPicked(t)}>
                    再支持一次
                  </button>
                  <span className="tag" title="本地记录次数">×{myTiers[t.id]}</span>
                </div>
              ) : (
                <button className="btn btn--block" onClick={() => setPicked(t)}>
                  选择这个档位
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 资金去向 */}
      <Section title="钱具体花在哪" subtitle="只用于服务器、域名续费与网站维护">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
          {useCases.map((u, i) => (
            <div className="card card--flat" key={u.title}>
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="mono" style={{ color: 'var(--gold)', fontSize: 12 }}>
                  0{i + 1}
                </span>
                <b style={{ fontSize: 14 }}>{u.title}</b>
              </div>
              <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                {u.text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 我的赞助记录 */}
      {records.length > 0 && (
        <Section title="我的赞助记录" subtitle="只写在你的浏览器里">
          <div className="list">
            {records.map((r, i) => {
              const t = sponsors.find((x) => x.id === r.tierId)
              return (
                <div className="srow" key={r.at} style={{ gridTemplateColumns: '40px minmax(0,1.4fr) 1fr 90px 60px', height: 48 }}>
                  <span className="srow__idx">{i + 1}</span>
                  <span className="nowrap" style={{ fontSize: 13 }}>
                    {t?.icon} {t?.name}
                  </span>
                  <span className="mute nowrap" style={{ fontSize: 12 }}>
                    ¥{t ? t.amount : '—'} / 次 · 署名「{r.nick}」
                  </span>
                  <span className="mute mono" style={{ fontSize: 11 }}>
                    {new Date(r.at).toLocaleDateString()}
                  </span>
                  <div className="srow__acts" style={{ opacity: 1 }}>
                    <button
                      className="iconbtn tip"
                      data-tip="删除这条记录"
                      onClick={() => {
                        const next = records.filter((x) => x.at !== r.at)
                        setRecords(next)
                        save('sponsor.records', next)
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
            这些记录用于在演示里体现「支持过什么」，不构成任何凭证；正式版本会换成真实订单系统与电子感谢卡。
          </p>
        </Section>
      )}

      {/* 赞助墙入口 */}
      <Section
        title="赞助墙"
        subtitle={`${sponsorWall.length} 位赞助者（演示）`}
        actions={
          <Link to="/sponsor/wall" className="btn btn--primary">
            <Icon name="right" size={15} /> 进入赞助墙
          </Link>
        }
      >
        <div className="card card--flat">
          <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
            所有赞助者的署名、金额与日期会永久展示在独立页面中，默认以滚动墙呈现。
          </p>
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, margin: '6px 0 30px' }}>
        <Stat value={sponsors.length} label="赞助档位" />
        <Stat value={`¥${cheapest}`} label="最低赞助 / 次" />
        <Stat value={payChannels.length} label="收款渠道" />
        <Stat value={records.length} label="你的本地记录" />
      </div>

      <Section title="常见问题">
        <div className="card card--flat">
          {[
            ['必须赞助吗？', '不必须。本站内容免费开放，赞助完全自愿，也不提供等值服务。'],
            ['钱会用在别的地方吗？', '不会。赞助仅用于服务器与域名续费、网站维护。'],
            ['会自动续费吗？', '不会。所有赞助按次发生，没有订阅，也不会自动扣款。'],
            ['署名可以修改或删除吗？', '留言的署名会永久显示在赞助墙上，提交前请确认。'],
          ].map(([q, a]) => (
            <div key={q} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 550, marginBottom: 3 }}>{q}</div>
              <div className="mute" style={{ fontSize: 12.5, lineHeight: 1.75 }}>
                {a}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <DemoNotice>
        本页未连接任何支付渠道，二维码为按渠道名生成的图形占位；点击「确认」只写入本地记录，可用于演示流程验收。
      </DemoNotice>

      {/* 结算演示弹窗 */}
      {picked && (
        <Modal
          title={`赞助 · ${picked.name}`}
          onClose={close}
          width={560}
          footer={
            <>
              <button className="btn" onClick={close}>
                再看看
              </button>
              <button className="btn btn--primary" onClick={confirm}>
                <Icon name="check" size={15} /> 我已完成赞助
              </button>
            </>
          }
        >
          <div className="row" style={{ gap: 6, marginBottom: 16 }}>
            <span className="tier__price" style={{ color: picked.accent, fontSize: 28 }}>
              ¥{picked.amount}
            </span>
            <span className="tier__unit" style={{ alignSelf: 'flex-end' }}>
              / 次
            </span>
            <div className="spacer" />
            <span className="mute" style={{ fontSize: 12, alignSelf: 'flex-end' }}>
              {picked.icon} {picked.name} · 不自动续费
            </span>
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>收款渠道</b>
              <span>选择后下方图形即为该渠道的占位码</span>
            </div>
            <div className="chips">
              {payChannels.map((c) => (
                <button key={c.key} className={`chip ${channel === c.key ? 'is-on' : ''}`} onClick={() => setChannel(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="qr">
                <QrPlaceholder seed={`${channel}:${picked.id}`} />
              </div>
              <div className="mute" style={{ fontSize: 11 }}>
                演示图形，不含真实信息
              </div>
            </div>
            <div style={{ minWidth: 230, flex: 1 }}>
              <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>
                {payChannels.find((c) => c.key === channel)?.hint}
              </div>
              <input
                className="inputlike"
                placeholder="赞助墙署名（将永久展示）"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                maxLength={20}
              />
              <div className="mute" style={{ fontSize: 11.5, marginTop: 8 }}>
                留言的署名会永久显示在赞助墙上，提交前请确认。
              </div>
              <button
                className="btn"
                style={{ marginTop: 12 }}
                onClick={() =>
                  copyText(
                    [
                      `赞助档位：${picked.name}`,
                      `金额：¥${picked.amount}（按次，不自动续费）`,
                      `渠道：${payChannels.find((c) => c.key === channel)?.label}`,
                      `署名：${nick.trim() || '未填'}`,
                      '（演示文本，未接入支付）',
                    ].join('\n'),
                  ).then((ok) => push(ok ? '赞助说明已复制' : '复制失败，请手动选取', ok ? 'good' : 'info'))
                }
              >
                <Icon name="share" size={15} /> 复制赞助说明
              </button>
            </div>
          </div>

          <ul style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--fg-2)', marginTop: 18, paddingLeft: 18 }}>
            {picked.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}

/** 由种子生成的伪二维码图形：纯装饰，不可扫描 */
function QrPlaceholder({ seed, size = 112 }: { seed: string; size?: number }) {
  const cells = 21
  const s = size / cells
  const bits = useMemo(() => {
    let h = hash32(seed)
    const out: boolean[] = []
    for (let i = 0; i < cells * cells; i++) {
      h = (h * 1664525 + 1013904223) >>> 0
      out.push(((h >>> 7) & 1) === 1)
    }
    return out
  }, [seed])

  // 三个定位角占用的区域不画数据点
  const inFinder = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= cells - 8) || (r >= cells - 8 && c < 8)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-label="占位二维码">
      <rect width={size} height={size} fill="#fff" />
      {Array.from({ length: cells * cells }).map((_, i) => {
        const r = Math.floor(i / cells)
        const c = i % cells
        if (inFinder(r, c) || !bits[i]) return null
        return <rect key={i} x={c * s} y={r * s} width={s} height={s} fill="#12141a" />
      })}
      {([
        [0, 0],
        [0, cells - 7],
        [cells - 7, 0],
      ] as [number, number][]).map(([br, bc]) => (
        <g key={`${br}-${bc}`}>
          <rect x={bc * s} y={br * s} width={s * 7} height={s * 7} fill="#12141a" />
          <rect x={(bc + 1) * s} y={(br + 1) * s} width={s * 5} height={s * 5} fill="#fff" />
          <rect x={(bc + 2) * s} y={(br + 2) * s} width={s * 3} height={s * 3} fill="#12141a" />
        </g>
      ))}
    </svg>
  )
}
