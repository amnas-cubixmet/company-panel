import assert from 'node:assert/strict';
import { test } from 'node:test';
import { offlineSnapshot, reportBackendConnection } from '../src/pwa/connectivity.js';

test('PWA recognizes backend outages even while the browser reports online', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const browser = new EventTarget();
  const network = { onLine: true };
  const changes = [];
  browser.addEventListener('cubixgear:backend-connectivity', () => changes.push('change'));
  browser.addEventListener('cubixgear:backend-recovered', () => changes.push('recovered'));

  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: network });
  try {
    reportBackendConnection(true);
    assert.equal(offlineSnapshot(), false);

    reportBackendConnection(false);
    assert.equal(offlineSnapshot(), true);
    assert.deepEqual(changes, ['change']);

    // Duplicate failed probes must not create repeated state notifications.
    reportBackendConnection(false);
    assert.deepEqual(changes, ['change']);

    reportBackendConnection(true);
    assert.equal(offlineSnapshot(), false);
    assert.deepEqual(changes, ['change', 'change', 'recovered']);

    network.onLine = false;
    assert.equal(offlineSnapshot(), true);
    network.onLine = true;
    assert.equal(offlineSnapshot(), false);
  } finally {
    reportBackendConnection(true);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
});
