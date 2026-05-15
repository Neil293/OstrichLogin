# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OstrichLogin is a single-file PWA for Fairy Meadow Plumbing field staff to look up IRT aged care / retirement facility information (sign-in URLs, access codes, GPS navigation). The live app is hosted on GitHub Pages at `neil293.github.io/OstrichLogin/`. Current version: **v2.12.0**.

## No build step

There are no build tools, no package manager, no transpilation. The entire application is `index.html` (HTML + CSS + JavaScript, ~3300 lines). To make a change, edit `index.html` and push. Deployment happens automatically via GitHub Pages.

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
let _sites       = [];   // array of site objects
let _users       = [];   // array of user objects
let _owners      = [];   // array of owner objects
let _session     = null; // { username, name, role, ts }
let _expandedId  = null; // which site card is open
let _ownerFilter = null; // active owner chip filter (null = All)
let _gpsActive, _userLat, _userLng; // GPS sort state
```

### Data schemas

**Site object:**
```js
{ id, name, address, _lat, _lng, owner, signInUrl, accessCodes: [{location, code}], notes, updatedAt }
```
`owner` is an owner `id` string (e.g. `'irt'`, `'bfs'`). Defaults to `'irt'` for existing records via migration in `loadLocal()`.

**Owner object:**
```js
{ id, name }  // e.g. { id: 'irt', name: 'IRT' }
```
Default owners: `IRT` and `BFS`. Stored in `ostrich_owners_v1`. Owner visibility (show/hide) stored separately in `ostrich_owner_vis` as `{ irt: true, bfs: false, … }`.

**User object:**
```js
{ id, username, password, name, role: 'admin'|'user',
  permissions: { editSites, accessCodes, deleteRecords, backupRestore, signIn, navigate } }
```

Passwords are SHA-256 hashed via `crypto.subtle` (`sha256()` function). Admins have `permissions: null` (full access).

### Storage layers (three tiers for PWA resilience)

1. **`localStorage`** — primary store; keys `ostrich_sites_v1`, `ostrich_users_v1`, `ostrich_session_v1`, `ostrich_owners_v1`, `ostrich_owner_vis`
2. **`sessionStorage`** — session backup for tab reloads
3. **`IndexedDB`** (`ostrichlogin_db`) — session backup that survives PWA storage pressure; written via `idbSet()`/`idbGet()`/`idbDelete()`

`loadLocal()` reads from localStorage (including owners) and migrates any site without an `owner` field to `'irt'`. `saveLocal()` writes sites, users, and owners. Session is written to all three layers on login.

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

`renderSites()` filters `_sites` by owner visibility, active owner chip filter (`_ownerFilter`), and search query; sorts by GPS distance (if active) or alphabetically; then builds site card HTML via template literals and sets `siteGrid.innerHTML`. The collapsed card header shows only the site name (address is shown in the expanded detail only). All user-controlled strings pass through `esc()` for XSS protection before insertion.

`renderUsers()` similarly builds the users table HTML.

`renderOwnerFilter()` builds the owner chip row (`All | IRT | BFS | …`) above the site list; hidden when only one owner exists.

`renderOwners()` builds the owners list in Settings → Owners (admin only).

### Permission system

`hasPermission(perm)` — returns `true` for admins unconditionally, otherwise looks up the current user's `permissions` object. UI elements (buttons, sections) are shown/hidden based on this in both `bootApp()` and inside `renderSites()`.

`requireAdmin()` — throws/alerts and aborts if the current user is not an admin. Used to gate GPS coordinate capture, owner management, and other sensitive write operations.

### Owner system

Each site has an `owner` field (id string). The `_owners` array defines available owners; defaults are `IRT` and `BFS`. Owner management is admin-only (Settings → Owners tab):
- Toggle visibility per owner — hidden owners' sites are excluded from `renderSites()` and their chip removed from the filter row
- Add new owner — id is auto-generated from the name
- Remove owner — sites are reassigned to the next remaining owner before deletion
- Owner visibility persisted in `localStorage` as `ostrich_owner_vis: { irt: true, bfs: true, … }`
- `_ownerFilter` (null = All) controls the active filter chip; `setOwnerFilter(id)` updates it and re-renders

### GPS coordinates

Sites have `_lat` / `_lng` fields for accurate distance sorting. Admins can capture or update these directly from the expanded site card using the "Add GPS" / "Update GPS" button, which calls `captureGpsForSite(id)`. This uses the browser Geolocation API and saves directly to the site object (no edit page needed). GPS sections on site cards are only rendered for admin users.

Users can toggle "Default to GPS sort" and "Show GPS on cards" in Settings → Account. These preferences are stored in `localStorage` as `ostrich_gps_default` and `ostrich_show_gps`. The GPS sort toggle in Settings is hidden from non-admins (`showGpsRow` element).

### Service Worker (`sw.js`)

Cache strategy: network-first for HTML (always get latest), cache-first for icons and manifest.

**Important**: `skipWaiting()` and `clients.claim()` are intentionally absent — calling them would force-reload active sessions and wipe `sessionStorage`. When bumping the app version, update `CACHE_NAME` in `sw.js` AND `APP_VERSION` in `index.html`.

### QR scanning

Uses `BarcodeDetector` API (Android Chrome) with jsQR as a fallback (loaded from CDN on demand). The scanner writes the decoded URL directly into a target form field (`_qrTargetField`).

QR display (showing a site's sign-in URL as a scannable QR) uses the `api.qrserver.com` external service.

The sign-in service is **Linksafe**, hosted at `app.complyme.com.au` — the URLs are correct even though the domain name differs from the brand name.

## Data export files

`irt-locations.json` — 38 IRT sites exported from the live Firebase backup, with fields `name`, `address`, `lat`, `lng`, `signInUrl`, `owner`. Used to seed coordinates in other apps. Regenerate by extracting from a fresh backup JSON exported via Settings → Data → Backup.

`irt-sites.csv` — same 38 sites in CSV format (Name, Address, Latitude, Longitude, Sign-In URL).

## Git workflow

Always develop on a feature branch, never commit directly to `main`. When done:
1. Push the feature branch
2. Create a pull request (`"create a pull request"` is enough to trigger this)
3. The user merges on GitHub

The sandbox cannot push directly to `main` — only to feature branches.

## Deployment

Merge to `main`. GitHub Pages serves the repo root automatically. No CI, no build.

## Default credentials

| Username | Password  | Role  |
|----------|-----------|-------|
| `neil`   | `admin`   | Admin |
| `fmps`   | `fmps1510`| User  |

## Firebase config

The config object (`FIREBASE_CONFIG`) near the top of the `<script>` block contains the live project credentials. The Firestore rules allow unauthenticated read/write to `ostrich_sites/*` (by design — auth is handled in-app).
