import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dashboard = read('src/pages/gstr/GSTRDashboard.jsx');
const css = read('src/pages/gstr/gstr-ui-polish.css');
const supplierFlow = read('src/components/suppliers/SupplierPurchaseFlow.jsx');

test('GSTR purchase payment summaries are hidden without both stock and finance view permissions', () => {
  assert.match(dashboard, /const canSeePurchaseFinance = access\.can\('stock\.view'\) && access\.can\('payments\.view'\)/);
  assert.match(dashboard, /tab !== 'gstr2b' \|\| !canSeePurchaseFinance/);
  assert.match(dashboard, /apiClient\.get\('\/gstr\/purchase-settlements', \{ params: \{ period \} \}\)/);
  assert.match(dashboard, /\{canSeePurchaseFinance && <div className="gstr-purchase-settlements"/);
  assert.match(dashboard, /\{canSeePurchaseFinance && <Link to="\/suppliers\/purchases"/);
  assert.match(dashboard, /setSettlementError\(cause\?\.message/);
});

test('GST stays distinct from current cash, bank, advance allocations and supplier credit', () => {
  for (const label of [
    'Purchase GST', 'Cash Allocated', 'Bank / UPI Allocated',
    'Total Paid / Allocated', 'Returns / Credits Applied',
    'Current Supplier Due',
  ]) assert.ok(dashboard.includes(label), label);
  assert.match(dashboard, /Payment does not change/);
  assert.match(dashboard, /CURRENT ledger balance/);
  assert.match(dashboard, /Open Supplier Purchases/);
  assert.match(dashboard, /supplierId\) \+ '#supplier-transactions'/);
  assert.doesNotMatch(dashboard, /supplierFinanceService\.createBill/);
  assert.doesNotMatch(dashboard, /supplierFinanceService\.recordPayment/);
  assert.match(supplierFlow, /supplierFinanceService\.createBill\(purchasePayload\)/);
});

test('existing GST reports, reconciliation and mobile summaries remain present', () => {
  assert.match(dashboard, /apiClient\.get\('\/gstr\/overview'/);
  assert.match(dashboard, /GSTR-2B · Purchase ITC Reconciliation/);
  assert.match(dashboard, /Reconcile & Save Evidence/);
  assert.match(dashboard, /purchaseSettlementColumns/);
  assert.match(css, /\.gstr-purchase-settlements/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(dashboard, /<DataTable key=\{'settlements-' \+ period\}/);
});
