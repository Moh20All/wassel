// TSX port of wassel-design-system/components/bundle.js. Styles: styles/components.css
import { useRef, type ReactNode, type ChangeEvent } from 'react'
import type { Status, Kind } from './shipments'
import { toWhatsAppUrl } from './utils'

const PATHS = {
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  chat: 'M4 5h16v11H9l-5 4z',
  doc: 'M7 3h7l4 4v14H7z M14 3v4h4',
  box: 'M4 7l8-4 8 4v10l-8 4-8-4z M4 7l8 4 8-4 M12 11v10',
  x: 'M7 7l10 10M17 7L7 17',
  check: 'M5 12.5l4.5 4.5L19 7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0',
  dash: 'M7 12h10',
}

export function Icon({ name, size = 20, weight = 2 }: { name: keyof typeof PATHS; size?: number; weight?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={weight}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function NavBar(p: { title: string; large?: boolean; onBack?: () => void; trailing?: ReactNode }) {
  return (
    <header className="ib-nav">
      <div className="ib-nav-bar">
        <div className="ib-nav-slot">
          {p.onBack && (
            <button type="button" className="ib-btn ib-btn-plain ib-back" onClick={p.onBack}>
              <Icon name="chevronLeft" size={22} weight={2.5} />Back
            </button>
          )}
        </div>
        {!p.large && <div className="ib-nav-title">{p.title}</div>}
        <div className="ib-nav-slot">{p.trailing}</div>
      </div>
      {p.large && <h1 className="ib-nav-large">{p.title}</h1>}
    </header>
  )
}

export function Button(p: {
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive'; block?: boolean; loading?: boolean
  disabled?: boolean; type?: 'button' | 'submit'; onClick?: () => void; children: ReactNode
}) {
  const cls = ['ib-btn', 'ib-btn-' + (p.variant ?? 'primary'), p.block && 'ib-btn-block'].filter(Boolean).join(' ')
  return (
    <button type={p.type ?? 'button'} disabled={p.disabled || p.loading} onClick={p.onClick} className={cls}>
      {p.loading && <span className="ib-spinner" aria-label="Loading" />}
      {p.children}
    </button>
  )
}

export function TextField(p: {
  label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string
  inputMode?: 'numeric' | 'tel' | 'email' | 'text'; placeholder?: string; multiline?: boolean; optional?: boolean
}) {
  const id = 'f-' + p.label.replace(/\W+/g, '-').toLowerCase()
  const change = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onChange(e.target.value)
  return (
    <div className="ib-field">
      <label className="ib-field-label" htmlFor={id}>{p.label}{p.optional && ' (optional)'}</label>
      {p.multiline
        ? <textarea id={id} rows={3} placeholder={p.placeholder} value={p.value} onChange={change} />
        : <input id={id} type={p.type ?? 'text'} autoComplete={p.autoComplete} inputMode={p.inputMode} placeholder={p.placeholder}
            value={p.value} onChange={change} />}
    </div>
  )
}

export function FormGroup(p: { label?: string; children: ReactNode }) {
  return (
    <section>
      {p.label && <h3 className="ib-group-label">{p.label}</h3>}
      <div className="ib-group">{p.children}</div>
    </section>
  )
}

export function SegmentedControl<T extends string>(p: {
  options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label?: string
}) {
  return (
    <div className="ib-seg" role="group" aria-label={p.label ?? 'Filter'}>
      {p.options.map(o => (
        <button type="button" key={o.value} aria-pressed={o.value === p.value} onClick={() => p.onChange(o.value)}>
          {o.label}{o.count != null && <span className="ib-seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

const STATUS = { pending: 'Pending', arrived: 'Arrived', delivered: 'Delivered' }
export function StatusBadge({ status }: { status: Status }) {
  return <span className={'ib-badge ib-badge-' + status}>{STATUS[status]}</span>
}

export function TypeTag({ type }: { type: Kind }) {
  return (
    <span className="ib-tag">
      <Icon name={type === 'parts' ? 'box' : 'doc'} size={12} weight={2.4} />{type === 'parts' ? 'Parts' : 'Papers'}
    </span>
  )
}

export function ShipmentCard(p: {
  clientName: string; type: Kind; status: Status; time: string; sub?: string; photo?: string | null; onClick: () => void
}) {
  return (
    <button type="button" className="ib-card" onClick={p.onClick}>
      {p.photo
        ? <img className="ib-thumb" src={p.photo} alt="" />
        : <span className="ib-thumb"><Icon name={p.type === 'parts' ? 'box' : 'doc'} size={24} weight={1.6} /></span>}
      <span className="ib-card-body">
        <span className="ib-card-top">
          <span className="ib-card-name">{p.clientName}</span>
          <span className="ib-card-time">{p.time}</span>
        </span>
        {p.sub && <span className="card-sub">{p.sub}</span>}
        <span className="ib-card-meta"><StatusBadge status={p.status} /><TypeTag type={p.type} /></span>
      </span>
      <span className="ib-chev"><Icon name="chevronRight" size={18} weight={2.5} /></span>
    </button>
  )
}

export function PhotoPicker(p: { photos: string[]; max?: number; onAdd: (files: File[]) => void; onRemove: (i: number) => void }) {
  const max = p.max ?? 3
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="ib-photos">
      {p.photos.map((src, i) => (
        <div className="ib-slot" key={i}>
          <img src={src} alt={`Photo ${i + 1}`} />
          <button type="button" className="ib-slot-remove" aria-label={`Remove photo ${i + 1}`} onClick={() => p.onRemove(i)}>
            <Icon name="x" size={14} weight={3} />
          </button>
        </div>
      ))}
      {p.photos.length < max && (
        <button type="button" className="ib-slot ib-slot-add" onClick={() => input.current?.click()}>
          <Icon name="camera" size={26} weight={1.8} />{p.photos.length ? 'Add' : 'Add photo'}
        </button>
      )}
      {/* no `capture` attr so phones offer both camera and gallery */}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => {
        p.onAdd(Array.from(e.target.files ?? []))
        e.target.value = ''
      }} />
    </div>
  )
}

export function ContactActions({ phone }: { phone: string }) {
  const tel = 'tel:' + phone.replace(/\s/g, '')
  return (
    <div>
      <a className="ib-phone" href={tel}>{phone}</a>
      <div className="ib-contact">
        <a className="ib-contact-call" href={tel}><Icon name="phone" />Call</a>
        <a className="ib-contact-wa" href={toWhatsAppUrl(phone)} target="_blank" rel="noopener"><Icon name="chat" />WhatsApp</a>
      </div>
    </div>
  )
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="ib-actionbar">{children}</div>
}
