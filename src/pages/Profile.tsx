import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { myName, watchShipments, type Shipment } from '../shipments'
import { Button, FormGroup, NavBar, SegmentedControl, TextField } from '../ui'
import { applyTheme } from '../theme'

type Theme = 'system' | 'light' | 'dark'

function readTheme(): Theme {
  try { return (localStorage.getItem('theme') as Theme) || 'system' } catch { return 'system' }
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
          <h3 className="ib-group-label">Appearance</h3>
          <SegmentedControl label="Theme" value={theme} onChange={pickTheme}
            options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </section>

        <Button variant="destructive" block onClick={() => signOut(auth)}>Log out</Button>
      </main>
    </div>
  )
}
