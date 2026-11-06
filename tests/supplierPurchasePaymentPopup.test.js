import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/pages/stock/SupplierFinancePage.jsx', import.meta.url), 'utf8',
);

test('posting purchase records supplier payable before opening payment popup', () => {
  assert.match(source, /const confirmedBill = await finance\.createBill\(/);
  assert.match(source, /setPaymentPopupBill\(/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /Close Without Payment/);
  assert.match(source, /Supplier balance remains outstanding/);
});

test('popup handles full, partial and credit without payment on close', () => {
  assert.match(source, /Full Paid/);
  assert.match(source, /Partial Paid/);
  assert.match(source, /Full Credit/);
  assert.match(source, /if \(purchasePayment\.mode === 'Credit'\)/);
  assert.match(source, /finance\.recordPayment\(/);
  assert.match(source, /billId: paymentPopupBill\.id/);
});

test('payment has idempotency, recorded account and no duplicate ledger debit', () => {
  assert.match(source, /idempotencyKey: purchaseRequestKey\.current/);
  assert.match(source, /purchaseRequestKey\.current = paymentKey\(\)/);
  assert.match(source, /inFlight\.current/);
  assert.match(source, /account\.recordedBalance/);
  assert.match(source, /No account is debited until payment is confirmed/);
});
