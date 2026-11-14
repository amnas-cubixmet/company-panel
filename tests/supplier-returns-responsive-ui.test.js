import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../src/components/suppliers/SupplierReturnsPanel.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/supplier-returns.css', import.meta.url), 'utf8');

test('supplier return workflows remain visible and keyboard-operable', () => {
  for (const label of ['Purchase Returns', 'Use Debit Credit', 'Receive Refund', 'History & Aging']) {
    assert.ok(view.includes(label), label);
  }
  assert.match(view, /aria-pressed=\{tab === value\}/);
  assert.match(view, /role="alert"/);
  assert.match(view, /role="status"/);
});

test('financial flows still use existing debit note, allocation and refund actions', () => {
  assert.match(view, /supplierFinanceService\.createDebitNote\(/);
  assert.match(view, /supplierFinanceService\.applyDebitCredit\(/);
  assert.match(view, /supplierFinanceService\.createRefund\(/);
  assert.match(view, /onChanged\?\.\(\)/);
});

test('responsive returns and refunds expose mobile labels for all financial columns', () => {
  for (const label of ['Item', 'Purchased', 'Returnable', 'Return Qty',
    'Debit note', 'Supplier invoice', 'Returned', 'Payable reduced',
    'Available credit', 'Source', 'Amount in', 'Due date', 'Aging band', 'Outstanding']) {
    assert.ok(view.includes('data-label="' + label + '"'), label);
  }
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /\.cg-sr-table thead\s*\{display:none\}/);
  assert.match(css, /content:attr\(data-label\)/);
  assert.match(css, /\.cg-sr-table td\[colspan\]/);
});

test('return form keeps exact quantities and required return reasons', () => {
  assert.match(view, /line\.remaining\.toFixed\(2\)/);
  assert.match(view, /type="number" min="0" step="any"/);
  assert.match(view, /Return reason \*<textarea required/);
  assert.match(view, /returnPreview <= 0/);
});

test('refund keeps explicit receiving account and safe empty states', () => {
  assert.match(view, /Refund source \*/);
  assert.match(view, /Receiving account \*/);
  assert.match(view, /No unapplied advance or debit-note credit/);
  assert.match(view, /No active receiving account found/);
});
