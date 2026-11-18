import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { prepareInventorySnapshot, syncErrorKind } from '../src/pwa/inventoryStore.js';
import { inventoryScope, scopeKey } from '../src/pwa/session.js';

test('the offline catalogue contains only form choices within a verified branch scope', () => {
  const user = { id: 'user', company: { id: 'workshop' }, branch: { id: 'main' }, allowedBranchIds: ['main'] };
  const scope = inventoryScope(user);
  assert.equal(scopeKey(scope), '{"user":"user","workshop":"workshop","branch":"main"}');
  assert.equal(inventoryScope({ ...user, branch: { id: 'other' } }), null);
  assert.equal(inventoryScope({ ...user, onboardingRequired: true }), null);

  const snapshot = prepareInventorySnapshot({
    items: [{ brand: 'Parts', costPrice: 99, onHand: 10 }],
    categories: [{ id: 'cat', name: 'Filter', is_active: true }],
    suppliers: [{ id: 'vendor', name: 'Supplier', phone: 'private phone', gstin: 'private gst' }],
    racks: ['A1'], create: true, expiresAt: 1234,
  });
  assert.deepEqual(snapshot.brands, ['Parts']);
  assert.deepEqual(snapshot.racks, ['A1']);
  assert.deepEqual(Object.keys(snapshot.suppliers[0]), ['id', 'name', 'is_active']);
  assert.equal(snapshot.items, undefined);
});

test('sync separates interrupted delivery from definitive refusals', () => {
  assert.equal(syncErrorKind({ code: 'ECONNABORTED' }), 'retry');
  assert.equal(syncErrorKind({ status: 503 }), 'retry');
  assert.equal(syncErrorKind({ status: 429 }), 'retry');
  assert.equal(syncErrorKind({ status: 401 }), 'signin');
  assert.equal(syncErrorKind({ status: 403 }), 'permission');
  assert.equal(syncErrorKind({ status: 409 }), 'conflict');
  assert.equal(syncErrorKind({ status: 400, fieldErrors: { requestKey: 'Used' } }), 'conflict');
  assert.equal(syncErrorKind({ status: 400, fieldErrors: { category: 'Invalid' } }), 'validation');
});

test('the service worker bypasses API, auth navigation, unsafe methods and query credentials', async () => {
  const file = new URL('../scripts/service-worker.js', import.meta.url);
  const script = (await readFile(file, 'utf8')).replace('__CUBIXGEAR_ASSETS__', '["/index.html","/assets/app.js"]');
  const listeners = {};
  const shell = {};
  runInNewContext(script, {
    URL,
    self: { location: { origin: 'https://app.example.test' }, addEventListener: (name, callback) => { listeners[name] = callback; } },
    caches: { open: async () => ({ match: async () => shell }) },
  });

  const dispatch = (path, { method = 'GET', mode = 'navigate' } = {}) => {
    let response;
    listeners.fetch({
      request: { url: new URL(path, 'https://app.example.test').href, method, mode },
      respondWith: (promise) => { response = promise; },
    });
    return response;
  };
  for (const path of ['/api/v1/auth/me', '/login', '/reset-password?token=key', '/set-password/key',
    '/media/private.png', '/stock?token=key', 'https://api.example.test/stock']) {
    assert.equal(dispatch(path), undefined, path);
  }
  assert.equal(dispatch('/stock', { method: 'POST' }), undefined);
  assert.equal(dispatch('/stock', { mode: 'cors' }), undefined);
  assert.equal(await dispatch('/stock'), shell);
  assert.equal(await dispatch('/assets/app.js', { mode: 'cors' }), shell);
});
