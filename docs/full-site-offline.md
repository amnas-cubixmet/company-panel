# Full-site offline PWA: current capabilities and limits

CubixGear Company Panel keeps the React/Vite shell installable and cached by the
versioned service worker. No private Django API response is stored in CacheStorage.

## What works

- All previously authorized Company Panel routes can navigate offline with the
  existing sidebar and mobile-friendly offline navigation.
- Company roles/entitlements are read from a last verified permission snapshot,
  scoped to user, workshop and branch. An expired access JWT or label expiry
  locks cached access. Never treat these snapshots as server verification.
- Previously requested JSON GET responses for workshop modules can be replayed
  from scoped IndexedDB if the API is unreachable. The user must have opened
  each page online; data that was not previously fetched will be unavailable.
- A local-only "Offline" banner marks the displayed data as potentially stale.
- GET caches are bounded (80 records; at most 400 KB per response, up to six hours
  but no longer than the recorded JWT access expiry).
- Most non-GET API operations (other than authentication flows) still fail offline
  with a clear no-save message. Inventory opening-stock drafts continue to use
  their validated queue and idempotent stock API.
- **New customer creation** can now be queued as a local-only IndexedDB draft.
  Users first enable it in Settings > PWA & Offline Sync while online.
  Enabling checks Django's `/customers/offline-capabilities` endpoint; older
  backends fail closed. A valid, previously verified branch session and
  `customers.create` permission are required to queue.
- When the signed-in app is reopened/reconnected, pending customer creates are
  retried with an unchanged UUIDv4 offline request key. Django atomically
  enforces unique (company, request key) and returns the existing customer on
  exact replay. Invalid/conflicting drafts stop in Needs Attention, and pending
  drafts are never represented as Django-confirmed records.
- Settings > PWA & Offline Sync displays device-only pending, rejected and
  server-confirmed entries and supports manual sync and removal. Automatic sync
  runs only when the app page is open; Background Sync while closed is not guaranteed.
- Reads of auth/permission/entitlement endpoints, binary content, security
  and credential-related API paths are never captured in the generic cache.
  User/company/branch scoping prevents one logged-in account from reading
  another account's saved GET responses.

## What does NOT work yet

**This is not complete offline transaction support.** Customer creation and
Inventory opening-stock drafts are the only supported write operations. Customer
edit/archive and all writes to Jobs, Vehicles, Attendance, Payroll, Finance,
Billing/GSTR, Suppliers, Services and other modules still require internet.
Those operations need backend-specific idempotency, version checks, conflict
handling and explicit offline UX before they can be queued safely.
Pending writes must never be reported as saved in Django.

Offline responses are snapshots: charts, counters, due balances and financial
records can be stale and must not be treated as source-of-truth. Avoid offline
operational decisions that depend on up-to-the-minute data.

A cached PWA shell does not mean every page has cached data. Many routes fetch
additional resources or media through APIs that cannot be used offline. The
active JWT expires after the backend-configured access period (30 minutes
by default). Long-term offline sessions require a separate, reviewed,
server-signed authorization capability and a clear revocation policy.

## Privacy / device storage

The general offline GET cache **and the opt-in Customer draft queue** use
IndexedDB under the browser profile.
Records can include sensitive customer, staff, payroll or financial data.
The cache is **not encrypted at rest by this application**. Use only trusted,
encrypted devices and OS/browser profiles, and sign out after use. Logging out
clears the generic GET and permission caches; it deliberately does NOT delete
pending Customer drafts, which can only be reviewed and synced after signing
in again as the original user and branch. An interrupted tab/browser
termination may leave old read records until they expire. Cached reads also remain
subject to the device profile's physical security and browser storage controls.

The Customer draft feature requires explicit device/user/branch opt-in but its
data is not encrypted by the web application. Do NOT enable it on public or
shared computers. Encrypted device storage, PIN-protected keys, retention
policy, remote revocation and storage quota/backups need further hardening
before use on unmanaged devices.

## Manual staging QA matrix

1. Sign in online as a scoped company user; open Dashboard, Customers, Jobs,
   Vehicles and other permitted pages so they fetch data.
2. Turn Wi-Fi off and reload the installed PWA. Navigate via the offline menu;
   verify previously fetched read-only pages render and others show errors.
3. Restore Wi-Fi but stop the Django service. Confirm backend readiness
   detection switches the app to the same offline browsing mode.
4. In Settings > PWA & Offline Sync, enable offline Customer creation ONLINE
   with the deployed Django capability endpoint present. Go offline and create
   a new Customer. Confirm it shows only as Pending in Settings, not as a server
   customer. Reconnect with the same user/company/branch and confirm one record
   is created and marked Synced. Retry a lost-response request and confirm it
   returns the same customer ID and creates no duplicate.
5. Attempt to create/edit/delete a record outside supported Customer CREATE
   and Inventory opening-stock. Confirm it does not report a successful save.
6. Save permitted opening-stock data offline; reconnect; verify that the original
   Inventory idempotency/permission checks run before sync.
7. Sign out, switch browser account, or switch branch. Confirm the previous
   company's pages are unavailable.
8. Expire the JWT and check that offline pages lock. Restore the backend,
   refresh the session and refetch feature entitlements.
9. Test mobile installation and service-worker update while a form is unsaved.
10. Validate backend permission 401/403, billing hold and feature expiry paths
   without network fallback granting access.

Verify production end-to-end behavior with staging Django and live browser
tests; the Node and UI fixture tests cannot prove deployment availability.

## Deployment order

1. Deploy and migrate the Django backend PR first. Verify that authenticated
   `GET /api/v1/customers/offline-capabilities` returns
   `{ "customerCreatesIdempotent": true }` and that a repeated
   `offlineRequestKey` returns the same customer ID without creating a duplicate.
2. Deploy the frontend PR, sign in on a trusted office device, go to
   Settings > PWA & Offline Sync and enable Customer drafts online.
3. Run the complete offline/reconnect QA matrix on the production HTTPS domain.
   Do not enable unsupported modules by intercepting all POST/PUT/PATCH/DELETE.
