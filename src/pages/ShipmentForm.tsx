// New shipment (/new) and edit (/s/:id/edit).
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createShipment, getPhotos, getShipment, updateShipment, type Fields, type Photo } from '../shipments'
import { ActionBar, Button, FormGroup, Icon, NavBar, PhotoPicker, SegmentedControl, TextField } from '../ui'
import { resizeImage } from '../utils'

const EMPTY: Fields = { clientName: '', clientPhone: '', type: 'papers', note: '' }
const MAX_PHOTOS = 3

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
  const set = (k: keyof Fields) => (v: string) => setFields(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!id) return
    Promise.all([getShipment(id), getPhotos(id)]).then(([s, ph]) => {
      if (!s) return nav('/', { replace: true })
      setFields({ clientName: s.clientName, clientPhone: s.clientPhone, type: s.type, note: s.note })
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
    if (!fields.clientName.trim() || !fields.clientPhone.trim()) return setError('Add the client name and phone number.')
    if (!photos.length) return setError('Add at least one photo.')
    setBusy(true)
    setError('')
    try {
      if (id) {
        await updateShipment(id, fields, before, photos)
        nav(`/s/${id}`, { replace: true })
      } else {
        await createShipment(fields, photos)
        setFields(EMPTY)
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

  return (
    <form className="page" onSubmit={submit}>
      <NavBar title={id ? 'Edit shipment' : 'New shipment'} large={!id} onBack={() => nav(id ? `/s/${id}` : '/')} />
      <main className="content">
        <FormGroup label="Client">
          <TextField label="Client name" value={fields.clientName} onChange={set('clientName')} />
          <TextField label="Phone number" type="tel" placeholder="0555 12 34 56" value={fields.clientPhone} onChange={set('clientPhone')} />
        </FormGroup>
        <FormGroup label="Type">
          <div className="ib-field">
            <SegmentedControl label="Type" value={fields.type} onChange={set('type')}
              options={[{ value: 'papers', label: 'Papers' }, { value: 'parts', label: 'Parts' }]} />
          </div>
        </FormGroup>
        <section>
          <h3 className="ib-group-label">Photos</h3>
          <PhotoPicker photos={photos.map(p => p.data)} max={MAX_PHOTOS} onAdd={addPhotos}
            onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
        </section>
        <FormGroup label="Note">
          <TextField label="Note" optional multiline value={fields.note} onChange={set('note')} />
        </FormGroup>
        {error && <p className="ib-help ib-help-error" role="alert">{error}</p>}
      </main>
      <ActionBar><Button type="submit" block loading={busy}>{id ? 'Save changes' : 'Submit shipment'}</Button></ActionBar>
      {toast && <div className="toast" role="status"><Icon name="check" />Shipment logged</div>}
    </form>
  )
}
