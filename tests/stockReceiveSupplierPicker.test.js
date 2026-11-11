import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/stock/StockEasyPage.jsx');
const dialog = read('src/components/stock/StockPurchaseStartDialog.jsx');
const purchase = read('src/components/suppliers/SupplierPurchaseFlow.jsx');
const css = read('src/styles/stock-purchase-start.css');

test('unlinked stock items can choose a supplier at receipt time', () => {
  assert.match(page, /<StockPurchaseStartDialog/);
  assert.match(page, /setReceiveItem\(item \|\| null\)/);
  assert.match(page, /setReceiveOpen\(true\)/);
  assert.match(dialog, /linkedSupplierId\(initialItem\)/);
  assert.match(dialog, /Select supplier/);
  assert.match(dialog, /Choose the stock item, supplier and quantity/);
  assert.match(dialog, /first posted purchase will associate it/);
  assert.match(dialog, /selectedSupplier && positiveQuantity\(quantity\)/);
});

test('stock receipts prefill the canonical posted Supplier Purchase flow', () => {
  assert.match(page, /canPurchaseStock = can\('stock\.view'\) && can\('stock\.create'\)/);
  assert.match(page, /can\('payments\.view'\) && can\('payments\.create'\)/);
  assert.match(page, /continueStockPurchase = \(\{ itemId, supplierId: selectedSupplierId, quantity, purchaseRate \}\)/);
  assert.match(page, /navigate\('\/suppliers\/' \+ encodeURIComponent\(selectedSupplierId\)/);
  assert.match(page, /purchasePrefill: \{/);
  assert.match(dialog, /Continue to GST & Payment/);
  assert.match(purchase, /receiveIntoStock: true, postNow: true/);
  assert.match(purchase, /payments: splits\.map/);
  assert.match(purchase, /Full Credit · Pay Later/);
  assert.match(purchase, /Cash in Hand/);
  assert.match(purchase, /Bank Payment/);
});

test('live stock operations never bypass supplier bill and payment for inbound purchases', () => {
  assert.match(page, /if \(move\.mode === 'in' && !USE_MOCK_API\)/);
  assert.match(page, /setMoveOpen\(false\);\s*beginMove\('in', move\.itemId\)/);
  assert.match(page, /const beginMove = \(mode, itemId = '', partItem = null\)/);
  assert.match(page, /\(remoteMatches \|\| \[\]\)\.find/);
  assert.match(page, /onClick=\{\(\) => beginMove\('in', item\.id\)\}/);
});

test('purchase entry is legible on mobile and has accessible labels', () => {
  assert.match(dialog, /role="group" aria-label="Select existing stock item"/);
  assert.match(dialog, /Purchase Quantity \*/);
  assert.match(dialog, /Cash in Hand, Bank or Credit \(Pay Later\)/);
  assert.match(css, /max-width:600px/);
  assert.match(css, /min-height:46px/);
});
