import test from 'node:test';
import assert from 'node:assert/strict';

import {
  storageBytes, formatStorageBytes, formatStorageDelta,
  BYTES_PER_KB, BYTES_PER_MB, BYTES_PER_GB,
} from '../src/utils/storageUnits.js';

test('binary byte conversion preserves tiny usage', () => {
  assert.equal(BYTES_PER_KB, 1024);
  assert.equal(BYTES_PER_MB, 1024 * 1024);
  assert.equal(BYTES_PER_GB, 1024 * 1024 * 1024);
  assert.equal(formatStorageBytes(0), '0 B');
  assert.equal(formatStorageBytes(1), '1 B');
  assert.equal(formatStorageBytes(1024), '1 KB');
  assert.equal(formatStorageBytes(1536), '1.5 KB');
  assert.equal(formatStorageBytes(1024 * 1024), '1 MB');
  assert.equal(formatStorageBytes(1024 ** 3), '1 GB');
  assert.equal(formatStorageBytes(1024, 'GB'), '0.000000953674 GB');
});

test('server usedBytes is canonical; legacy usedGb only a fallback', () => {
  assert.equal(storageBytes({ usedBytes: 1, usedGb: 0 }), 1);
  assert.equal(storageBytes({ usedBytes: 1024, usedGb: 0 }), 1024);
  assert.equal(storageBytes({ usedBytes: 0, usedGb: 2 }), 0);
  assert.equal(storageBytes({ usedGb: 1 }), BYTES_PER_GB);
  assert.equal(storageBytes({ usedBytes: null, usedGb: 0 }), 0);
  assert.equal(formatStorageDelta(-1024), '−1 KB');
  assert.equal(formatStorageDelta(1024), '+1 KB');
});

test('100 MB rounds to 0.10 GB without losing the exact media byte count', () => {
  const bytes = storageBytes({ usedBytes: String(100 * BYTES_PER_MB), usedGb: 0.098 });
  assert.equal(bytes, 104857600);
  assert.equal(formatStorageBytes(bytes), '100 MB');
  assert.equal(formatStorageBytes(bytes, 'GB'), '0.10 GB');
  assert.equal(formatStorageBytes(0, 'GB'), '0.00 GB');
  assert.equal(formatStorageBytes(BYTES_PER_MB, 'GB'), '0.0009765625 GB');
});
