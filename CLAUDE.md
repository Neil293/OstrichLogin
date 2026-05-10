# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OstrichLogin is a single-file PWA for Fairy Meadow Plumbing field staff to look up IRT aged care / retirement facility information (sign-in URLs, access codes, GPS navigation). The live app is hosted on GitHub Pages at `neil293.github.io/OstrichLogin/`.

## No build step

There are no build tools, no package manager, no transpilation. The entire application is `index.html` (HTML + CSS + JavaScript, ~3200 lines). To make a change, edit `index.html` and push. Deployment happens automatically via GitHub Pages.

## Local development

Open `index.html` directly in a browser. Camera (QR scan) and GPS require HTTPS, so those features only work on the deployed GitHub Pages URL — not on `file://`. For logic and UI changes, the browser's file:// URL is sufficient.

## Architecture

The app is structured in a single HTML file with three sections:

**CSS** (`:root` variables → component styles): Uses CSS custom properties for the entire design system. Dark theme with `--bg`, `--surface`, `--surface2`, `--accent` (orange `#e8a020`), `--text`, `--text2`, `--text3`, `--danger`, `--success`, `--info`.

**HTML**: Three main visibility layers:
- `#loginScreen` — shown before authentication
- `#appShell` — the post-login app (header, nav tabs, main content)
- Full-screen overlays: `#editPage` (site edit), `#qrOverlay` (camera scanner), `#qrDisplayOverlay` (QR code display)

**JavaScript** (all inline `<script>` at bottom of `<body>`):

### Global state

```js
let _sites   = [];   // array of site objects
let _users   = [];   // array of user objects
let _session = null; // { username, name, role, ts }
let _expandedId = null; // which site card is open
let _gpsActive, _userLat, _userLng; // GPS sort state
```

### Data schemas

**Site object:**
```js
{ id, name, address, _lat, _lng, signInUrl, accessCodes: [{location, code}], notes, updatedAt }
```

**User object:**
```js
{ id, username, password, name, role: 'admin'|'user',
  permissions: { editSites, accessCodes, deleteRecords, backupRestore, signIn, navigate } }
```

Passwords are SHA-256 hashed via `crypto.subtle` (`sha256()` function). Admins have `permissions: null` (full access).

### Storage layers (three tiers for PWA resilience)

1. **`localStorage`** — primary store; keys `ostrich_sites_v1`, `ostrich_users_v1`, `ostrich_session_v1`
2. **`sessionStorage`** — session backup for tab reloads
3. **`IndexedDB`** (`ostrichlogin_db`) — session backup that survives PWA storage pressure; written via `idbSet()`/`idbGet()`/`idbDelete()`

`loadLocal()` reads from localStorage. `saveLocal()` writes sites + users. Session is written to all three layers on login.

### Firebase sync strategy

Firebase Firestore (`ostrich_sites/main`) is used for cross-device sync. The SDK is loaded dynamically via ESM import at runtime (not bundled). Key invariants:
- **Read once on login** via `tryLoadFromFirebase()` / `initFirebase()` — never a live listener
- **Write with 30-second debounce** via `scheduleSyncToFirebase()` — batches rapid changes
- **Timestamp comparison**: `ostrich_last_ts` in localStorage determines which copy (local vs remote) is newer; newer always wins
- **Safety check**: never apply or push empty `sites`/`users` arrays — this prevents accidental data wipe

### Boot sequence

```
init() → loadLocal() → recoverSession() →
  if users exist: check session → showApp() or showLogin()
  if no users: tryLoadFromFirebase() → seedDefaultAdmin() if Firebase empty
```

`bootApp()` runs after login — applies role-based UI visibility, calls `renderSites()`, `renderUsers()`, `initFirebase()`, and auto-triggers GPS sort.

### Rendering

`renderSites()` filters `_sites` by search query, sorts by GPS distance (if active) or alphabetically, then builds the site card HTML via template literals and sets `siteGrid.innerHTML`. All user-controlled strings pass through `esc()` for XSS protection before insertion.

`renderUsers()` similarly builds the users table HTML.

### Permission system

`hasPermission(perm)` — returns `true` for admins unconditionally, otherwise looks up the current user's `permissions` object. UI elements (buttons, sections) are shown/hidden based on this in both `bootApp()` and inside `renderSites()`.

### Service Worker (`sw.js`)

Cache strategy: network-first for HTML (always get latest), cache-first for icons and manifest.

**Important**: `skipWaiting()` and `clients.claim()` are intentionally absent — calling them would force-reload active sessions and wipe `sessionStorage`. When bumping the app version, update `CACHE_NAME` in `sw.js` AND `APP_VERSION` in `index.html`.

### QR scanning

Uses `BarcodeDetector` API (Android Chrome) with jsQR as a fallback (loaded from CDN on demand). The scanner writes the decoded URL directly into a target form field (`_qrTargetField`).

QR display (showing a site's sign-in URL as a scannable QR) uses the `api.qrserver.com` external service.

## Deployment

Push changes to the `main` branch. GitHub Pages serves the repo root automatically. No CI, no build.

## Default credentials

| Username | Password  | Role  |
|----------|-----------|-------|
| `neil`   | `admin`   | Admin |
| `fmps`   | `fmps1510`| User  |

## Firebase config

The config object (`FIREBASE_CONFIG`) near the top of the `<script>` block contains the live project credentials. The Firestore rules allow unauthenticated read/write to `ostrich_sites/*` (by design — auth is handled in-app).
