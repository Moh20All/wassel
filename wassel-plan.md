# Wassel — Technical Build Plan

> Car import agency shipment tracker — China logs arrivals, Moha sees live updates on his phone.  
> No App Store. No servers. Near-zero cost.

**Stack:** React + Vite + TypeScript · Firebase (Auth + Firestore + Storage) · Tailwind CSS · PWA

---

## 1. App Concept

### Two users, two views

| User | Email | View |
|------|-------|------|
| China side | `china@wassel.app` | Log new shipment (form) |
| Moha (agency) | `moha@wassel.app` | Live pending arrivals list |

### Status lifecycle

```
pending → arrived → delivered
```

Auto-delete delivered shipments after 14 days (client-side, no Cloud Functions).

### App name

**Wassel** (وصّل) — "to deliver / to connect". Used as PWA title, manifest name, and icon label.

---

## 2. Tech Stack

| Package | Role | Notes |
|---------|------|-------|
| `react` + `react-dom` | UI rendering | v18, with `react-router-dom` v6 |
| `vite` | Build tool | HMR dev server, fast builds |
| `vite-plugin-pwa` | PWA manifest + service worker | Uses Workbox |
| `tailwindcss` | Utility styling | Maps to design-system CSS tokens |
| `typescript` | Type safety | Strict mode |
| `firebase` | Backend | Auth + Firestore + Storage |

> **Firebase plan:** Blaze (pay-as-you-go) required for Firebase Storage since Feb 2026.  
> Link a card — stays at **$0** within free quota (5 GB storage, 1 GB/day download).  
> Firestore + Auth remain free.

---

## 3. Design System Setup

Copy these files from `wassel-design-system.zip` into the project:

```
src/styles/tokens.css         ← zip: tokens.css
src/theme.ts                  ← zip: starter/theme.ts
public/manifest.webmanifest   ← zip: starter/public/manifest.webmanifest
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-maskable-512.png
public/icons/apple-touch-icon.png   ← all from zip: starter/public/icons/
```

### index.html — paste into `<head>`

From `starter/index-head.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Wassel">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

### tailwind.config.js

Copy from `starter/tailwind.config.js`:

```js
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: { extend: {
    colors: {
      grouped:    'var(--bg-grouped)',
      surface:    'var(--surface)',
      'surface-2':'var(--surface-2)',
      accent:    { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)', ink: 'var(--accent-ink)' },
      pending:   { DEFAULT: 'var(--pending)',  soft: 'var(--pending-soft)',  ink: 'var(--pending-ink)'  },
      arrived:   { DEFAULT: 'var(--arrived)',  soft: 'var(--arrived-soft)',  ink: 'var(--arrived-ink)'  },
      delivered: { DEFAULT: 'var(--delivered)',soft: 'var(--delivered-soft)',ink: 'var(--delivered-ink)' },
      danger:    { DEFAULT: 'var(--danger)',   ink: 'var(--danger-ink)' },
    },
    borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
    fontFamily: { sans: 'var(--font-sans)' },
    maxWidth:   { app: 'var(--layout-max)' },
  }}
};
```

---

## 4. Project File Structure

```
wassel/
├── public/
│   ├── manifest.webmanifest
│   └── icons/                      (4 PNG icons from zip)
├── src/
│   ├── styles/
│   │   └── tokens.css
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── Button.tsx
│   │   ├── TextField.tsx
│   │   ├── FormGroup.tsx
│   │   ├── SegmentedControl.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── TypeTag.tsx
│   │   ├── ShipmentCard.tsx
│   │   ├── PhotoPicker.tsx
│   │   ├── ContactActions.tsx
│   │   └── ActionBar.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── ChinaForm.tsx
│   │   ├── AgencyList.tsx
│   │   └── AgencyDetail.tsx
│   ├── firebase.ts
│   ├── theme.ts
│   ├── types.ts
│   ├── utils.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.local                      (VITE_FIREBASE_* keys — never commit)
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## 5. Firebase Config

### .env.local

```env
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=wassel-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wassel-xxx
VITE_FIREBASE_STORAGE_BUCKET=wassel-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000
VITE_FIREBASE_APP_ID=1:000:web:xxx
```

