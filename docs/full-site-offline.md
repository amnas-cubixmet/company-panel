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
- All non-GET API operations (other than authentication flows) fail offline
  with a clear no-save message. Existing offline Inventory opening-stock drafts
  still use their own validated queue and idempotent stock API.
- Reads of auth/permission/entitlement endpoints, binary content, security
  and credential-related API paths are never captured in the generic cache.
  User/company/branch scoping prevents one logged-in account from reading
  another account's saved GET responses.

## What does NOT work yet

**This is not complete offline transaction support.** No generic offline
writes or automatic replay of updates to Jobs, Customers, Attendance, Payroll,
Finance, Billing, etc. are enabled. All those writes need backend-specific
idempotency keys, version checks, conflict handling and explicit offline UX.
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

The general offline GET cache uses IndexedDB under the browser profile.
Records can include sensitive customer, staff, payroll or financial data.
The cache is **not encrypted at rest by this application**. Use only trusted,
encrypted devices and OS/browser profiles, and sign out after use. Logging out
clears the generic GET and permission caches; an interrupted tab/browser
termination may leave records until they expire. Cached reads also remain
subject to the device profile's physical security and browser storage controls.

Before enabling offline use on shared/public machines, add explicit user opt-in,
encrypted storage with a user-controlled PIN, policy controls, data minimization
and remote wipe/revocation capabilities.

## Manual staging QA matrix

1. Sign in online as a scoped company user; open Dashboard, Customers, Jobs,
   Vehicles and other permitted pages so they fetch data.
2. Turn Wi-Fi off and reload the installed PWA. Navigate via the offline menu;
   verify previously fetched read-only pages render and others show errors.
3. Restore Wi-Fi but stop the Django service. Confirm backend readiness
   detection switches the app to the same offline browsing mode.
4. Attempt to create/edit/delete a record outside Inventory. Confirm that no
   success is displayed and no write API succeeds.
5. Save permitted opening-stock data offline; reconnect; verify that the original
   Inventory idempotency/permission checks run before sync.
6. Sign out, switch browser account, or switch branch. Confirm the previous
   company's pages are unavailable.
7. Expire the JWT and check that offline pages lock. Restore the backend,
   refresh the session and refetch feature entitlements.
8. Test mobile installation and service-worker update while a form is unsaved.
9. Validate backend permission 401/403, billing hold and feature expiry paths
   without network fallback granting access.

Verify production end-to-end behavior with staging Django and live browser
tests; the Node and UI fixture tests cannot prove deployment availability.
