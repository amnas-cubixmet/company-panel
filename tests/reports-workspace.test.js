import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReportSummary,
  isRealPayment,
  reportPeriodOptions,
} from '../src/pages/reports/reportsDashboard.utils.js';

const date = '2026-11-09';
const availability = { invoices: true, payments: true, expenses: true, stock: true };

test('cash report excludes reversed receipts and subtracts customer refunds', () => {
  assert.equal(isRealPayment({ status: 'Reversed', amount: '900' }), false);
  assert.equal(isRealPayment({ status: 'Completed', reversed_at: date }), false);
  const report = buildReportSummary({
    invoices: [],
    payments: [
      { id: 'in', date, status: 'Completed', direction: 'IN', amount: '100.00' },
      { id: 'out', date, status: 'Completed', direction: 'OUT', amount: '25.00' },
      { id: 'reversed', date, status: 'Reversed', amount: '900.00' },
      { id: 'invalid', date, status: 'Completed', amount: '900.00', reversed_at: date },
    ],
    expenses: [
      { id: 'unpaid', date, status: 'Unpaid', amount: '50.00', paidAmount: '0.00' },
      { id: 'partially-paid', date, status: 'Partially Paid', amount: '30.00', paidAmount: '20.00' },
    ],
    stock: [], from: '2026-11-01', to: '2026-11-30', available: availability,
  });
  assert.equal(report.paymentRows.length, 2);
  assert.equal(report.collected, 75);
  assert.equal(report.expenseTotal, 80);
  assert.equal(report.expensePaidTotal, 20);
  assert.equal(report.netCash, 55);
});

test('expense permission gate hides expenses rather than calling them zero', () => {
  const report = buildReportSummary({
    expenses: [{ id: 'secret', date, amount: '120.00' }],
    available: { ...availability, expenses: false },
    from: '2026-11-01', to: '2026-11-30',
  });
  assert.equal(report.available.expenses, false);
  assert.equal(report.expenseRows.length, 0);
});

test('calendar date period includes last day of each month', () => {
  assert.deepEqual(reportPeriodOptions('2026', 11), {
    from: '2026-11-01', to: '2026-11-30',
  });
});
