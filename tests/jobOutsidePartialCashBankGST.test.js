import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const ui = read('src/pages/jobs/JobPartsWorkflow.jsx');
const service = read('src/services/jobParts.service.js');

test('job outside purchase supports exact Cash in Hand and Bank accounts plus credit', () => {
  assert.match(ui, /Cash in Hand — Pay Now/);
  assert.match(ui, /Bank — Pay Now/);
  assert.match(ui, /Credit — Pay Later/);
  assert.match(ui, /financeAccountsForChannel\(accounts, paymentType\)/);
  assert.match(ui, /canPayNow=\{canPayOutside\}/);
  assert.match(ui, /hasPermission\(user, 'payments\.edit'\)/);
  assert.match(ui, /setAccountId\(''\); setPaidAmount\(''\)/);
});

test('supplier purchase GST and partial amount are previewed separately from customer invoice GST', () => {
  assert.match(ui, /Purchase Before GST/);
  assert.match(ui, /Purchase GST \(\{gstRate\}%\)/);
  assert.match(ui, /Cash \/ Bank Paid Now/);
  assert.match(ui, /Remaining Supplier Credit/);
  assert.match(ui, /Purchase GST is included in the supplier total, not added to the payment again/);
  assert.match(ui, /not automatically verified as input tax credit/);
  assert.match(ui, /paidAmount: paymentType === 'Credit' \? '0\.00' : payNow\.toFixed\(2\)/);
  assert.match(ui, /payNow <= actualTotal/);
  assert.match(ui, /validPaidAmount/);
  assert.match(service, /payload\.append\('paidAmount', String\(form\.paidAmount\)\)/);
});

test('later Finance credit settlements are visible in linked job purchase history', () => {
  assert.match(ui, /row\.balanceDue/);
  assert.match(ui, /row\.paidAmount/);
  assert.match(ui, /\/finance\/expenses\/\$\{row\.expenseId\}/);
  assert.match(ui, /<Link to="\/stock">Stock → Supplier Purchase<\/Link>/);
  assert.match(service, /balanceDue: balanceDue\.toFixed\(2\)/);
  assert.match(service, /paymentStatus: balanceDue === 0 \? 'Paid' : paid > 0 \? 'Partially Paid'/);
});
