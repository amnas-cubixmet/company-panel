import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  accountChannel, financeAccountsForChannel,
} from '../src/utils/financeCashBank.js';

const purchase = readFileSync(new URL('../src/components/suppliers/SupplierPurchaseFlow.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/supplier-purchase-flow.css', import.meta.url), 'utf8');

test('stock purchase payment channels show Cash in Hand and Bank separately', () => {
  assert.equal(accountChannel('Cash'), 'Cash');
  assert.equal(accountChannel('UPI'), 'Bank');
  assert.deepEqual(financeAccountsForChannel([
    { id: 'cash', kind: 'Cash', isActive: true },
    { id: 'bank', kind: 'Bank', isActive: true },
    { id: 'upi', kind: 'UPI', isActive: true },
    { id: 'disabled', kind: 'Cash', isActive: false },
  ], 'Cash').map(account => account.id), ['cash']);
  assert.match(purchase, /addPaymentChannel\('Cash'\)/);
  assert.match(purchase, /addPaymentChannel\('Bank'\)/);
  assert.match(purchase, /Full Credit · Pay Later/);
  assert.match(purchase, /Payment method \*/);
  assert.match(purchase, /financeAccountsForChannel\(accounts, row\.channel\)/);
  assert.match(purchase, /financeAccountsForChannel\(accounts, settlement\.channel\)/);
});

test('supplier stock receipt previews purchase GST and leaves remaining credit', () => {
  assert.match(purchase, /Intra-state/);
  assert.match(purchase, /Inter-state/);
  assert.match(purchase, /GST estimate/);
  assert.match(purchase, /Supplier Credit \(Due\)/);
  assert.match(purchase, /No payment = full credit/);
  assert.match(purchase, /purchaseGstRate|gstRate: row\.gstRate/);
  assert.match(purchase, /postNow: true/);
  assert.match(purchase, /receiveIntoStock: true/);
  assert.match(purchase, /payments: splits\.map/);
  assert.match(purchase, /idempotencyKey: row\.id/);
});

test('staff without finance balance viewing can still submit authorized payment', () => {
  assert.match(purchase, /account\.recordedBalance != null/);
  assert.match(purchase, /accountBalanceShown\(account\)/);
  assert.match(purchase, /accountChannel\(account\.kind\) !== row\.channel/);
  assert.match(purchase, /FINANCE_CHANNELS\.includes\(settlement\.channel\)/);
  assert.match(styles, /cg-supplier-payment-channel-actions/);
  assert.match(styles, /cg-supplier-gst-breakup/);
  assert.match(styles, /max-width:560px/);
});