> ⚠️ Add `.env.local` to `.gitignore` before first commit.

### src/firebase.ts

```ts
import { initializeApp }  from 'firebase/app'
import { getAuth }        from 'firebase/auth'
import { getFirestore }   from 'firebase/firestore'
import { getStorage }     from 'firebase/storage'

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)
```

### Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shipments/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Firebase Storage rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /shipments/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 6. Core Types

```ts
// src/types.ts
export type ShipmentStatus = 'pending' | 'arrived' | 'delivered'
export type ShipmentType   = 'papers'  | 'parts'

export interface Shipment {
  id:          string
  clientName:  string
  clientPhone: string
  type:        ShipmentType
  photos:      string[]      // Firebase Storage download URLs
  note:        string
  status:      ShipmentStatus
  createdAt:   Date
  deliveredAt: Date | null
}
```

---

## 7. Auth & Routing

Role is determined by which email is logged in:

| Email | Role | Lands on |
|-------|------|----------|
| `china@wassel.app` | Sender (China) | `/form` — log new shipment |
| `moha@wassel.app` | Agency | `/arrivals` — live list |

```ts
// src/App.tsx
const CHINA_EMAIL  = 'china@wassel.app'
const AGENCY_EMAIL = 'moha@wassel.app'

// After signInWithEmailAndPassword resolves:
if (user.email === CHINA_EMAIL)  navigate('/form')
if (user.email === AGENCY_EMAIL) navigate('/arrivals')

// Route guard
function RequireAuth({ children, role }) {
  const user = useAuthState()
  if (!user) return <Navigate to="/" />
  if (role === 'china'  && user.email !== CHINA_EMAIL)  return <Navigate to="/" />
  if (role === 'agency' && user.email !== AGENCY_EMAIL) return <Navigate to="/" />
  return children
}
```

---

## 8. Components

| Component | Props | Description |
|-----------|-------|-------------|
| `NavBar` | `title`, `onAction?` | Top bar with optional logout icon |
| `Button` | `variant: primary\|danger\|ghost`, `loading?` | Full-width pill button |
| `TextField` | `label`, `error?`, `multiline?` | Labeled input or textarea |
| `FormGroup` | `children` | Surface card wrapper for form fields |
| `SegmentedControl` | `value: ShipmentType`, `onChange` | Two-chip selector: Papers / Parts |
| `StatusBadge` | `status: ShipmentStatus` | Colored pill: amber / blue / green |
| `TypeTag` | `type: ShipmentType` | Small "Papers" or "Parts" tag |
| `ShipmentCard` | `shipment`, `onClick` | List card: name, type, status, date |
| `PhotoPicker` | `photos: File[]`, `onChange`, `max?` | Grid of photo slots, compresses before upload |
| `ContactActions` | `phone`, `name` | Phone as text + WhatsApp button |
| `ActionBar` | `primary`, `secondary?` | Fixed bottom bar, respects safe-area-inset-bottom |

---

## 9. Pages

### Login `/`

- Wassel logo + app name centered
- Email + password fields → `signInWithEmailAndPassword`
- On success: redirect based on email role
- Show inline error on wrong credentials

### ChinaForm `/form` _(China only)_

- **Client Name** — TextField, required
- **Client Phone** — TextField, type=tel, required
- **Shipment Type** — SegmentedControl (papers / parts)
- **Photos** — PhotoPicker, up to 3, compress before upload
- **Note** — TextField multiline, optional
- Submit → upload photos to Storage, write doc to Firestore `/shipments`, reset form

### AgencyList `/arrivals` _(Agency only)_

- Real-time `onSnapshot` listener on `/shipments` ordered by `createdAt desc`
- Filter chips: All / Pending / Arrived / Delivered
- Renders `ShipmentCard` list; tap → `/detail/:id`
- On mount: delete delivered shipments older than 14 days

### AgencyDetail `/detail/:id` _(Agency only)_

