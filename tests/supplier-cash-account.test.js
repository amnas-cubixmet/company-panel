import test from 'node:test';
import assert from 'node:assert/strict';
import { financeAccountsForChannel, defaultFinanceAccountId } from '../src/utils/financeCashBank.js';

const accounts = [
  { id: 'cash-1', name: 'Petty Cash', kind: 'Cash', isActive: true },
  { id: 'cash-2', name: 'Cash in Hand', kind: 'Cash', isActive: true },
  { id: 'cash-disabled', name: 'Old Cash', kind: 'Cash', isActive: false, isDefaultPayment: true },
  { id: 'upi-1', name: 'PhonePe', kind: 'UPI', isActive: true },
  { id: 'bank-1', name: 'SBI', kind: 'Bank', isActive: true },
];

test('multiple cash accounts are not guessed by their names', () => {
  assert.equal(defaultFinanceAccountId(accounts, 'Cash'), '');
  assert.deepEqual(financeAccountsForChannel(accounts, 'Cash').map(account => account.id),
    ['cash-1', 'cash-2']);
});

test('the explicit default cash account wins with multiple accounts', () => {
  assert.equal(defaultFinanceAccountId(
    accounts.map(account => account.id === 'cash-2' ? { ...account, isDefaultPayment: true } : account),
    'Cash',
  ), 'cash-2');
});

test('one active cash account is automatically selected', () => {
  assert.equal(defaultFinanceAccountId([accounts[0]], 'Cash'), 'cash-1');
});

test('inactive default cannot be debited', () => {
  assert.equal(defaultFinanceAccountId([accounts[2], accounts[3]], 'Cash'), '');
});

test('a sole Bank/UPI account is automatic, otherwise default is required', () => {
  assert.equal(defaultFinanceAccountId([accounts[3]], 'Bank'), 'upi-1');
  assert.equal(defaultFinanceAccountId(accounts, 'Bank'), '');
  assert.equal(defaultFinanceAccountId(
    accounts.map(account => account.id === 'bank-1' ? { ...account, isDefaultPayment: true } : account),
    'Bank',
  ), 'bank-1');
});

test('conflicting defaults cannot silently select a bank', () => {
  assert.equal(defaultFinanceAccountId([
    { ...accounts[3], isDefaultPayment: true },
    { ...accounts[4], isDefaultPayment: true },
  ], 'Bank'), '');
});

test('an unknown payment method has no default ledger', () => {
  assert.equal(defaultFinanceAccountId(accounts, ''), '');
});
