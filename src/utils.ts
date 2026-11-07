// Fallback name when a user hasn't set one on the Profile page: the part before "@".
export function displayName(email: string) {
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1)
}

// 120000 -> "120 000 DA"
export function formatDA(n: number) {
  return n.toLocaleString('fr-FR') + ' DA'
}

// "120 000" or "120000" typed in a field -> 120000
export function parseAmount(s: string) {
  return Number(s.replace(/\D/g, '')) || 0
}

export function toWhatsAppUrl(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) return 'https://wa.me/' + d.slice(2) // 00213... international prefix
  if (d.startsWith('0')) return 'https://wa.me/213' + d.slice(1) // local Algerian number
  return 'https://wa.me/' + d
}

// "Just now", "12 min ago", "3h ago", "Yesterday", "3 Nov"
export function timeAgo(date: Date, now = new Date()) {
  const min = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  if (min < 1440) return `${Math.floor(min / 60)}h ago`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// List section headers: "Today", "Yesterday", "Tuesday 3 Nov"
export function dayLabel(date: Date, now = new Date()) {
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

// "3 Nov 2026, 14:20"
export function formatDateTime(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// Shrinks a photo to a JPEG data URL so it fits in a Firestore doc (1 MiB limit).
export async function resizeImage(src: Blob | string, maxPx: number, quality = 0.7) {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    if (typeof src !== 'string') URL.revokeObjectURL(url)
  }
}
