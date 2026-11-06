import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('src/components/payments/PaymentsFinanceHome.jsx');
const page = read('src/pages/payments/PaymentList.jsx');
const service = read('src/services/finance.service.js');
const css = read('src/styles/payments-finance-home.css');

test('payments route embeds finance overview rather than relying on a second page', () => {
  assert.match(page, /import PaymentsFinanceHome from/);
  assert.match(page, /<PaymentsFinanceHome refreshKey=/);
  assert.match(home, /getPaymentsOverview/);
  assert.match(service, /payments-overview/);
  assert.match(home, /Date Range/);
  assert.match(home, /Bank Balance/);
  assert.match(home, /Cash Balance/);
  assert.match(home, /UPI Balance/);
  assert.match(home, /Received on Date/);
  assert.match(home, /Paid on Date/);
  assert.match(home, /Estimated Profit/);
});

test('balance correction creates a real auditable ledger entry and requires confirmation', () => {
  assert.match(home, /financeService\.createAccount/);
  assert.match(home, /openingBalance/);
  assert.match(home, /financeService\.adjustBalance/);
  assert.match(home, /appConfirm/);
  assert.match(home, /reason\.trim\(\)/);
  assert.match(home, /Never replace a running balance directly/);
  assert.match(home, /setReloadKey/);
});

test('payment transaction logs are filtered and exported using authenticated API', () => {
  assert.match(home, /financeService\.getLedger/);
  assert.match(home, /page_size: 25/);
  assert.match(home, /financeService\.exportLedgerCSV/);
  assert.match(home, /financeService\.exportLedgerPDF/);
  assert.match(home, /Filter ledger by account/);
  assert.match(home, /Filter ledger by date/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /font-size:16px/);
});
