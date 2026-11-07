import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { deleteShipment, setStatus, watchPhotos, watchShipment, type HistoryEntry, type Photo, type Shipment, type Status } from '../shipments'
import { ActionBar, Button, ContactActions, FormGroup, NavBar, StatusBadge, TypeTag } from '../ui'
import { displayName, formatDateTime } from '../utils'

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
  created: 'Logged', edited: 'Edited', pending: 'Moved to pending', arrived: 'Marked arrived', delivered: 'Marked delivered',
}

export default function Detail() {
  const { id } = useParams() as { id: string }
  const nav = useNavigate()
  const [s, setS] = useState<Shipment | null>()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [viewing, setViewing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
          <div className="ib-card-meta"><StatusBadge status={s.status} /><TypeTag type={s.type} /></div>
        </section>
        <ContactActions phone={s.clientPhone} />
        {s.note && <FormGroup label="Note"><div className="ib-field body note">{s.note}</div></FormGroup>}
        <FormGroup label="History">
          {[...s.history].reverse().map((h, i) => (
            <div className="ib-field" key={i}>
              <span className="body">{ACTION[h.action]} by {displayName(h.by)}</span>
              <span className="ib-field-label">{formatDateTime(h.at.toDate())}</span>
            </div>
          ))}
        </FormGroup>
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
