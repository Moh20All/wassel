import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanupDelivered, DOCS, remaining, watchShipments, type Kind, type Shipment, type Status } from '../shipments'
import { ActionBar, Button, Icon, NavBar, SegmentedControl, ShipmentCard } from '../ui'
import { dayLabel, formatDA, matchesSearch, timeAgo } from '../utils'

type Filter = 'all' | Status
const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: 'all', label: 'All', empty: 'No shipments yet. Tap New shipment to log one.' },
  { value: 'pending', label: 'Pending', empty: 'Nothing pending.' },
  { value: 'arrived', label: 'Arrived', empty: 'Nothing arrived.' },
  { value: 'delivered', label: 'Done', empty: 'Nothing delivered.' },
]

// A tile with onClick is a shortcut to a filter; `active` shows that filter is on.
function Stat(p: { label: string; value: string | number; tone?: Status; onClick?: () => void; active?: boolean }) {
  const cls = 'stat' + (p.tone ? ' stat-' + p.tone : '')
  const body = <><span className="stat-value">{p.value}</span><span className="footnote stat-label">{p.label}</span></>
  return p.onClick
    ? <button type="button" className={cls} aria-pressed={p.active} onClick={p.onClick}>{body}</button>
    : <div className={cls}>{body}</div>
}

function Chip(p: { label: string; on: boolean; onClick: () => void }) {
  return <button type="button" className="chip" aria-pressed={p.on} onClick={p.onClick}>{p.label}</button>
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

function cardSub(s: Shipment) {
  const what = s.type === 'parts' ? s.description.split('\n')[0] : `${s.docs.length}/${DOCS.length} docs`
  const left = remaining(s)
  const money = s.fullPrice ? (left ? `${formatDA(left)} left` : 'Paid') : ''
  return [what, money].filter(Boolean).join(' · ') || s.clientPhone
}

export default function List() {
  const nav = useNavigate()
  const [items, setItems] = useState<Shipment[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<Kind | null>(null)
  const [unpaid, setUnpaid] = useState(false)

  useEffect(() => {
    cleanupDelivered().catch(console.error)
    return watchShipments(setItems, e => setError(e.message))
  }, [])

  const all = items ?? []
  const narrowed = all.filter(s =>
    (!kind || s.type === kind) && (!unpaid || remaining(s) > 0) &&
    matchesSearch(search, [s.clientName, s.address, s.description, s.note], s.clientPhone))
  const matching = (f: Filter) => narrowed.filter(s => f === 'all' || s.status === f)
  const count = (st: Status) => all.filter(s => s.status === st).length
  const toCollect = all.reduce((sum, s) => sum + remaining(s), 0)
  const collected = all.reduce((sum, s) => sum + Math.min(s.deposit, s.fullPrice), 0)
  const isNarrowed = !!search.trim() || !!kind || unpaid
  const toggleKind = (k: Kind) => setKind(kind === k ? null : k)

  return (
    <div className="page">
      <NavBar title="Shipments" large trailing={
        <button type="button" className="ib-btn ib-btn-plain" aria-label="Profile" onClick={() => nav('/profile')}>
          <Icon name="user" size={24} />
        </button>
      } />
      <main className="content">
        {!items && !error && <p className="empty">Loading…</p>}
        {items && (
          <>
            <div className="stats">
              <Stat label="Pending" value={count('pending')} tone="pending"
                active={filter === 'pending'} onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} />
              <Stat label="Arrived" value={count('arrived')} tone="arrived"
                active={filter === 'arrived'} onClick={() => setFilter(filter === 'arrived' ? 'all' : 'arrived')} />
              <Stat label="To collect" value={formatDA(toCollect)} active={unpaid} onClick={() => setUnpaid(!unpaid)} />
              <Stat label="Collected" value={formatDA(collected)} tone="delivered" />
            </div>
            <label className="search">
              <Icon name="search" size={18} />
              <input type="search" placeholder="Search name, phone, address, part" aria-label="Search shipments"
                value={search} onChange={e => setSearch(e.target.value)} />
            </label>
            <div className="chips">
              <Chip label="Parts" on={kind === 'parts'} onClick={() => toggleKind('parts')} />
              <Chip label="Papers" on={kind === 'papers'} onClick={() => toggleKind('papers')} />
              <Chip label="Unpaid" on={unpaid} onClick={() => setUnpaid(!unpaid)} />
            </div>
          </>
        )}
        <SegmentedControl value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ value: f.value, label: f.label, count: items ? matching(f.value).length : undefined }))} />
        {error && <p className="ib-help ib-help-error" role="alert">Could not load shipments: {error}</p>}
        {items && (matching(filter).length
          ? byDay(matching(filter)).map(g => (
              <section key={g.label}>
                <h3 className="ib-group-label">{g.label}</h3>
                <div className="list">
                  {g.items.map(s => (
                    <ShipmentCard key={s.id} clientName={s.clientName} type={s.type} status={s.status} photo={s.thumb}
                      time={timeAgo(s.createdAt.toDate())} sub={cardSub(s)} onClick={() => nav(`/s/${s.id}`)} />
                  ))}
                </div>
              </section>
            ))
          : (
            <div className="empty">
              <img src="/logos/wassel-mark.svg" alt="" width={56} height={56} />
              <p>{isNarrowed ? 'No shipments match.' : FILTERS.find(f => f.value === filter)!.empty}</p>
            </div>
          ))}
      </main>
      <ActionBar><Button block onClick={() => nav('/new')}>New shipment</Button></ActionBar>
    </div>
  )
}
