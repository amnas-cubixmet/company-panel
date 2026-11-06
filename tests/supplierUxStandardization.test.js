import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const supplierPage = source('src/pages/suppliers/SuppliersPage.jsx');
const financePage = source('src/pages/stock/SupplierFinancePage.jsx');
const css = source('src/styles/suppliers-workspace.css');
const tabs = source('src/styles/supplier-section-tabs.css');

test('supplier editor uses static labels, normalized field errors and first-error focus', () => {
  assert.match(supplierPage, /className="cg-supplier-field"/);
  assert.match(supplierPage, /cause\?\.fieldErrors \|\| cause\?\.data/);
  assert.match(supplierPage, /formFields\.find\(key => formErrors\[key\]\)/);
  assert.match(supplierPage, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(supplierPage, /aria-invalid=\{Boolean\(formErrors\[key\]\)\}/);
  assert.match(supplierPage, /Supplier saved successfully/);
  assert.match(css, /\.cg-supplier-field-error/);
  assert.match(css, /\[aria-invalid="true"\]/);
});

test('all four supplier tabs stay fixed in responsive grid without horizontal slider', () => {
  assert.match(tabs, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(tabs, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(tabs, /overflow-x:\s*auto|scroll-snap|translateX/);
});

test('purchase order history and canonical supplier bills use separate real-data filters', () => {
  assert.match(supplierPage, /supplierService\.purchaseOrders\(\)/);
  assert.match(supplierPage, /supplierFinanceService\.getBills\(\)/);
  assert.match(supplierPage, /matchesPurchase\(/);
  assert.match(supplierPage, /filteredPurchaseHistory/);
  assert.match(supplierPage, /filteredPurchaseBills/);
  assert.match(supplierPage, /Supplier Purchase Bills/);
  assert.match(supplierPage, /Draft — not payable/);
});

test('payment form validates bill totals, line allocations and account compatibility before mutation', () => {
  assert.match(financePage, /allocatedCents !== Math\.round\(amount \* 100\)/);
  assert.match(financePage, /lineCents !== Math\.round\(billAmount \* 100\)/);
  assert.match(financePage, /billAmount > Number\(bill\.outstanding\)/);
  assert.match(financePage, /chosenAccount\.kind/);
  assert.match(financePage, /paymentErrors\.allocations/);
  assert.match(financePage, /paymentFormRef\.current\?\.querySelector/);
  assert.match(financePage, /idempotencyKey: requestKey\.current/);
  assert.match(financePage, /finance\.recordPayment\(/);
});

test('credit and payment views render actual backend histories under required permissions', () => {
  assert.match(financePage, /filteredBills\.map/);
  assert.match(financePage, /filteredPayments\.map/);
  assert.match(financePage, /row\.applied/);
  assert.match(financePage, /row\.unapplied/);
  assert.match(financePage, /canPay &&/);
  assert.match(financePage, /access\.can\('stock\.create'\)/);
  assert.match(financePage, /access\.can\('stock\.edit'\)/);
  assert.match(financePage, /finance\.applyAdvance\(/);
  assert.doesNotMatch(financePage, /localStorage|Math\.random\(\) \* 10000/);
});
