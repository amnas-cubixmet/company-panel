import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceAmountError, validateSupplierAdvance, supplierAdvancePayload,
} from '../src/utils/supplierAdvancePayment.js';
import {
  supplierFinanceSetupRoute, supplierFinanceReturnContext,
} from '../src/utils/supplierFinanceReturnRoute.js';

const cash = { id: 'cash-a', kind: 'Cash', name: 'Cash in Hand', isActive: true, recordedBalance: '1500.00' };
const bank = { id: 'bank-a', kind: 'Bank', name: 'SBI', isActive: true, recordedBalance: '4000.00' };

test('supplier advance accepts rupees with at most two decimal places', () => {
  for (const value of ['1', '100', '100.5', '100.50', '0.01']) {
    assert.equal(advanceAmountError(value), '', value);
  }
  for (const invalid of ['', '0', '-10', '1.999', 'not-money', '100,000', '1e3']) {
    assert.notEqual(advanceAmountError(invalid), '', invalid);
  }
});

test('advance uses the Finance account belonging to selected payment channel', () => {
  assert.equal(validateSupplierAdvance({ amount: '100', channel: 'Cash', accounts: [cash, bank] }).account.id, cash.id);
  assert.equal(validateSupplierAdvance({ amount: '500', channel: 'Bank', accounts: [cash, bank] }).account.id, bank.id);
  assert.match(validateSupplierAdvance({ amount: '2000', channel: 'Cash', accounts: [cash, bank] }).error, /Insufficient/);
});

test('multiple active banks require a default and a disabled default cannot be used', () => {
  const upi = { id: 'upi-b', kind: 'UPI', name: 'PhonePe', isActive: true };
  assert.match(validateSupplierAdvance({
    amount: '100', channel: 'Bank', accounts: [cash, bank, upi],
  }).error, /Default Payment Account/);
  const preferred = { ...bank, isDefaultPayment: true };
  assert.equal(validateSupplierAdvance({
    amount: '100', channel: 'Bank', accounts: [cash, preferred, upi],
  }).account.id, bank.id);
  assert.match(validateSupplierAdvance({
    amount: '100', channel: 'Bank', accounts: [{ ...preferred, isActive: false }, upi, bank],
  }).error, /Default Payment Account/);
});

test('advance refuses to record without loaded accounts or a valid channel', () => {
  assert.match(validateSupplierAdvance({ amount: '500', channel: '', accounts: [cash] }).error, /Choose/);
  assert.match(validateSupplierAdvance({
    amount: '500', channel: 'Cash', accounts: [], accountsReady: false,
  }).error, /not loaded/);
});

test('advance payment payload cannot settle posted bills or create stock', () => {
  const payload = supplierAdvancePayload({
    supplierId: 'supplier-123', amount: '170.5', channel: 'Bank', date: '2026-11-14',
    reference: ' UTR123 ', requestKey: 'unique-pay-123456',
  });
  assert.deepEqual(payload, {
    supplierId: 'supplier-123', amount: '170.50', kind: 'Advance',
    method: 'Bank', paidOn: '2026-11-14', reference: 'UTR123',
    idempotencyKey: 'unique-pay-123456', allocations: [],
  });
});

test('finance account setup returns to supplier ledger, not payment tab', () => {
  const supplierPath = '/suppliers/ea5200b8-eb3a-40d5-9008-4617e5897b49';
  const target = supplierFinanceSetupRoute({ pathname: supplierPath, search: '' }, 'Cash', '#supplier-ledger');
  assert.deepEqual(supplierFinanceReturnContext(target.slice(target.indexOf('?'))), {
    returnTo: supplierPath + '#supplier-ledger', channel: 'Cash',
  });
});
