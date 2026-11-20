import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Section, Stat } from '../components/common/Primitives'
import { Modal } from '../components/common/Overlays'
import { sponsors, payChannels, sponsorWall, sponsorStats, useCases } from '../data/sponsors'
import { load, save } from '../lib/storage'
import { useUi } from '../store/ui'
import { useAuth } from '../store/auth'
import { api } from '../api/client'
import type { SponsorTier } from '../data/types'

interface PayInfo {
  enabled: boolean
  provider: string
}

interface OrderRow {
  orderNo: string
  subject: string
  amount: number
  channel: string
  status: string
  createdAt: number
  paidAt: number | null
}

interface PayState {
  orderNo: string
  payUrl: string
  status: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  closed: '已关闭',
  refunded: '已退款',
}

export default function Sponsor() {
  const push = useUi((s) => s.push)
  const user = useAuth((s) => s.user)
  const [picked, setPicked] = useState<SponsorTier | null>(null)
  const [channel, setChannel] = useState('alipay')
  const [nick, setNick] = useState(() => load('sponsor.nick', '' as string))
  const [info, setInfo] = useState<PayInfo | null>(null)
  const [pay, setPay] = useState<PayState | null>(null)
  const [busy, setBusy] = useState(false)
  const [orders, setOrders] = useState<OrderRow[]>([])

  const supported = payChannels.filter((c) => c.key === 'alipay' || c.key === 'wechat')
  const channels = supported.length
    ? supported
    : [
        { key: 'alipay', label: '支付宝', hint: '' },
        { key: 'wechat', label: '微信支付', hint: '' },
      ]
  const cheapest = Math.min(...sponsors.map((t) => t.amount))
  const payEnabled = info?.enabled ?? false

  const loadOrders = () => {
    if (!user) {
      setOrders([])
      return
    }
    api<OrderRow[]>('/orders/mine')
      .then((rows) => setOrders(rows ?? []))
      .catch(() => undefined)
  }

  useEffect(() => {
    api<PayInfo>('/payment/info')
      .then(setInfo)
      .catch(() => setInfo({ enabled: false, provider: '' }))
  }, [])

  useEffect(loadOrders, [user])

  // 轮询订单状态：支付成功后自动更新
  useEffect(() => {
    if (!pay || pay.status !== 'pending') return
    let alive = true
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      try {
        const s = await api<{ status: string }>(`/orders/status/${pay.orderNo}`, { timeout: 8000 })
        if (!alive) return
        if (s.status !== 'pending') {
          setPay((p) => (p ? { ...p, status: s.status } : p))
          if (s.status === 'paid') {
            push('支付成功，感谢你的支持！', 'good')
            loadOrders()
          }
        }
      } catch {
        // 网络波动忽略，继续等待
      }
      if (tries >= 100) {
        clearInterval(timer)
        if (alive) setPay((p) => (p && p.status === 'pending' ? { ...p, status: 'timeout' } : p))
      }
    }, 3000)
    return () => {
      alive = false
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay?.orderNo, pay?.status])

  const close = () => {
    setPicked(null)
    setPay(null)
  }

  const createOrder = async () => {
    if (!picked || busy) return
    if (!payEnabled) {
      push('站点尚未开启在线支付，可先联系站长', 'info')
      return
    }
    const name = nick.trim() || user?.name || '热心听众'
    setBusy(true)
    try {
      const res = await api<{ orderNo: string; payUrl: string }>('/orders/create', {
        method: 'POST',
        body: {
          subject: `${picked.name} 赞助`,
          amount: picked.amount,
          provider: info?.provider,
          channel: channel === 'wechat' ? 'wxpay' : channel,
          contact: name,
        },
      })
      save('sponsor.nick', nick.trim())
      setPay({ orderNo: res.orderNo, payUrl: res.payUrl, status: 'pending' })
      window.open(res.payUrl, '_blank', 'noopener')
    } catch (e) {
      push(e instanceof Error ? e.message : '下单失败，请稍后重试', 'info')
    } finally {
      setBusy(false)
    }
  }

  const refreshStatus = async () => {
    if (!pay) return
    try {
      const s = await api<{ status: string }>(`/orders/status/${pay.orderNo}`)
      setPay({ ...pay, status: s.status })
      if (s.status === 'paid') {
        push('支付成功，感谢你的支持！', 'good')
        loadOrders()
      } else {
        push('尚未收到支付结果，请稍等片刻再试', 'info')
      }
    } catch (e) {
      push(e instanceof Error ? e.message : '查询失败，请稍后重试', 'info')
    }
  }

  const paidCount = (t: SponsorTier) =>
    orders.filter((o) => o.status === 'paid' && o.subject.startsWith(t.name)).length

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

      {info && !info.enabled && (
        <div className="card card--flat" style={{ marginBottom: 22 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Icon name="info" size={15} />
            <span style={{ fontSize: 13 }}>在线支付暂未开启，档位与说明可供了解；恢复后即可直接下单支付。</span>
          </div>
        </div>
      )}

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
              {paidCount(t) > 0 ? (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--primary btn--block" onClick={() => setPicked(t)}>
                    再支持一次
                  </button>
                  <span className="tag" title="已支付次数">×{paidCount(t)}</span>
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

      {/* 我的赞助记录（来自服务器订单） */}
      {user && orders.length > 0 && (
        <Section title="我的赞助记录" subtitle="按时间倒序 · 来自服务器订单">
          <div className="list">
            {orders.map((o, i) => (
              <div
                className="srow"
                key={o.orderNo}
                style={{ gridTemplateColumns: '40px minmax(0,1.4fr) 1fr 90px 90px', height: 48 }}
              >
                <span className="srow__idx">{i + 1}</span>
                <span className="nowrap" style={{ fontSize: 13 }}>{o.subject}</span>
                <span className="mute nowrap" style={{ fontSize: 12 }}>
                  ¥{Number(o.amount).toFixed(2)} · {o.channel === 'wxpay' ? '微信' : '支付宝'}
                </span>
                <span className="tag" style={{ justifySelf: 'start' }}>{STATUS_LABEL[o.status] ?? o.status}</span>
                <span className="mute mono" style={{ fontSize: 11 }}>
                  {new Date(o.paidAt ?? o.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 赞助墙入口 */}
      <Section
        title="赞助墙"
        subtitle={`${sponsorWall.length} 位赞助者`}
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
        <Stat value={channels.length} label="收款渠道" />
        <Stat value={user ? orders.filter((o) => o.status === 'paid').length : 0} label="我的支持次数" />
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

      {/* 结算弹窗 */}
      {picked && (
        <Modal
          title={`赞助 · ${picked.name}`}
          onClose={close}
          width={560}
          footer={
            pay?.status === 'paid' ? (
              <>
                <button className="btn" onClick={close}>关闭</button>
                {user && (
                  <Link to="/me/sponsors" className="btn btn--primary" onClick={close}>
                    <Icon name="crown" size={15} /> 查看我的赞助
                  </Link>
                )}
              </>
            ) : pay ? (
              <>
                <button className="btn" onClick={close}>稍后支付</button>
                <button className="btn btn--primary" onClick={refreshStatus}>
                  <Icon name="refresh" size={15} /> 我已完成支付
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={close}>再看看</button>
                <button className="btn btn--primary" onClick={createOrder} disabled={busy || !payEnabled}>
                  <Icon name="wallet" size={15} /> {busy ? '正在下单…' : '去支付'}
                </button>
              </>
            )
          }
        >
          <div className="row" style={{ gap: 6, marginBottom: 16 }}>
            <span className="tier__price" style={{ color: picked.accent, fontSize: 28 }}>
              ¥{picked.amount}
            </span>
            <span className="tier__unit" style={{ alignSelf: 'flex-end' }}>/ 次</span>
            <div className="spacer" />
            <span className="mute" style={{ fontSize: 12, alignSelf: 'flex-end' }}>
              {picked.icon} {picked.name} · 不自动续费
            </span>
          </div>

          {!pay && (
            <>
              <div className="srowform">
                <div className="srowform__label">
                  <b>收款渠道</b>
                  <span>支付时会跳转到对应的收银台</span>
                </div>
                <div className="chips">
                  {channels.map((c) => (
                    <button
                      key={c.key}
                      className={`chip ${channel === c.key ? 'is-on' : ''}`}
                      onClick={() => setChannel(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>
                  显示在赞助墙的署名（选填）
                </div>
                <input
                  className="inputlike"
                  placeholder={user?.name || '热心听众'}
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  maxLength={20}
                />
                <div className="mute" style={{ fontSize: 11.5, marginTop: 8 }}>
                  提交后会生成真实订单并跳转支付；未登录也可以赞助，登录后可在「我的」查看订单。
                </div>
                {!payEnabled && (
                  <div className="auth__err" style={{ marginTop: 10 }}>
                    站点尚未开启在线支付，暂无法下单。
                  </div>
                )}
              </div>

              <ul style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--fg-2)', marginTop: 18, paddingLeft: 18 }}>
                {picked.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </>
          )}

          {pay && pay.status === 'pending' && (
            <div>
              <p style={{ fontSize: 13.5, marginBottom: 8 }}>订单已创建，请在支付页面完成付款。</p>
              <p className="mute" style={{ fontSize: 12, marginBottom: 14 }}>
                订单号：<span className="mono">{pay.orderNo}</span> · 页面会自动检查支付结果
              </p>
              <button className="btn btn--block" onClick={() => window.open(pay.payUrl, '_blank', 'noopener')}>
                <Icon name="share" size={15} /> 打开支付页面
              </button>
              <p className="mute" style={{ fontSize: 11.5, marginTop: 12 }}>
                支付完成后一般几秒内自动确认；若浏览器拦截了新窗口，请点击上面的按钮手动打开。
              </p>
            </div>
          )}

          {pay && pay.status === 'paid' && (
            <div>
              <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                <Icon name="check" size={18} />
                <b style={{ fontSize: 15 }}>支付成功，感谢你的支持</b>
              </div>
              <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                订单号 <span className="mono">{pay.orderNo}</span>，金额 ¥{picked.amount}。
                电子感谢卡与署名展示会陆续更新。
              </p>
            </div>
          )}

          {pay && pay.status !== 'pending' && pay.status !== 'paid' && (
            <div>
              <p style={{ fontSize: 13.5, marginBottom: 8 }}>
                {pay.status === 'timeout' ? '暂未收到支付结果' : `订单状态：${STATUS_LABEL[pay.status] ?? pay.status}`}
              </p>
              <p className="mute" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                如果你已完成支付，请稍后再点「我已完成支付」刷新；仍未到账可保留订单号联系站长。
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}