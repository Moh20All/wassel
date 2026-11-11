// All Firestore access. Photos live in shipments/{id}/photos as JPEG data URLs.
// shortcut: photos stored in Firestore (no card for Storage yet); move to Firebase Storage if docs get slow or quota tight.
import {
  arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp,
  Timestamp, updateDoc, where, writeBatch, type DocumentSnapshot,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { displayName, formatDA, resizeImage } from './utils'

export type Status = 'pending' | 'arrived' | 'delivered'
export type Kind = 'papers' | 'parts'
export const DOCS = [
  'COC', 'CO', 'Environmental list', 'Blue card', 'Billing list', 'COC Trans', 'CI', 'Green book', 'Technical report',
]
export interface HistoryEntry {
  action: 'created' | 'edited' | 'paid' | 'payment' | 'doc' | Status
  detail?: string // payment amount, or which document changed
  by: string // email
  name?: string // name at the time; missing on entries written before profiles existed
  at: Timestamp
}
export interface Fields {
  type: Kind
  clientName: string
  clientPhone: string
  address: string
  description: string // parts only
  docs: string[] // papers only
  fullPrice: number
  deposit: number
  note: string
}
export interface Shipment extends Fields {
  id: string
  status: Status
  thumb: string | null
  createdAt: Timestamp
  deliveredAt: Timestamp | null
  history: HistoryEntry[]
}
export interface Photo { id: string; data: string } // id '' = not saved yet

export const remaining = (s: Fields) => Math.max(0, s.fullPrice - s.deposit)
export const myName = () => auth.currentUser!.displayName || displayName(auth.currentUser!.email!)

const shipments = collection(db, 'shipments')
const photosOf = (id: string) => collection(db, 'shipments', id, 'photos')

const entry = (action: HistoryEntry['action'], detail?: string): HistoryEntry =>
  ({ action, ...(detail && { detail }), by: auth.currentUser!.email!, name: myName(), at: Timestamp.now() })

const clean = (f: Fields): Fields => ({
  ...f,
  clientName: f.clientName.trim(),
  clientPhone: f.clientPhone.trim(),
  address: f.address.trim(),
  description: f.type === 'parts' ? f.description.trim() : '',
  docs: f.type === 'papers' ? f.docs : [],
  note: f.note.trim(),
})

// Defaults cover shipments saved before these fields existed.
const toShipment = (d: DocumentSnapshot) => ({
  address: '', description: '', docs: [], fullPrice: 0, deposit: 0, note: '',
  id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Partial<Shipment>),
}) as Shipment

export function watchShipments(onData: (s: Shipment[]) => void, onError: (e: Error) => void) {
  return onSnapshot(query(shipments, orderBy('createdAt', 'desc')), snap => onData(snap.docs.map(toShipment)), onError)
}

export function watchShipment(id: string, onData: (s: Shipment | null) => void) {
  return onSnapshot(doc(shipments, id), d => onData(d.exists() ? toShipment(d) : null))
}

export function watchPhotos(id: string, onData: (p: Photo[]) => void) {
  return onSnapshot(query(photosOf(id), orderBy('order')), snap =>
    onData(snap.docs.map(d => ({ id: d.id, data: d.get('data') }))))
}

export async function getShipment(id: string) {
  const d = await getDoc(doc(shipments, id))
  return d.exists() ? toShipment(d) : null
}

export async function getPhotos(id: string): Promise<Photo[]> {
  const snap = await getDocs(query(photosOf(id), orderBy('order')))
  return snap.docs.map(d => ({ id: d.id, data: d.get('data') }))
}

const makeThumb = (photos: Photo[]) => (photos[0] ? resizeImage(photos[0].data, 160) : null)

export async function createShipment(fields: Fields, photos: Photo[]) {
  const ref = doc(shipments)
  const batch = writeBatch(db)
  batch.set(ref, {
    ...clean(fields), status: 'pending', thumb: await makeThumb(photos),
    createdAt: serverTimestamp(), deliveredAt: null, history: [entry('created')],
  })
  photos.forEach((p, i) => batch.set(doc(photosOf(ref.id)), { data: p.data, order: Date.now() + i }))
  await batch.commit()
}

// `before` = photos as loaded; `photos` = what the form holds now (new ones have id '').
export async function updateShipment(id: string, fields: Fields, before: Photo[], photos: Photo[]) {
  const batch = writeBatch(db)
  batch.update(doc(shipments, id), { ...clean(fields), thumb: await makeThumb(photos), history: arrayUnion(entry('edited')) })
  before.filter(b => !photos.some(p => p.id === b.id)).forEach(b => batch.delete(doc(photosOf(id), b.id)))
  photos.filter(p => !p.id).forEach((p, i) => batch.set(doc(photosOf(id)), { data: p.data, order: Date.now() + i }))
  await batch.commit()
}

export function setStatus(id: string, status: Status) {
  return updateDoc(doc(shipments, id), {
    status,
    deliveredAt: status === 'delivered' ? serverTimestamp() : null,
    history: arrayUnion(entry(status)),
  })
}

export function markPaid(s: Shipment) {
  return updateDoc(doc(shipments, s.id), { deposit: s.fullPrice, history: arrayUnion(entry('paid')) })
}

// shortcut: adds to the deposit this device last saw, so two people adding a payment in the same second can lose one; use a transaction if that ever happens.
export function addPayment(s: Shipment, amount: number) {
  const deposit = Math.min(s.fullPrice, s.deposit + amount)
  return updateDoc(doc(shipments, s.id), { deposit, history: arrayUnion(entry('payment', formatDA(deposit - s.deposit))) })
}

export function toggleDoc(s: Shipment, name: string) {
  const has = s.docs.includes(name)
  return updateDoc(doc(shipments, s.id), {
    docs: has ? arrayRemove(name) : arrayUnion(name),
    history: arrayUnion(entry('doc', `${name} ${has ? 'removed' : 'received'}`)),
  })
}

export async function deleteShipment(id: string) {
  const batch = writeBatch(db)
  ;(await getDocs(photosOf(id))).forEach(p => batch.delete(p.ref))
  batch.delete(doc(shipments, id))
  await batch.commit()
}

// Client-side cleanup (no Cloud Functions): runs when the list opens.
// Only fully paid shipments go, so an unpaid balance is never lost.
export async function cleanupDelivered(days = 14) {
  const cutoff = Date.now() - days * 86400000
  const snap = await getDocs(query(shipments, where('status', '==', 'delivered')))
  for (const d of snap.docs) {
    const s = toShipment(d)
    if (s.deliveredAt && s.deliveredAt.toMillis() < cutoff && remaining(s) === 0) await deleteShipment(d.id)
  }
}
