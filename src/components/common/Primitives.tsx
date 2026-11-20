import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Section({
  title,
  subtitle,
  more,
  onMore,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  more?: string
  onMore?: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section fade">
      <header className="section__head">
        <h2>{title}</h2>
        {subtitle && <span className="mute" style={{ fontSize: 12 }}>{subtitle}</span>}
        <div className="spacer" />
        {actions}
        {more && onMore && (
          <button className="section__more" onClick={onMore}>
            {more} <Icon name="right" size={13} />
          </button>
        )}
      </header>
      {children}
    </section>
  )
}

export function Empty({ text = '这里还是空的', hint, action }: { text?: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name="empty" size={30} />
      <div>{text}</div>
      {hint && <div style={{ fontSize: 12, marginTop: 6 }}>{hint}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}

export function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; title?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="chips">
      {items.map((it) => (
        <button
          key={it.key}
          title={it.title}
          className={`chip ${value === it.key ? 'is-on' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          key={it.key}
          className={value === it.key ? 'is-on' : ''}
          onClick={() => onChange(it.key)}
        >
          {it.label}
          {it.count != null && <span className="mute" style={{ marginLeft: 6, fontSize: 12 }}>{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`switch ${on ? 'is-on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    />
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

export function Level({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span title={`难度 ${n} / ${max}`} style={{ letterSpacing: 1 }} aria-label={`难度 ${n}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < n ? 'var(--gold)' : 'var(--bg-3)' }}>
          ●
        </span>
      ))}
    </span>
  )
}

export function Eq({ on }: { on: boolean }) {
  return (
    <span className="eq" aria-hidden="true" style={{ opacity: on ? 1 : 0.25 }}>
      <i style={on ? undefined : { animationPlayState: 'paused' }} />
      <i style={on ? undefined : { animationPlayState: 'paused' }} />
      <i style={on ? undefined : { animationPlayState: 'paused' }} />
    </span>
  )
}

export function PlayAll({ onClick, label = '播放全部' }: { onClick: () => void; label?: string }) {
  return (
    <button className="btn btn--primary" onClick={onClick}>
      <Icon name="play" size={15} />
      {label}
    </button>
  )
}

export function KeyBadge({ k }: { k: string }) {
  return <span className="tag mono">{k}</span>
}
