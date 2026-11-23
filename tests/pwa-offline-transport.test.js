import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBackendNetworkFailure, shouldSkipUncachedOfflineRead } from '../src/pwa/offlineTransportRules.js';

test('a refused Django connection switches subsequent calls to offline mode', () => {
  assert.equal(isBackendNetworkFailure({ code: 'ERR_NETWORK' }), true);
  assert.equal(isBackendNetworkFailure({ code: 'ECONNABORTED' }), true);
  assert.equal(isBackendNetworkFailure({ code: 'ETIMEDOUT' }), true);
  assert.equal(isBackendNetworkFailure({ code: 'ERR_CANCELED' }), false);
  assert.equal(isBackendNetworkFailure({ code: 'ERR_NETWORK', response: { status: 403 } }), false);
});

test('offline requests never hit unsaved or sensitive GET APIs while awaiting Django recovery', () => {
  const get = { method: 'get', url: '/saas/credits/access' };
  assert.equal(shouldSkipUncachedOfflineRead(get, true, ''), true);
  assert.equal(shouldSkipUncachedOfflineRead({ ...get, url: '/auth/me' }, true, ''), true);
  assert.equal(shouldSkipUncachedOfflineRead({ ...get, url: '/dashboard' }, true, 'scoped-cache-key'), false);
  assert.equal(shouldSkipUncachedOfflineRead(get, false, ''), false);
  assert.equal(shouldSkipUncachedOfflineRead({ method: 'post', url: '/customers' }, true, ''), false);
});
