import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { myName, remaining, watchShipments, type Shipment } from '../shipments'
import { Button, FormGroup, NavBar, SegmentedControl, TextField } from '../ui'
import { applyTheme } from '../theme'
import { formatDateTime, toCsv } from '../utils'

type Theme = 'system' | 'light' | 'dark'

function readTheme(): Theme {
  try { return (localStorage.getItem('theme') as Theme) || 'system' } catch { return 'system' }
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ib-field row">
      <span className="body">{label}</span>
      <span className="body muted">{value}</span>
    </div>
  )
}

function exportCsv(items: Shipment[]) {
  const rows = [
    ['Logged', 'Type', 'Status', 'Client', 'Phone', 'Address', 'Part / documents', 'Full price', 'Deposit', 'Remaining', 'Remark'],
    ...items.map(s => [
      formatDateTime(s.createdAt.toDate()), s.type, s.status, s.clientName, s.clientPhone, s.address,
      s.type === 'parts' ? s.description : s.docs.join(', '), s.fullPrice, s.deposit, remaining(s), s.note,
    ]),
  ]
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `wassel-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Profile() {
  const nav = useNavigate()
  const user = auth.currentUser!
  const [name, setName] = useState(myName())
  const [saved, setSaved] = useState(myName())
  const [busy, setBusy] = useState(false)
  const [theme, setTheme] = useState(readTheme)
  const [items, setItems] = useState<Shipment[]>([])

  useEffect(() => watchShipments(setItems, console.error), [])

  async function saveName() {
    setBusy(true)
    try {
      await updateProfile(user, { displayName: name.trim() })
      setSaved(name.trim())
    } catch (err) {
      console.error(err)
      alert('Could not save. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  function pickTheme(t: Theme) {
    setTheme(t)
    try { localStorage.setItem('theme', t) } catch { /* private mode: theme just won't persist */ }
    applyTheme(t)
  }

  const did = (action: string) =>
    items.reduce((n, s) => n + s.history.filter(h => h.by === user.email && h.action === action).length, 0)
  const oldestPending = items.filter(s => s.status === 'pending').at(-1) // list is newest first
  const waitingDays = oldestPending ? Math.floor((Date.now() - oldestPending.createdAt.toMillis()) / 86400000) : 0

  return (
    <div className="page">
      <NavBar title="Profile" onBack={() => nav('/')} />
      <main className="content">
        <section>
          <FormGroup label="You">
            <TextField label="Name" value={name} onChange={setName} />
            <div className="ib-field">
              <span className="ib-field-label">Email</span>
              <span className="body">{user.email}</span>
            </div>
          </FormGroup>
          {name.trim() && name.trim() !== saved && (
            <div className="pay-hint">
              <span className="ib-help">Shown in shipment history.</span>
              <Button variant="plain" loading={busy} onClick={saveName}>Save name</Button>
            </div>
          )}
        </section>

        <FormGroup label="Your activity">
          <div className="stats stats-inline">
            <div className="stat"><span className="stat-value">{did('created')}</span><span className="footnote stat-label">Logged</span></div>
            <div className="stat"><span className="stat-value">{did('arrived')}</span><span className="footnote stat-label">Marked arrived</span></div>
            <div className="stat"><span className="stat-value">{did('delivered')}</span><span className="footnote stat-label">Delivered</span></div>
          </div>
        </FormGroup>

        <section>
          <FormGroup label="Overview">
            <Row label="Shipments" value={items.length} />
            <Row label="Parts" value={items.filter(s => s.type === 'parts').length} />
            <Row label="Papers" value={items.filter(s => s.type === 'papers').length} />
            <Row label="Unpaid" value={items.filter(s => remaining(s) > 0).length} />
            <Row label="Clients" value={new Set(items.map(s => s.clientPhone.replace(/\D/g, ''))).size} />
            {oldestPending && <Row label="Longest wait" value={`${oldestPending.clientName} · ${waitingDays} days`} />}
          </FormGroup>
          <div className="pay-hint">
            <span className="ib-help">A spreadsheet of every shipment.</span>
            <Button variant="plain" disabled={!items.length} onClick={() => exportCsv(items)}>Export CSV</Button>
          </div>
        </section>

        <section>
          <h3 className="ib-group-label">Appearance</h3>
          <SegmentedControl label="Theme" value={theme} onChange={pickTheme}
            options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </section>

        <Button variant="destructive" block onClick={() => signOut(auth)}>Log out</Button>
      </main>
    </div>
  )
}
