import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanupDelivered, remaining, watchShipments, type Shipment, type Status } from '../shipments'
import { ActionBar, Button, Icon, NavBar, SegmentedControl, ShipmentCard } from '../ui'
import { dayLabel, formatDA, timeAgo } from '../utils'

type Filter = 'all' | Status
const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: 'all', label: 'All', empty: 'No shipments yet. Tap New shipment to log one.' },
  { value: 'pending', label: 'Pending', empty: 'Nothing pending.' },
  { value: 'arrived', label: 'Arrived', empty: 'Nothing arrived.' },
  { value: 'delivered', label: 'Done', empty: 'Nothing delivered.' },
]

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: Status }) {
  return (
    <div className={'stat' + (tone ? ' stat-' + tone : '')}>
      <span className="stat-value">{value}</span>
      <span className="footnote stat-label">{label}</span>
    </div>
  )
}

// Newest first in, consecutive day groups out.
function byDay(items: Shipment[]) {
  const groups: { label: string; items: Shipment[] }[] = []
  for (const s of items) {
    const label = dayLabel(s.createdAt.toDate())
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] })
    groups.at(-1)!.items.push(s)
  }
  return groups
}

export default function List() {
  const nav = useNavigate()
  const [items, setItems] = useState<Shipment[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    cleanupDelivered().catch(console.error)
    return watchShipments(setItems, e => setError(e.message))
  }, [])

  const all = items ?? []
  const matching = (f: Filter) => all.filter(s => f === 'all' || s.status === f)
  const toCollect = all.reduce((sum, s) => sum + remaining(s), 0)
  const collected = all.reduce((sum, s) => sum + Math.min(s.deposit, s.fullPrice), 0)

  return (
    <div className="page">
      <NavBar title="Shipments" large trailing={
        <button type="button" className="ib-btn ib-btn-plain" aria-label="Profile" onClick={() => nav('/profile')}>
          <Icon name="user" size={24} />
        </button>
      } />
      <main className="content">
        {items && (
          <div className="stats">
            <Stat label="Pending" value={matching('pending').length} tone="pending" />
            <Stat label="Arrived" value={matching('arrived').length} tone="arrived" />
            <Stat label="To collect" value={formatDA(toCollect)} />
            <Stat label="Collected" value={formatDA(collected)} tone="delivered" />
          </div>
        )}
        <SegmentedControl value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ value: f.value, label: f.label, count: items ? matching(f.value).length : undefined }))} />
        {error && <p className="ib-help ib-help-error" role="alert">Could not load shipments: {error}</p>}
        {items && (matching(filter).length
          ? byDay(matching(filter)).map(g => (
              <section key={g.label}>
                <h3 className="ib-group-label">{g.label}</h3>
                <div className="list">
                  {g.items.map(s => {
                    const left = remaining(s)
                    return (
                      <ShipmentCard key={s.id} clientName={s.clientName} type={s.type} status={s.status} photo={s.thumb}
                        time={timeAgo(s.createdAt.toDate())} onClick={() => nav(`/s/${s.id}`)}
                        sub={s.fullPrice ? (left ? `${formatDA(left)} left` : 'Paid') : s.clientPhone} />
                    )
                  })}
                </div>
              </section>
            ))
          : (
            <div className="empty">
              <img src="/logos/wassel-mark.svg" alt="" width={56} height={56} />
              <p>{FILTERS.find(f => f.value === filter)!.empty}</p>
            </div>
          ))}
      </main>
      <ActionBar><Button block onClick={() => nav('/new')}>New shipment</Button></ActionBar>
    </div>
  )
}
