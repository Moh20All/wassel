import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  addPayment, deleteShipment, DOCS, markPaid, remaining, setStatus, toggleDoc, watchPhotos, watchShipment,
  type HistoryEntry, type Photo, type Shipment, type Status,
} from '../shipments'
import { ActionBar, Button, ContactActions, FormGroup, Icon, NavBar, Progress, StatusBadge, TypeTag } from '../ui'
import { clientMessage, displayName, formatDA, formatDateTime, mapsUrl, parseAmount } from '../utils'

const NEXT: Record<Status, [Status, string] | null> = {
  pending: ['arrived', 'Mark arrived'],
  arrived: ['delivered', 'Mark delivered'],
  delivered: null,
}
const BACK: Record<Status, [Status, string] | null> = {
  pending: null,
  arrived: ['pending', 'Back to pending'],
  delivered: ['arrived', 'Back to arrived'],
}
const ACTION: Record<HistoryEntry['action'], string> = {
  created: 'Logged', edited: 'Edited', paid: 'Marked fully paid', payment: 'Payment received', doc: 'Document',
  pending: 'Moved to pending', arrived: 'Marked arrived', delivered: 'Marked delivered',
}
const HISTORY_SHOWN = 4

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="ib-field row">
      <span className="body">{label}</span>
      <span className={strong ? 'headline' : 'body muted'}>{value}</span>
    </div>
  )
}

export default function Detail() {
  const { id } = useParams() as { id: string }
  const nav = useNavigate()
  const [s, setS] = useState<Shipment | null>()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [viewing, setViewing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pay, setPay] = useState(0)
  const [allHistory, setAllHistory] = useState(false)

  useEffect(() => watchShipment(id, setS), [id])
  useEffect(() => watchPhotos(id, setPhotos), [id])

  if (s === undefined) return null
  if (s === null) return <Navigate to="/" replace /> // deleted, possibly by someone else

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      alert('Could not save. Check your connection and try again.')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  function remove() {
    if (!confirm('Delete this shipment and its photos? This cannot be undone.')) return
    run(async () => { await deleteShipment(id); nav('/', { replace: true }) })
  }

  const next = NEXT[s.status]
  const back = BACK[s.status]
  const left = remaining(s)
  const history = [...s.history].reverse()

  return (
    <div className="page">
      <NavBar title="Shipment" onBack={() => nav('/')}
        trailing={<Button variant="plain" onClick={() => nav(`/s/${id}/edit`)}>Edit</Button>} />
      <main className="content">
        {photos.length > 0 && (
          <div className="strip">
            {photos.map((p, i) => (
              <button type="button" key={p.id} onClick={() => setViewing(p.data)}>
                <img src={p.data} alt={`Photo ${i + 1}`} />
              </button>
            ))}
          </div>
        )}
        <section>
          <h2 className="title-2 heading">{s.clientName}</h2>
          <div className="ib-card-meta">
            <StatusBadge status={s.status} /><TypeTag type={s.type} />
            {s.fullPrice > 0 && <span className={'ib-badge ' + (left ? 'ib-badge-pending' : 'ib-badge-delivered')}>{left ? 'Unpaid' : 'Paid'}</span>}
          </div>
          <p className="footnote muted meta-line">Logged {formatDateTime(s.createdAt.toDate())}</p>
        </section>
        <ContactActions phone={s.clientPhone} message={clientMessage(s)} />
        {s.address && (
          <FormGroup label="Address">
            <a className="ib-field row link" href={mapsUrl(s.address)} target="_blank" rel="noopener">
              <span className="body note">{s.address}</span>
              <Icon name="pin" />
            </a>
          </FormGroup>
        )}

        {s.type === 'parts' && s.description && (
          <FormGroup label="Car part"><div className="ib-field body note">{s.description}</div></FormGroup>
        )}
        {s.type === 'papers' && (
          <section>
            <FormGroup label={`Documents · ${s.docs.length}/${DOCS.length}`}>
              <div className="ib-field"><Progress value={s.docs.length} max={DOCS.length} /></div>
              {DOCS.map(d => {
                const has = s.docs.includes(d)
                return (
                  <button type="button" key={d} className={'ib-field check-row doc' + (has ? '' : ' missing')}
                    aria-pressed={has} disabled={busy} onClick={() => run(() => toggleDoc(s, d))}>
                    <Icon name={has ? 'check' : 'dash'} />
                    <span className="body">{d}</span>
                  </button>
                )
              })}
            </FormGroup>
            <p className="ib-help">Tap a document when you receive it.</p>
          </section>
        )}

        {s.fullPrice > 0 && (
          <section>
            <FormGroup label="Payment">
              <div className="ib-field"><Progress value={s.deposit} max={s.fullPrice} tone="delivered" /></div>
              <Row label="Full price" value={formatDA(s.fullPrice)} />
              <Row label="Paid so far" value={formatDA(s.deposit)} />
              <Row label="Remaining" value={left ? formatDA(left) : 'Paid'} strong />
              {left > 0 && (
                <div className="ib-field row">
                  <input inputMode="numeric" aria-label="Payment amount" placeholder="Amount received (DA)"
                    value={pay ? pay.toLocaleString('fr-FR') : ''} onChange={e => setPay(parseAmount(e.target.value))} />
                  <Button variant="plain" disabled={busy || !pay}
                    onClick={() => run(async () => { await addPayment(s, pay); setPay(0) })}>Add payment</Button>
                </div>
              )}
            </FormGroup>
            {left > 0 && (
              <div className="pay-hint">
                <span />
                <Button variant="plain" disabled={busy} onClick={() => run(() => markPaid(s))}>Mark fully paid</Button>
              </div>
            )}
          </section>
        )}

        {s.note && <FormGroup label="Remark"><div className="ib-field body note">{s.note}</div></FormGroup>}

        <section>
          <FormGroup label="History">
            {(allHistory ? history : history.slice(0, HISTORY_SHOWN)).map((h, i) => (
              <div className="ib-field" key={i}>
                <span className="body">{ACTION[h.action]}{h.detail && ` · ${h.detail}`} by {h.name ?? displayName(h.by)}</span>
                <span className="ib-field-label">{formatDateTime(h.at.toDate())}</span>
              </div>
            ))}
          </FormGroup>
          {!allHistory && history.length > HISTORY_SHOWN && (
            <div className="pay-hint">
              <span />
              <Button variant="plain" onClick={() => setAllHistory(true)}>Show all {history.length}</Button>
            </div>
          )}
        </section>
        <Button variant="destructive" block disabled={busy} onClick={remove}>Delete shipment</Button>
      </main>
      <ActionBar>
        {next && <Button block loading={busy} onClick={() => run(() => setStatus(id, next[0]))}>{next[1]}</Button>}
        {back && <Button variant="secondary" block disabled={busy} onClick={() => run(() => setStatus(id, back[0]))}>{back[1]}</Button>}
      </ActionBar>
      {viewing && (
        <button type="button" className="viewer" aria-label="Close photo" onClick={() => setViewing(null)}>
          <img src={viewing} alt="" />
        </button>
      )}
    </div>
  )
}
