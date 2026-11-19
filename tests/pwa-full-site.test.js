import assert from 'node:assert/strict';
import { test } from 'node:test';
import { offlineReadRequestKey } from '../src/pwa/offlineReads.js';
import { rememberFeatureAccess, readFeatureAccess, forgetFeatureAccess } from '../src/pwa/offlineAccess.js';
import { rememberVerifiedSession, forgetVerifiedSession } from '../src/pwa/session.js';

test('offline API reads are scoped to allowed GET JSON endpoints and distinct filters', () => {
  const base = { method: 'get', baseURL: 'https://api.example.test/api/v1' };
  assert.equal(
    offlineReadRequestKey({ ...base, url: '/dashboard', params: { period: 'week', branch: 'b' } }),
    'https://api.example.test/api/v1/dashboard?branch=b&period=week'
  );
  assert.notEqual(
    offlineReadRequestKey({ ...base, url: '/customers', params: { search: 'one' } }),
    offlineReadRequestKey({ ...base, url: '/customers', params: { search: 'two' } })
  );
  assert.equal(offlineReadRequestKey({ ...base, method: 'post', url: '/customers' }), '');
  assert.equal(offlineReadRequestKey({ ...base, url: '/auth/me' }), '');
  assert.equal(offlineReadRequestKey({ ...base, url: '/saas/credits/access' }), '');
  assert.equal(offlineReadRequestKey({ ...base, url: '/jobs/1/files/2' }), '');
  assert.equal(offlineReadRequestKey({ ...base, url: '/customers', responseType: 'blob' }), '');
  assert.equal(offlineReadRequestKey({ ...base, url: '/settings?token=private' }), '');
  assert.equal(offlineReadRequestKey({ ...base, url: 'https://other.test/customers' }), '');
});

test('saved permissions require matching verified user, company, branch and JWT deadline', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map();
  const local = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local });
  try {
    const user = {
      id: 'user1', company: { id: 'shop1' },
      branch: { id: 'branch1' }, allowedBranchIds: ['branch1'],
    };
    const jwt = claims => 'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature';
    const future = Math.floor(Date.now() / 1000) + 120;
    local.setItem('auth_token', jwt({ token_type: 'access', user_id: 'user1', exp: future }));
    rememberVerifiedSession(user);
    rememberFeatureAccess(user, {
      companyId: 'shop1', permissions: ['dashboard.view'], modules: ['dashboard'],
      labelOnly: false, unavailable: false,
    });
    assert.deepEqual(readFeatureAccess(user).permissions, ['dashboard.view']);

    // Company owners may have no selected branch. Their verified company
    // shell may still be browsed offline; stock drafts remain branch-scoped.
    const owner = { ...user, branch: null };
    rememberVerifiedSession(owner);
    rememberFeatureAccess(owner, {
      companyId: 'shop1', permissions: ['dashboard.view'], modules: ['dashboard'],
      labelOnly: false, unavailable: false,
    });
    assert.deepEqual(readFeatureAccess(owner).permissions, ['dashboard.view']);
    rememberVerifiedSession(user);
    rememberFeatureAccess(user, {
      companyId: 'shop1', permissions: ['dashboard.view'], modules: ['dashboard'],
      labelOnly: false, unavailable: false,
    });
    assert.equal(readFeatureAccess({ ...user, company: { id: 'shop2' } }), null);
    assert.equal(readFeatureAccess({ ...user, branch: { id: 'branch2' } }), null);

    local.setItem('auth_token', jwt({ token_type: 'access', user_id: 'user1', exp: Math.floor(Date.now() / 1000) - 1 }));
    assert.equal(readFeatureAccess(user), null);
    forgetFeatureAccess();
    forgetVerifiedSession();
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  }
});
