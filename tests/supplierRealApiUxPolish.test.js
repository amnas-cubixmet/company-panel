import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const finance = read('src/pages/stock/SupplierFinancePage.jsx');
const suppliers = read('src/pages/suppliers/SuppliersPage.jsx');
const api = read('src/services/supplierFinance.service.js');
const tabs = read('src/components/suppliers/SupplierSectionTabs.jsx');
const styles = read('src/styles/supplier-finance-polish.css');
const directoryStyle = read('src/styles/suppliers-workspace.css');

test('four supplier pages use shared responsive navigation with supplier context', () => {
  assert.match(tabs, /supplierSubmenu\.filter/);
  assert.match(tabs, /selectedSupplier/);
  assert.match(tabs, /encodeURIComponent\(selectedSupplier\)/);
  assert.match(finance, /<SupplierSectionTabs \/>/);
  assert.match(suppliers, /<SupplierSectionTabs \/>/);
  assert.match(styles, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(styles, /scroll-snap-type|overflow-x:auto/);
});

test('financial summaries are fetched from real backend, not mock or stored balances', () => {
  assert.match(api, /const root = '\/inventory\/procurement'/);
  assert.match(api, /Supplier credit accounting requires the live Django backend/);
  assert.match(api, /getSupplierSummary: \(id\) => live\('get'/);
  assert.match(api, /getSupplierLedger: \(id\) => live\('get'/);
  assert.match(finance, /finance\.getSupplierSummary\(target\)/);
  assert.match(finance, /finance\.getSupplierLedger\(target\)/);
  assert.match(finance, /supplierRequest\.current/);
  assert.match(finance, /setSummary\(null\)/);
  assert.match(finance, /summary &&/);
  assert.doesNotMatch(finance, /stockSuppliersMock|localStorage\.getItem/);
  assert.match(suppliers, /Supplier records require the live Django backend/);
  assert.match(suppliers, /Purchase history requires the live Django backend/);
  assert.match(suppliers, /setPurchaseBillsError\(/);
});

test('supplier payment remains idempotent and cannot be presented as automatic success', () => {
  assert.match(finance, /idempotencyKey: requestKey\.current/);
  assert.match(finance, /idempotencyKey: purchaseRequestKey\.current/);
  assert.match(finance, /finance\.recordPayment\(/);
  assert.match(finance, /setPaymentPopupError\(/);
  assert.match(finance, /No account is debited until payment is confirmed/);
  assert.match(finance, /recorded account ledger, not a real-time bank balance/);
});

test('long supplier names and finance controls are responsive and remain readable', () => {
  assert.match(styles, /text-overflow:ellipsis/);
  assert.match(styles, /min-height:46px/);
  assert.match(styles, /font-size:16px/);
  assert.match(styles, /cg-supplier-finance-metrics/);
  assert.match(styles, /cg-supplier-finance-selector/);
  assert.match(directoryStyle, /-webkit-line-clamp:2/);
  assert.match(directoryStyle, /cg-supplier-purchase-history/);
  assert.match(suppliers, /amount == null|purchaseBillsError/);
});
