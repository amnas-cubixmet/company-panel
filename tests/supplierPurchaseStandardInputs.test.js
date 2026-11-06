import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const page = read('src/pages/stock/SupplierFinancePage.jsx');
const css = read('src/styles/supplier-finance-polish.css');
const purchase = page.split("{activeTab === 'bill' && canCreateBill && (")[1]
  ?.split("{activeTab === 'payment' && canPay && summary && (")[0];

test('supplier purchase form uses stable static labels and standard inputs', () => {
  assert.ok(purchase, 'Expected new supplier purchase form');
  assert.match(purchase, /cg-supplier-purchase-form/);
  assert.match(purchase, /cg-supplier-purchase-field/);
  assert.match(css, /cg-supplier-purchase-form label\.cg-supplier-purchase-field/);
  assert.match(css, /position:static!important/);
  assert.match(css, /min-height:48px!important/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /\[aria-invalid=true\]/);
});

test('purchase UI hides redundant information without disabling tax and payment safeguards', () => {
  assert.doesNotMatch(purchase, /Choose how this purchase will be paid BEFORE posting it/);
  assert.doesNotMatch(purchase, /No component selected/);
  assert.match(purchase, /<details className="cg-supplier-purchase-tax-details">/);
  assert.match(purchase, /purchaseTaxLines\[index\]\?\.status !== 'valid'/);
  assert.match(purchase, /Posting is blocked until corrected/);
  assert.match(purchase, /finance\.createBill|createBill/);
  assert.match(purchase, /Save Draft/);
  assert.match(purchase, /Confirm & Post Purchase/);
  assert.match(purchase, /purchaseIntent\.mode/);
  assert.match(purchase, /gstOptions\.states\.map/);
});
