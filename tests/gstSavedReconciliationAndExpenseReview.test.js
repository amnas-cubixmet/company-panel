import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = source('src/pages/gstr/GSTRDashboard.jsx');

test('GSTR-2B saved reconciliation is reopened by period and ID using a read-only API', () => {
  assert.match(page, /apiClient\.get\('\/gstr\/imports', \{ params: \{ period \} \}\)/);
  assert.match(page, /apiClient\.get\('\/gstr\/reconcile', \{/);
  assert.match(page, /params: \{ period, importId \}/);
  assert.match(page, /aria-label="Open saved GSTR-2B reconciliation"/);
  assert.match(page, /setActiveImportId\(result\.importId \|\| ''\)/);
  assert.match(page, /access\.can\('gstr\.reconcile'\)/);
});

test('Finance expense GST remains an unverified exception and never an ITC claim', () => {
  assert.match(page, /expenseGSTReview/);
  assert.match(page, /Expense GST Pending Verification/);
  assert.match(page, /they are excluded from eligible ITC and GSTR-3B/);
  assert.match(page, /\/finance\/expenses\//);
  assert.match(page, /exportCsv\('expense-gst'\)/);
  assert.match(page, /exportCsv\('purchases'\)/);
});

test('GST page discloses filing review uncertainty and verifies upload extension and size', () => {
  assert.match(page, /Portal unverified/);
  assert.match(page, /Not submitted by CubixGear/);
  assert.match(page, /5 \* 1024 \* 1024/);
  assert.match(page, /!data\.company\?\.registered/);
  assert.match(page, /setSearch\(''\); updateParams\(\{ tab: value \}\)/);
});
