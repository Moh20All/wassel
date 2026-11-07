import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { cleanupDelivered, watchShipments, type Shipment, type Status } from '../shipments'
import { ActionBar, Button, NavBar, SegmentedControl, ShipmentCard } from '../ui'
import { timeAgo } from '../utils'

type Filter = 'all' | Status
const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: 'all', label: 'All', empty: 'No shipments yet. Tap New shipment to log one.' },
  { value: 'pending', label: 'Pending', empty: 'Nothing pending.' },
  { value: 'arrived', label: 'Arrived', empty: 'Nothing arrived.' },
  { value: 'delivered', label: 'Done', empty: 'Nothing delivered.' },
]

export default function List() {
  const nav = useNavigate()
  const [items, setItems] = useState<Shipment[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    cleanupDelivered().catch(console.error)
    return watchShipments(setItems, e => setError(e.message))
  }, [])

  const matching = (f: Filter) => (items ?? []).filter(s => f === 'all' || s.status === f)
  const shown = matching(filter)

  return (
    <div className="page">
      <NavBar title="Shipments" large trailing={<Button variant="plain" onClick={() => signOut(auth)}>Log out</Button>} />
      <main className="content">
        <SegmentedControl value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ value: f.value, label: f.label, count: items ? matching(f.value).length : undefined }))} />
        {error && <p className="ib-help ib-help-error" role="alert">Could not load shipments: {error}</p>}
        {items && (shown.length
          ? <div className="list">
              {shown.map(s => (
                <ShipmentCard key={s.id} clientName={s.clientName} type={s.type} status={s.status} photo={s.thumb}
                  time={timeAgo(s.createdAt.toDate())} onClick={() => nav(`/s/${s.id}`)} />
              ))}
            </div>
          : <p className="empty">{FILTERS.find(f => f.value === filter)!.empty}</p>)}
      </main>
      <ActionBar><Button block onClick={() => nav('/new')}>New shipment</Button></ActionBar>
    </div>
  )
}
