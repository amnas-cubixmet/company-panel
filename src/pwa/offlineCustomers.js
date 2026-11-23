import apiClient from '../api/apiClient.js';
import { offlineSnapshot } from './connectivity.js';
import { inventoryScope, offlineSessionDeadline, scopeKey } from './session.js';
import { readFeatureAccess } from './offlineAccess.js';
import { customerSyncErrorIsRetryable } from './offlineCustomerRules.js';

// Only Customer CREATE is audited for offline replay at present.
// Keep the device-local queue separate from cached GET responses and stock drafts.
const DB_NAME = 'cubixgear-offline-customers';
const STORE = 'customer-creates';
const CHANGED = 'cubixgear:offline-customers-changed';
const OPT_IN_PREFIX = 'cubixgear:offline-customer-opt-in:';
const MAX_PENDING = 100;
let database;
let syncPromise;

function openDatabase() {
  if (!('indexedDB' in window)) throw new Error('IndexedDB is not available on this device.');
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('scope', 'scope');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open offline storage.'));
    }).catch(error => { database = undefined; throw error; });
  }
  return database;
}

function notify() {
  window.dispatchEvent(new Event(CHANGED));
  try { localStorage.setItem(CHANGED, crypto.randomUUID()); } catch { /* Same-tab signal still works. */ }
}

export function subscribeOfflineCustomers(callback) {
  window.addEventListener(CHANGED, callback);
  const onStorage = event => {
    if (event.key === CHANGED || (event.key || '').startsWith(OPT_IN_PREFIX)) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener('storage', onStorage);
  };
}

function scoped(user) {
  const scope = scopeKey(inventoryScope(user));
  return scope && offlineSessionDeadline(user) > Date.now() ? scope : '';
}

export function offlineCustomerScope(user) {
  return scoped(user);
}

export function isOfflineCustomerEnabled(user) {
  const scope = scoped(user);
  try { return Boolean(scope) && localStorage.getItem(OPT_IN_PREFIX + scope) === 'yes'; }
  catch { return false; }
}

export async function verifyOfflineCustomerSupport() {
  const capability = await apiClient.get('/customers/offline-capabilities', { timeout: 12000 });
  if (capability?.customerCreatesIdempotent !== true) {
    throw new Error('The Django backend does not support safe offline customer sync yet.');
  }
  return true;
}

export function setOfflineCustomerEnabled(user, enabled) {
  const scope = scoped(user);
  if (!scope) throw new Error('Sign in online and choose a workshop branch first.');
  if (enabled) localStorage.setItem(OPT_IN_PREFIX + scope, 'yes');
  else localStorage.removeItem(OPT_IN_PREFIX + scope);
  notify();
}

function ensureCustomerWritePermission(user) {
  const scope = scoped(user);
  if (!scope) throw new Error('Your verified offline session has expired. Reconnect and sign in.');
  const access = readFeatureAccess(user);
  if (!access || !access.permissions.includes('customers.create') ||
      access.billingHold || access.billingStatus?.blocked) {
    throw new Error('Open Customers online with create permission before saving offline.');
  }
  return scope;
}

async function transactionResult(mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = callback(store); } catch (error) { transaction.abort(); reject(error); return; }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function listOfflineCustomers(user) {
  const scope = scoped(user);
  if (!scope) return [];
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('scope').getAll(scope);
    req.onsuccess = () => resolve((req.result || []).sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    ));
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineCustomer(user, payload) {
  const scope = ensureCustomerWritePermission(user);
  if (!isOfflineCustomerEnabled(user)) {
    throw new Error('Enable Offline Customer Drafts in Settings > PWA & Offline Sync first.');
  }
  if (!offlineSnapshot()) throw new Error('The backend is online. Create the customer normally.');
  const branch = String(payload.branch || user?.branch?.id || '');
  if (!branch || (Array.isArray(user.allowedBranchIds) &&
      !user.allowedBranchIds.map(String).includes(branch))) {
    throw new Error('Select a previously authorized workshop branch before saving offline.');
  }
  const existing = await listOfflineCustomers(user);
  if (existing.filter(entry => entry.state !== 'synced').length >= MAX_PENDING) {
    throw new Error('Offline queue is full. Reconnect and sync before adding more customers.');
  }
  if (existing.some(entry => entry.state !== 'synced' && entry.payload.phone === payload.phone)) {
    throw new Error('This phone number is already in your offline customer queue.');
  }
  const requestKey = crypto.randomUUID();
  const record = {
    key: scope + '\n' + requestKey, scope, requestKey,
    payload: { ...payload, branch },
    createdAt: new Date().toISOString(),
    state: 'pending', message: '', serverId: null,
  };
  await transactionResult('readwrite', store => { store.put(record); });
  notify();
  return { offlineQueued: true, localId: requestKey };
}

async function patchRecord(key, update) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => {
      if (!req.result) return;
      store.put(update(req.result));
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  notify();
}

export async function removeOfflineCustomer(user, requestKey) {
  const scope = scoped(user);
  if (!scope) throw new Error('Sign in as the original user and branch first.');
  const key = scope + '\n' + requestKey;
  await transactionResult('readwrite', store => { store.delete(key); });
  notify();
}

// The backend's unique (company, offline_request_key) constraint means retrying
// after a lost HTTP response is safe: the same customer ID is returned.
async function doSync(user) {
  const scope = scoped(user);
  if (!scope || offlineSnapshot()) return { synced: 0 };
  const rows = (await listOfflineCustomers(user)).filter(row => row.state === 'pending');
  if (!rows.length) return { synced: 0 };
  await verifyOfflineCustomerSupport();
  const profile = await apiClient.get('/auth/me', { timeout: 12000 });
  const verified = profile?.user || profile;
  if (scopeKey(inventoryScope(verified)) !== scope) {
    throw new Error('Sign in as the original user, company and branch to sync.');
  }
  let synced = 0;
  for (const row of rows) {
    if (offlineSnapshot() || !scoped(user)) break;
    try {
      const saved = await apiClient.post('/customers', {
        ...row.payload, offlineRequestKey: row.requestKey,
      }, { timeout: 15000 });
      if (!saved?.id) throw new Error('Django did not confirm the customer ID.');
      await patchRecord(row.key, current => ({
        ...current, state: 'synced', serverId: String(saved.id),
        message: '', syncedAt: new Date().toISOString(),
      }));
      synced++;
    } catch (error) {
      if (customerSyncErrorIsRetryable(error)) {
        break; // Keep a retryable, idempotent pending operation on uncertainty.
      }
      await patchRecord(row.key, current => ({
        ...current, state: 'rejected',
        message: error?.message || 'Django rejected this draft. Review the details.',
      }));
    }
  }
  return { synced };
}

export function syncOfflineCustomers(user) {
  if (syncPromise) return syncPromise;
  const scope = scoped(user);
  if (!scope || offlineSnapshot()) return Promise.resolve({ synced: 0 });
  const run = () => (navigator.locks?.request
    ? navigator.locks.request('cubixgear-offline-customers-' + scope,
      { ifAvailable: true }, lock => lock ? doSync(user) : { synced: 0 })
    : doSync(user));
  syncPromise = run().finally(() => { syncPromise = null; });
  return syncPromise;
}
