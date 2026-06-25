# OstrichLogin

A secure, mobile-first PWA for Fairy Meadow Plumbing field staff to access IRT facility information — sign-in URLs, door/access codes, addresses, and navigation — from any phone or tablet.

**Version:** v2.13.0 | **Live app:** [neil293.github.io/OstrichLogin/](https://neil293.github.io/OstrichLogin/)

---

## Features

- **Secure login** — SHA-256 hashed passwords, session persistence across localStorage, sessionStorage, and IndexedDB
- **38 IRT sites** pre-loaded — aged care, retirement villages, community facilities
- **Owner system** — sites grouped by owner (IRT, BFS, or custom); filter chips on site list; owner badge on cards; admin can add/remove owners and toggle each owner's visibility on/off
- **Door & access codes** — one-tap copy to clipboard, structured by location
- **Sign In / Out** — direct link to Linksafe sign-in for each site
- **QR code scanner** — scan Linksafe QR codes directly into the sign-in URL field
- **QR code display** — show any site's sign-in URL as a scannable QR code
- **GPS navigation** — sorts list by distance from your current location, launches Google Maps; admin can capture/update GPS coordinates per site directly from the site card
- **Firebase sync** — syncs across all devices, optimised for free tier (minimal reads/writes)
- **Backup & restore** — export/import JSON backup (admin only)
- **Multi-user** — admin and user roles with granular per-user permissions
- **PWA** — installable on Android and iOS, works offline after first load

---

## User Permissions

Admins can control what each user can do:

| Permission | Description |
|---|---|
| Edit Sites | Can edit site details, address, codes |
| Add Access Codes | Can add or modify access codes |
| Delete Records | Can delete sites and users |
| Backup & Restore | Can export and import data |
| Sign In / Out | Can use the sign-in URL button |
| Navigate | Can use GPS navigation |

---

## Deployment

### Prerequisites
- GitHub account (for hosting)
- Firebase project (`ostrichlogin`) with Firestore enabled

### Steps

1. Upload `index.html` (and `sw.js`, `manifest.json`, icons) to the repo root
2. Enable GitHub Pages: **Settings → Pages → Deploy from branch → main / root**
3. App will be live at [neil293.github.io/OstrichLogin/](https://neil293.github.io/OstrichLogin/)

### Firebase config (already set)

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiICSH279ecX_k3ma-Kw3Xszt8wgUzgmM",
  authDomain: "ostrichlogin.firebaseapp.com",
  projectId: "ostrichlogin",
  storageBucket: "ostrichlogin.firebasestorage.app",
  messagingSenderId: "1036713713378",
  appId: "1:1036713713378:web:0138480304436eb67948bb"
};
```

### Firestore rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ostrich_sites/{doc} {
      allow read, write: if true;
    }
  }
}
```

---

## Firebase sync strategy (free tier optimised)

| Action | Strategy |
|---|---|
| **Read** | Once on login (`getDoc`) — no persistent listener |
| **Write** | 30-second debounce, skipped if data unchanged |
| **Conflict** | Timestamp comparison — newest copy always wins |
| **Manual sync** | Settings → Data → Sync now |

---

## Tech stack

| Component | Technology |
|---|---|
| Frontend | Vanilla JS, HTML, CSS — no frameworks, no build tools |
| Database | Firebase Firestore (`ostrichlogin`) |
| Auth | Custom SHA-256 via `crypto.subtle` |
| Session storage | localStorage + sessionStorage + IndexedDB (PWA resilience) |
| Maps | Google Maps via universal URL |
| QR scan | BarcodeDetector API (Android), jsQR fallback |
| QR display | api.qrserver.com |
| Hosting | GitHub Pages (static) |

---

## Camera & GPS requirements

Camera (QR scanning) and GPS (distance sort / navigation) require HTTPS. GitHub Pages provides this automatically — these features will not work when running the file locally (`file://`).

---

## Data exports

| File | Description |
|---|---|
| `irt-locations.json` | 38 IRT sites with name, address, lat/lng, sign-in URL, and owner |
| `irt-sites.csv` | Same data in CSV format |

These files are generated from the live Firebase backup and can be used to seed or update other apps.

---

## Related projects

- [FieldPass](https://github.com/Neil293/FieldPass) — backflow prevention compliance PWA

---

*Fairy Meadow Plumbing Pty Ltd — internal use only*
