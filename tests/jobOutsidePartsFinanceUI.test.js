import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const parts = read('src/pages/jobs/JobPartsWorkflow.jsx');
const service = read('src/services/jobParts.service.js');
const css = read('src/styles/job-parts-ui.css');

test('Outside shop quote displays purchase GST and independent customer price', () => {
  assert.match(parts, /Purchase GST Rate/);
  assert.match(parts, /purchaseGstRate: form.purchaseGstRate/);
  assert.match(parts, /Customer Selling Price \/ Unit/);
  assert.match(parts, /Purchase Total \(incl\. GST\)/);
  assert.match(parts, /quantity \* cost \* \(1 \+ gst \/ 100\)/);
  assert.match(service, /Number\(payload\.purchaseGstRate \|\| 0\)/);
});

test('Supplier bill completion picks cash, bank or credit with actual account posting', () => {
  assert.match(parts, /Payment Type/);
  assert.match(parts, /Pay From Account/);
  assert.match(parts, /financeService\.listAccounts/);
  assert.match(parts, /row\.kind === paymentType/);
  assert.match(parts, /paymentType === 'Credit'/);
  assert.match(parts, /accountId/);
  assert.match(service, /payload\.append\('paymentType'/);
  assert.match(service, /payload\.append\('accountId'/);
  assert.match(parts, /selected account is debited/);
  assert.match(parts, /supplier later/);
});

test('Modal retains actual scrolling while hiding visual scrollbar', () => {
  assert.match(css, /body \.job-parts-dialog-content/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /scrollbar-width:none/);
  assert.match(css, /::-webkit-scrollbar \{display:none\}/);
});

test('Customer invoice value is separate from purchase price or GST', () => {
  assert.match(parts, /Customer invoice uses the separate selling price only/);
  assert.match(parts, /purchase\.purchaseGstRate/);
  assert.match(service, /totalSelling: \(qty \* Number\(purchase\.sellingPrice\)\)/);
});
