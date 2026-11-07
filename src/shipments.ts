// All Firestore access. Photos live in shipments/{id}/photos as JPEG data URLs.
// shortcut: photos stored in Firestore (no card for Storage yet); move to Firebase Storage if docs get slow or quota tight.
import {
  arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp,
  Timestamp, updateDoc, where, writeBatch, type DocumentSnapshot,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { resizeImage } from './utils'

export type Status = 'pending' | 'arrived' | 'delivered'
export type Kind = 'papers' | 'parts'
export interface HistoryEntry { action: 'created' | 'edited' | Status; by: string; at: Timestamp }
export interface Fields { clientName: string; clientPhone: string; type: Kind; note: string }
export interface Shipment extends Fields {
  id: string
  status: Status
  thumb: string | null
  createdAt: Timestamp
  deliveredAt: Timestamp | null
  history: HistoryEntry[]
}
export interface Photo { id: string; data: string } // id '' = not saved yet

const shipments = collection(db, 'shipments')
const photosOf = (id: string) => collection(db, 'shipments', id, 'photos')

const entry = (action: HistoryEntry['action']): HistoryEntry =>
  ({ action, by: auth.currentUser!.email!, at: Timestamp.now() })

const clean = (f: Fields): Fields =>
  ({ ...f, clientName: f.clientName.trim(), clientPhone: f.clientPhone.trim(), note: f.note.trim() })

const toShipment = (d: DocumentSnapshot) =>
  ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }) as Shipment

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

export async function deleteShipment(id: string) {
  const batch = writeBatch(db)
  ;(await getDocs(photosOf(id))).forEach(p => batch.delete(p.ref))
  batch.delete(doc(shipments, id))
  await batch.commit()
}

// Client-side cleanup (no Cloud Functions): runs when the list opens.
export async function cleanupDelivered(days = 14) {
  const cutoff = Date.now() - days * 86400000
  const snap = await getDocs(query(shipments, where('status', '==', 'delivered')))
  for (const d of snap.docs) {
    const at = d.get('deliveredAt') as Timestamp | null
    if (at && at.toMillis() < cutoff) await deleteShipment(d.id)
  }
}
