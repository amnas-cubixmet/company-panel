import assert from 'node:assert/strict';
import { test } from 'node:test';
import { customerSyncErrorIsRetryable } from '../src/pwa/offlineCustomerRules.js';

test('offline customer replay retains uncertain network failures to avoid duplicates', () => {
  for (const error of [null, new Error('lost response'), { code: 'ERR_NETWORK' },
    { status: 401 }, { status: 408 }, { status: 425 }, { status: 429 },
    { status: 500 }, { status: 502 }, { status: 503 }]) {
    assert.equal(customerSyncErrorIsRetryable(error), true);
  }
});

test('definite backend rejections stop auto retry and need human attention', () => {
  for (const status of [400, 403, 404, 409, 422]) {
    assert.equal(customerSyncErrorIsRetryable({ status }), false);
  }
});
