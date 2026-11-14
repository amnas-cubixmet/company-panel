import test from 'node:test';
import assert from 'node:assert/strict';
import { financeAccountsForChannel, defaultFinanceAccountId } from '../src/utils/financeCashBank.js';

const accounts = [
  { id: 'cash-1', name: 'Petty Cash', kind: 'Cash', isActive: true },
  { id: 'cash-2', name: 'Cash in Hand', kind: 'Cash', isActive: true },
  { id: 'cash-disabled', name: 'Old Cash', kind: 'Cash', isActive: false },
  { id: 'upi-1', name: 'PhonePe', kind: 'UPI', isActive: true },
  { id: 'bank-1', name: 'SBI', kind: 'Bank', isActive: true },
];

test('supplier cash payments prefer the active Cash in Hand ledger', () => {
  assert.equal(defaultFinanceAccountId(accounts, 'Cash'), 'cash-2');
  assert.deepEqual(financeAccountsForChannel(accounts, 'Cash').map(account => account.id),
    ['cash-1', 'cash-2']);
});

test('one active cash account is automatically selected', () => {
  assert.equal(defaultFinanceAccountId([accounts[0]], 'Cash'), 'cash-1');
});

test('inactive or missing cash accounts must not be used', () => {
  assert.equal(defaultFinanceAccountId([accounts[2], accounts[3]], 'Cash'), '');
});

test('only one Bank/UPI account can be auto-selected', () => {
  assert.equal(defaultFinanceAccountId([accounts[3]], 'Bank'), 'upi-1');
  assert.equal(defaultFinanceAccountId(accounts, 'Bank'), '');
});

test('an unknown payment method has no default ledger', () => {
  assert.equal(defaultFinanceAccountId(accounts, ''), '');
});
