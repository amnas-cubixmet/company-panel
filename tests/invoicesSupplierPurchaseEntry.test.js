import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
const invoiceHeader = read('components/invoices/InvoiceListHeader.jsx');
const invoicePage = read('pages/invoices/InvoiceRoutePage.jsx');
const suppliers = read('pages/suppliers/SuppliersPage.jsx');
const supplierFlow = read('components/suppliers/SupplierPurchaseFlow.jsx');
const supplierStyles = read('styles/suppliers-unified-ui.css');

test('invoice listing links to purchase bills only when stock and finance viewing is permitted', () => {
  assert.match(invoiceHeader, /hasPermission\(user, 'stock\.view'\) && hasPermission\(user, 'payments\.view'\)/);
  assert.match(invoiceHeader, /onSupplierPurchases/);
  assert.match(invoiceHeader, /Supplier Purchases/);
  assert.match(invoicePage, /onSupplierPurchases=\{\(\) => navigate\('\/suppliers\/purchases'\)\}/);
});

test('new supplier purchase requires selecting an active supplier before starting canonical transaction', () => {
  assert.match(suppliers, /const \[newPurchaseSupplier, setNewPurchaseSupplier\] = useState\(''\)/);
  assert.match(suppliers, /\{canCreatePurchase && \(/);
  assert.match(suppliers, /New Supplier Bill \/ Receive Stock/);
  assert.match(suppliers, /supplier-purchase-start/);
  assert.match(suppliers, /newPurchaseSupplier && suppliers\.some/);
  assert.match(suppliers, /row\.is_active !== false && row\.status !== 'Inactive'/);
  assert.match(suppliers, /'#supplier-purchase-form'/);
  assert.match(suppliers, /getElementById\('supplier-purchase-form'\)/);
  assert.match(supplierStyles, /@media\(max-width:560px\)/);
});

test('purchase completion stays on one canonical supplier posting endpoint, never customer invoice posting', () => {
  assert.match(supplierFlow, /supplierFinanceService\.createBill\(purchasePayload\)/);
  assert.match(supplierFlow, /receiveIntoStock: true, postNow: true/);
  assert.match(supplierFlow, /payments: splits\.map/);
  assert.match(supplierFlow, /idempotencyKey: row\.id/);
  assert.match(supplierFlow, /findPostedSupplierBillReplay/);
  assert.doesNotMatch(invoicePage, /supplierFinanceService\.createBill/);
  assert.doesNotMatch(invoiceHeader, /supplierFinanceService\.createBill/);
});
