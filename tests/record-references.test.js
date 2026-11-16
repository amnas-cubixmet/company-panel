import assert from 'node:assert/strict';
import test from 'node:test';
import { internalRecordPath, publicRecordPath, recordLabel } from '../src/utils/recordReferences.js';

const id = '00000000-0000-0000-0000-000000000042';

test('Job Card, nested records and Finance queries use stable numeric references', () => {
  const legacy = `/jobs/${id}/complaints/${id}?invoiceId=${id}&branch=${id}#details`;
  const visible = '/jobs/ref-66/complaints/ref-66?invoiceId=ref-66&branch=ref-66#details';
  assert.equal(publicRecordPath(legacy), visible);
  assert.equal(internalRecordPath(visible), legacy);
  assert.equal(recordLabel(id), 'REF-66');
  assert.equal(recordLabel('INV-2026-001'), 'INV-2026-001');
  assert.equal(recordLabel(`Payment ${id}`), 'Payment ref-66');
});

test('object navigation and login return links preserve route data', () => {
  const location = { pathname: `/finance/expenses/${id}`, search: `?invoiceId=${id}`, hash: '#receipt', state: { item: id } };
  assert.deepEqual(internalRecordPath(publicRecordPath(location)), location);
  const query = new URLSearchParams({ next: `/invoices/${id}/edit` });
  const publicLogin = publicRecordPath(`/login?${query}`);
  assert.equal(new URL(publicLogin, 'https://example.test').searchParams.get('next'), '/invoices/ref-66/edit');
  assert.equal(internalRecordPath(publicLogin), `/login?${query}`);
});

test('external URLs, signed paths and search text keep their values', () => {
  for (const path of [`https://example.test/access/${id}`, `/set-password/${id}`, `/customers?q=${id}`]) {
    assert.equal(publicRecordPath(path), path);
    assert.equal(internalRecordPath(path), path);
  }
  const largest = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  assert.equal(internalRecordPath(publicRecordPath(`/invoices/${largest}`)), `/invoices/${largest}`);
  assert.equal(internalRecordPath('/invoices/ref-999999999999999999999999999999999999999'), '/invoices/ref-999999999999999999999999999999999999999');
});
