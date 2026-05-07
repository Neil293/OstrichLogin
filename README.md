# OstrichLogin

A secure, mobile-first PWA for Fairy Meadow Plumbing field staff to access IRT facility information — sign-in URLs, door/access codes, addresses, and navigation — from any phone or tablet.

**Live app:** `https://neil293.github.io/OstrichLogin/`

---

## Features

- 🔐 **Secure login** — SHA-256 hashed passwords, session persistence
- 🏢 **35 IRT sites** pre-loaded — aged care, retirement villages, community facilities
- 🔑 **Door & access codes** — one-tap copy to clipboard
- 🔗 **Sign In / Out** — direct link to ComplyMe sign-in for each site
- 🧭 **GPS navigation** — sorts list by distance from your current location, launches native Maps app
- 📷 **QR code scanner** — scan ComplyMe QR codes directly into the sign-in URL field
- ☁️ **Firebase sync** — real-time sync across all devices
- 💾 **Backup & restore** — export/import JSON backup
- 👥 **Multi-user** — admin and standard user roles
- 📱 **PWA** — installable on Android and iOS, works offline after first load

---

## Deployment

### First-time setup

1. Clone or fork this repo
2. Open `index.html` and fill in your Firebase credentials:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "complytrack-6ac7e.firebaseapp.com",
  projectId: "complytrack-6ac7e",
  storageBucket: "complytrack-6ac7e.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Enable GitHub Pages: **Settings → Pages → Deploy from branch → main / root**
4. App will be live at `https://neil293.github.io/OstrichLogin/`

### Firestore rules

Add the following rule to your Firebase project to allow app access:

```
match /irt_sites/{doc} {
  allow read, write: if true;
}
```

> **Note:** This app uses the existing `complytrack-6ac7e` Firebase project but writes to a separate Firestore document (`ostrich_sites/main`) — it does not interfere with FieldPass data.

---

## Default login

| Username | Password  | Role  |
|----------|-----------|-------|
| `neil`   | `admin123` | Admin |

**Change the password immediately** after first login via Settings → Change Password.

---

## Adding / managing users

Admins can add users under the **Users** tab. Roles:

- **Admin** — full access: add/edit/delete sites and users
- **User** — view sites, copy codes, navigate, sign in/out; cannot delete

---

## Tech stack

| Component | Technology |
|-----------|-----------|
| Frontend  | Vanilla JS, HTML, CSS — no frameworks, no build tools |
| Database  | Firebase Firestore (`complytrack-6ac7e`) |
| Auth      | Custom SHA-256 via `crypto.subtle` |
| Maps      | Native OS maps via `geo:` / `maps:` URI scheme |
| QR scan   | BarcodeDetector API (Android), jsQR fallback |
| Hosting   | GitHub Pages (static) |

---

## Camera & GPS requirements

Camera (QR scanning) and GPS (distance sort / navigation) require the app to be served over **HTTPS**. These features will not work when running the file locally (`file://`). GitHub Pages provides HTTPS automatically.

---

## Data structure

Sites are stored in `localStorage` under `irt_sites_v1` and synced to Firestore at `ostrich_sites/main`. Each site record:

```javascript
{
  id:        1746613200000,   // Date.now()
  name:      'Tarrawanna Care Centre',
  address:   '74-80 Caldwell Ave, Tarrawanna NSW 2518',
  signInUrl: 'https://www.app.complyme.com.au/...',
  doorCode:  '8152, Basement: 2019, Dementia: 3697',
  notes:     '',
  updatedAt: 1746613200000
}
```

---

## Related projects

- [FieldPass](https://github.com/Neil293/FieldPass) — backflow prevention compliance PWA

---

*Fairy Meadow Plumbing Pty Ltd — internal use only*