- Load shipment by ID from Firestore
- Photo strip (horizontal scroll), StatusBadge, TypeTag, note
- ContactActions with client phone + WhatsApp link
- ActionBar:
  - If **pending** → "Mark Arrived" (accent) → sets status to `arrived`
  - If **arrived** → "Mark Delivered" (green) → sets status to `delivered`, writes `deliveredAt`
  - If **delivered** → bar hidden

---

## 10. Key Utilities

### Photo compression — `src/utils.ts`

```ts
export function resizeImage(file: File, maxPx = 1600): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.8)
    }
    img.src = URL.createObjectURL(file)
  })
}
```

### WhatsApp deep link — `src/utils.ts`

```ts
export function toWhatsAppUrl(phone: string): string {
  const digits     = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('0')
    ? '213' + digits.slice(1)   // 0555123456 → 213555123456
    : digits
  return `https://wa.me/${normalized}`
}
```

### 14-day cleanup — `AgencyList.tsx`

```ts
async function cleanupOldDelivered() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const q = query(
    collection(db, 'shipments'),
    where('status',      '==', 'delivered'),
    where('deliveredAt', '<',  cutoff)
  )
  const snap = await getDocs(q)
  snap.forEach(d => deleteDoc(d.ref))
}
```

### Dark mode init — `src/main.tsx`

```ts
import { applyTheme } from './theme'
applyTheme()   // reads localStorage 'theme' or falls back to OS pref

ReactDOM.createRoot(document.getElementById('root')!)
  .render(<App />)
```

---

## 11. PWA Config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import { VitePWA }      from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,  // we provide public/manifest.webmanifest ourselves
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
          handler: 'CacheFirst',
          options: { cacheName: 'firebase-photos', expiration: { maxEntries: 100 } }
        }]
      }
    })
  ]
})
```

> **Installing on iPhone:** Safari → Share → "Add to Home Screen". No App Store needed.

---

## 12. Bootstrap Commands

```bash
# 1. Create Vite project
npm create vite@latest wassel -- --template react-ts
cd wassel

# 2. Install dependencies
npm install firebase react-router-dom
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p

# 3. Copy design system files from zip into place
#    tokens.css → src/styles/
#    theme.ts   → src/
#    icons      → public/icons/
#    manifest.webmanifest → public/

# 4. Dev server
npm run dev

# 5. Production build
npm run build
```

---

## 13. Firebase Console Checklist

One-time manual steps before first deploy:

- [ ] **Create Firebase project** — console.firebase.google.com → Add project → name: wassel
- [ ] **Upgrade to Blaze plan** — Project Settings → Upgrade → link a card (stays $0 within quotas)
- [ ] **Enable Email/Password Auth** — Authentication → Sign-in method → Email/Password → Enable
- [ ] **Create two users** — Authentication → Users → Add user:
  - `china@wassel.app` with a strong password
  - `moha@wassel.app` with a strong password
- [ ] **Create Firestore database** — Firestore → Create database → Production mode → region: europe-west (closest to Algeria)
- [ ] **Publish Firestore rules** — paste rules from section 5 → Publish
- [ ] **Enable Storage & publish rules** — Storage → Get started → paste storage rules → Publish
- [ ] **Register Web app → copy config** — Project Settings → Add app → Web → copy config → paste into `.env.local`
- [ ] **Deploy to Firebase Hosting** _(optional)_ — `npm install -g firebase-tools` → `firebase init hosting` → `firebase deploy`

---

## 14. Design Rules

| Rule | Detail |
|------|--------|
| No hardcoded colors | Every color from a token in `tokens.css` |
| Dark mode automatic | Handled by `[data-theme="dark"]` + `prefers-color-scheme` in tokens |
| Status color pairs | Use `--pending` + `--pending-ink` together, never mix across statuses |
| Bottom safe area | Fixed bottom elements: add `padding-bottom: env(safe-area-inset-bottom, 0)` |
| Minimum tap target | 44px — use `var(--tap-min)` for buttons and icon hit areas |
| Photo compression | Canvas resize max 1600px, JPEG 0.8 before every upload |
| Auto-cleanup | Delete delivered shipments older than 14 days on `AgencyList` mount |
| Max layout width | `var(--layout-max)` = 430px, centered |
