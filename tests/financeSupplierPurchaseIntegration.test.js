import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dashboard = read('src/pages/finance/FinanceDashboard.jsx');
const workspace = read('src/pages/finance/FinanceWorkspace.jsx');
const supplierPanel = read('src/components/finance/FinanceSupplierPurchases.jsx');
const supplierFlow = read('src/components/suppliers/SupplierPurchaseFlow.jsx');
const styles = read('src/styles/finance-supplier-purchases.css');

test('finance overview protects supplier ledger with stock and payments view rights', () => {
  assert.match(dashboard, /const canViewSupplierBills = can\('stock\.view'\) && can\('payments\.view'\)/);
  assert.match(dashboard, /\{canViewSupplierBills && <FinanceSupplierPurchases/);
  assert.match(dashboard, /can\('stock\.create'\) && can\('stock\.edit'\) && can\('payments\.create'\)/);
  assert.match(dashboard, /canPaySupplierCredit = canViewSupplierBills && can\('payments\.create'\)/);
  assert.match(dashboard, /!USE_MOCK_API/);
});

test('finance shows only five posted supplier bills and original tax and payable snapshots', () => {
  assert.match(supplierPanel, /supplierFinanceService\.getBills\(\)/);
  assert.match(supplierPanel, /bill\.postingStatus === 'Posted'/);
  assert.match(supplierPanel, /\.slice\(0, 5\)/);
  for (const key of ['bill.total', 'bill.tax', 'bill.paid',
    'bill.creditsApplied', 'bill.outstanding']) {
    assert.ok(supplierPanel.includes(key), key);
  }
  assert.match(supplierPanel, /not a complete GST return or month-end statement/);
  assert.match(supplierPanel, /not automatically eligible ITC/);
  assert.match(supplierPanel, /role="alert"/);
  assert.match(supplierPanel, /role="status"/);
  assert.doesNotMatch(supplierPanel, /supplierFinanceService\.(createBill|postBill|recordPayment)/);
});

test('finance shortcuts navigate to one canonical supplier purchase and payment flow', () => {
  assert.match(dashboard, /Receive Stock \/ Purchase GST/);
  assert.match(dashboard, /Pay Supplier Credit/);
  assert.match(dashboard, /path: '\/suppliers\/purchases'/);
  assert.match(workspace, /to: '\/suppliers\/purchases'/);
  assert.match(workspace, /to: '\/gstr\?tab=gstr2b'/);
  assert.match(supplierPanel, /to="\/suppliers\/purchases"/);
  assert.match(supplierPanel, /to="\/suppliers"/);
  assert.match(supplierFlow, /receiveIntoStock: true, postNow: true/);
  assert.match(supplierFlow, /payments: splits\.map/);
  assert.match(supplierFlow, /idempotencyKey: row\.id/);
  assert.match(supplierFlow, /findPostedSupplierBillReplay/);
});

test('supplier purchase finance summary is mobile-friendly and accessible', () => {
  assert.match(styles, /\.finance-supplier-purchase-values/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /@media\(max-width:390px\)/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(supplierPanel, /aria-label="Supplier purchase GST and credit"/);
  assert.match(supplierPanel, /aria-label="Refresh supplier purchase bills"/);
});
