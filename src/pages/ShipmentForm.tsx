// New shipment (/new) and edit (/s/:id/edit). Parts and Papers share the form; the middle section switches.
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createShipment, DOCS, getPhotos, getShipment, updateShipment, watchShipments, type Fields, type Photo, type Shipment,
} from '../shipments'
import { ActionBar, Button, FormGroup, Icon, NavBar, PhotoPicker, SegmentedControl, TextField } from '../ui'
import { formatDA, parseAmount, resizeImage } from '../utils'

const EMPTY: Fields = {
  type: 'parts', clientName: '', clientPhone: '', address: '', description: '', docs: [], fullPrice: 0, deposit: 0, note: '',
}
const MAX_PHOTOS = 3

function validate(f: Fields) {
  if (!f.clientName.trim() || !f.clientPhone.trim()) return 'Add the client name and phone number.'
  if (!f.address.trim()) return 'Add the client address.'
  if (f.type === 'parts' && !f.description.trim()) return 'Describe the car part.'
  if (!f.fullPrice) return 'Add the full price.'
  if (f.deposit > f.fullPrice) return 'The deposit cannot be more than the full price.'
  return ''
}

export default function ShipmentForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [fields, setFields] = useState(EMPTY)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [before, setBefore] = useState<Photo[]>([])
  const [loaded, setLoaded] = useState(!id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(false)
  const set = <K extends keyof Fields>(k: K) => (v: Fields[K]) => setFields(f => ({ ...f, [k]: v }))
  const amount = (k: 'fullPrice' | 'deposit') => (v: string) => set(k)(parseAmount(v))
  const toggleDoc = (d: string) => set('docs')(fields.docs.includes(d) ? fields.docs.filter(x => x !== d) : [...fields.docs, d])

  // Returning clients: picking a known name fills the phone and address if they are still empty.
  const [known, setKnown] = useState<Shipment[]>([])
  useEffect(() => watchShipments(setKnown, console.error), [])
  function setName(v: string) {
    const c = known.find(k => k.clientName === v)
    setFields(f => ({ ...f, clientName: v, clientPhone: f.clientPhone || c?.clientPhone || '', address: f.address || c?.address || '' }))
  }

  useEffect(() => {
    if (!id) return
    Promise.all([getShipment(id), getPhotos(id)]).then(([s, ph]) => {
      if (!s) return nav('/', { replace: true })
      const { type, clientName, clientPhone, address, description, docs, fullPrice, deposit, note } = s
      setFields({ type, clientName, clientPhone, address, description, docs, fullPrice, deposit, note })
      setPhotos(ph)
      setBefore(ph)
      setLoaded(true)
    }, e => setError(e.message))
  }, [id, nav])

  async function addPhotos(files: File[]) {
    try {
      const data = await Promise.all(files.slice(0, MAX_PHOTOS - photos.length).map(f => resizeImage(f, 1280)))
      setPhotos(p => [...p, ...data.map(d => ({ id: '', data: d }))].slice(0, MAX_PHOTOS))
    } catch {
      setError('Could not read that photo. Try another one.')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validate(fields)
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      if (id) {
        await updateShipment(id, fields, before, photos)
        nav(`/s/${id}`, { replace: true })
      } else {
        await createShipment(fields, photos)
        setFields({ ...EMPTY, type: fields.type })
        setPhotos([])
        setToast(true)
        setTimeout(() => setToast(false), 2500)
      }
    } catch (err) {
      console.error(err)
      setError('Could not save. Check your connection and tap again.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return error ? <p className="ib-help ib-help-error">{error}</p> : null

  const left = fields.fullPrice - fields.deposit

  return (
    <form className="page" onSubmit={submit}>
      <NavBar title={id ? 'Edit shipment' : 'New shipment'} large={!id} onBack={() => nav(id ? `/s/${id}` : '/')} />
      <main className="content">
        <SegmentedControl label="Type" value={fields.type} onChange={set('type')}
          options={[{ value: 'parts', label: 'Parts' }, { value: 'papers', label: 'Papers' }]} />

        <FormGroup label="Client">
          <TextField label="Client name" list="known-clients" value={fields.clientName} onChange={setName} />
          <datalist id="known-clients">
            {[...new Set(known.map(k => k.clientName))].map(n => <option key={n} value={n} />)}
          </datalist>
          <TextField label="Phone number" type="tel" placeholder="0555 12 34 56" value={fields.clientPhone} onChange={set('clientPhone')} />
          <TextField label="Address" autoComplete="street-address" value={fields.address} onChange={set('address')} />
        </FormGroup>

        {fields.type === 'parts' ? (
          <FormGroup label="Car part">
            <TextField label="Description" multiline placeholder="e.g. Front bumper, Golf 8, black"
              value={fields.description} onChange={set('description')} />
          </FormGroup>
        ) : (
          <FormGroup label={`Documents · ${fields.docs.length}/${DOCS.length}`}>
            {DOCS.map(d => (
              <label className="ib-field check-row" key={d}>
                <input type="checkbox" checked={fields.docs.includes(d)} onChange={() => toggleDoc(d)} />
                <span className="body">{d}</span>
              </label>
            ))}
          </FormGroup>
        )}

        <section>
          <FormGroup label="Payment">
            <TextField label="Full price (DA)" inputMode="numeric" placeholder="0"
              value={fields.fullPrice ? fields.fullPrice.toLocaleString('fr-FR') : ''} onChange={amount('fullPrice')} />
            <TextField label="Deposit (DA)" inputMode="numeric" placeholder="0"
              value={fields.deposit ? fields.deposit.toLocaleString('fr-FR') : ''} onChange={amount('deposit')} />
          </FormGroup>
          {fields.fullPrice > 0 && (
            <div className="pay-hint">
              <span className="ib-help">{left > 0 ? `${formatDA(left)} left to pay` : left === 0 ? 'Paid in full' : ''}</span>
              {left > 0 && <Button variant="plain" onClick={() => set('deposit')(fields.fullPrice)}>Paid in full</Button>}
            </div>
          )}
        </section>

        <FormGroup label="Remark">
          <TextField label="Remark" optional multiline value={fields.note} onChange={set('note')} />
        </FormGroup>

        <section>
          <h3 className="ib-group-label">Photos (optional)</h3>
          <PhotoPicker photos={photos.map(p => p.data)} max={MAX_PHOTOS} onAdd={addPhotos}
            onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
        </section>

        {error && <p className="ib-help ib-help-error" role="alert">{error}</p>}
      </main>
      <ActionBar><Button type="submit" block loading={busy}>{id ? 'Save changes' : 'Submit shipment'}</Button></ActionBar>
      {toast && <div className="toast" role="status"><Icon name="check" />Shipment logged</div>}
    </form>
  )
}
