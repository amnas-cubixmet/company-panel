import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/stock/SupplierFinancePage.jsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/services/supplierFinance.service.js', import.meta.url), 'utf8');

test('supplier purchases select legal place of supply using backend states', () => {
  assert.match(page, /Place of Supply \*/);
  assert.match(page, /gstOptions\.states\.map/);
  assert.match(api, /getGSTOptions: \(\) => live\('get', '\/gst-options'\)/);
  assert.match(page, /placeOfSupply: draft\.placeOfSupply/);
});

test('GST rate presets split into CGST plus SGST or UTGST and IGST', () => {
  assert.match(page, /purchaseTaxMode === 'cgst_sgst'/);
  assert.match(page, /purchaseTaxMode === 'igst'/);
  assert.match(page, /purchaseCGST/);
  assert.match(page, /purchaseStateTax/);
  assert.match(page, /purchaseIGST/);
  assert.match(page, /Purchase GST Breakdown/);
});

test('0% requires explicit treatment without inferring exemption from rate', () => {
  assert.match(page, /0% GST Treatment/);
  assert.match(page, /value="exempt"/);
  assert.match(page, /value="nil_rated"/);
  assert.match(page, /value="zero_rated"/);
  assert.match(page, /value="non_gst"/);
  assert.match(page, /gstTreatment: event\.target\.value/);
});

test('existing payment and supplier bill posting flows remain in use', () => {
  assert.match(page, /finance\.createBill\(/);
  assert.match(page, /finance\.recordPayment\(/);
  assert.match(page, /finance\.postBill\(bill\.id\)/);
  assert.match(page, /Cash \/ Bank \/ UPI Account/);
});
