import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const page = read('src/pages/stock/SupplierFinancePage.jsx');
const service = read('src/services/supplierFinance.service.js');
const routes = read('src/routes/AppRoutes.jsx');
const stock = read('src/pages/stock/StockEasyPage.jsx');

test('supplier accounting always uses real API, never a mock financial balance', () => {
  assert.match(service, /Supplier credit accounting requires the live Django backend/);
  assert.match(service, /\/inventory\/procurement/);
  assert.match(service, /recordPayment: \(payload\) => live\('post', '\/payments'/);
  assert.match(service, /applyAdvance: \(id, payload\) => live\('post'/);
  assert.doesNotMatch(service, /getMock|updateMock|localStorage/);
});

test('purchase can save draft or atomically post with selected payment mode', () => {
  assert.match(page, /Save Draft/);
  assert.match(page, /Confirm & Post Purchase/);
  assert.match(page, /Confirm & Post Bill/);
  assert.match(page, /finance\.createBill\(/);
  assert.match(page, /finance\.postBill\(bill\.id\)/);
  assert.match(page, /postNow/);
  assert.match(page, /Partial Paid/);
  assert.match(page, /Full Credit/);
  assert.match(page, /Item-wise Payment Allocation/);
});

test('supplier payments select a recorded account and allocate to real outstanding bills', () => {
  assert.match(page, /Record|Confirm Supplier Payment/);
  assert.match(page, /idempotencyKey: requestKey\.current/);
  assert.match(page, /outstandingBills/);
  assert.match(page, /finance\.recordPayment\(/);
  assert.match(page, /Payment account/);
  assert.match(page, /Bank Transfer/);
  assert.match(page, /Cash/);
  assert.match(page, /UPI/);
});

test('advance application is separate from a money-out posting', () => {
  assert.match(page, /Apply Advance \(No Additional Bank Debit\)/);
  assert.match(page, /finance\.applyAdvance\(/);
  assert.match(page, /No second bank deduction was made/);
});

test('supplier bill purchase cost is distinct from customer selling rate', () => {
  assert.match(page, /Purchase rate \(₹\)/);
  assert.match(page, /customer purchase costs|supplier purchase costs/);
  assert.match(page, /Manual GST Component/);
  assert.match(page, /taxComponents/);
  assert.match(page, /Place of Supply/);
  assert.match(page, /GST Breakdown/);
  assert.match(page, /receiveIntoStock/);
});

test('supplier workspace uses theme-aware controls and responsive grids without false live balance claims', () => {
  assert.match(page, /border-line bg-surface/);
  assert.match(page, /text-base/);
  assert.match(page, /grid-cols-2/);
  assert.match(page, /recorded account ledger/);
  assert.match(page, /not a real-time bank balance/);
});

test('inventory links to new supplier route ahead of stock wildcard', () => {
  assert.match(stock, /to="\/stock\/suppliers"/);
  assert.ok(routes.indexOf('path="/stock/suppliers"') > routes.indexOf('path="/stock"'));
  assert.ok(routes.indexOf('path="/stock/suppliers"') < routes.indexOf('path="/stock/*"'));
});
