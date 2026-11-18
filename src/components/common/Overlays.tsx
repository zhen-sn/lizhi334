import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { useUi } from '../../store/ui'

export function Modal({
  title,
  onClose,
  children,
  footer,
  width,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return createPortal(
    <div className="overlay overlay--center" style={{ zIndex: 110 }} onMouseDown={onClose}>
      <div
        className="modal__box"
        style={{ width: width ? `min(${width}px,100%)` : undefined }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h3>{title}</h3>
          <div className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="关闭">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({
  title,
  onClose,
  children,
  extra,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  extra?: ReactNode
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return createPortal(
    <>
      <div className="overlay" style={{ zIndex: 111 }} onMouseDown={onClose} />
      <aside className="drawer" role="dialog" aria-label="面板">
        <header className="drawer__head">
          <div className="nowrap" style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <div className="spacer" />
          {extra}
          <button className="iconbtn" onClick={onClose} aria-label="关闭">
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </aside>
    </>,
    document.body,
  )
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismiss)
  if (!toasts.length) return null
  return createPortal(
    <div className="toasts">
      {toasts.map((t) => (
        <button
          key={t.id}
          className="toast"
          style={t.kind === 'ach' ? { borderColor: 'var(--gold-line)', color: 'var(--gold)' } : undefined}
          onClick={() => dismiss(t.id)}
        >
          {t.kind === 'ach' && <Icon name="star" size={14} style={{ marginRight: 6, verticalAlign: -2 }} />}
          {t.msg}
        </button>
      ))}
    </div>,
    document.body,
  )
}
