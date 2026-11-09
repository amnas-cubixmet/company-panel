import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shareManualStaffInvite } from '../src/utils/staffManualInvite.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('queued Cloud API reset closes the preopened tab without claiming delivery', async () => {
  const oldWindow = globalThis.window;
  const popup = {
    closed: false, close() { this.closed = true; },
    location: { replace() { throw Error('Auto delivery must not open manual WhatsApp'); } },
  };
  globalThis.window = { open() { return popup; } };
  try {
    const result = await shareManualStaffInvite(
      async () => ({ whatsappInviteStatus: 'queued', expiresAt: '2026-11-10' }),
      { phone: '+919876543210', staffName: 'Mechanic', workshopName: 'Workshop' },
    );
    assert.equal(result.status, 'queued');
    assert.equal(popup.closed, true);
    assert.equal(result.localOnlyLink, false);
  } finally { globalThis.window = oldWindow; }
});

test('bank and cash wage shortcuts do not bypass confirmation or idempotency', () => {
  const account = read('src/pages/payroll/DailyWageAccountPage.jsx');
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  for (const fragment of [
    "method: 'Cash'", "location.state.paymentMethod === 'Bank Transfer'",
    "open('pay', method)", "requestKey: form.requestKey", "account: form.account || null",
    "Select an active Cash or Bank account", "chosen.currentBalance",
  ]) assert.ok(account.includes(fragment), fragment);
  assert.match(account, /if \(!actionAccess\[modal\] \|\| saving \|\| !modal\) return/);
  assert.match(account, /onSubmit=\{submit\}/);
  assert.match(account, /Confirm Payment/);
  assert.match(profile, /state: \{ openPayment: true, paymentMethod: method \}/);
  assert.doesNotMatch(profile, /dailyWageService\.pay/);
});

test('payments daily money-out and expenses are placed next to book bank balance', () => {
  const overview = read('src/components/payments/PaymentFinanceOverview.jsx');
  const stats = read('src/components/expenses/ExpenseOverviewStats.jsx');
  const expenses = read('src/pages/expenses/ExpenseList.jsx');
  const bank = overview.indexOf("label: 'Bank Balance'");
  const out = overview.indexOf('label: "Today\'s Money Out"');
  const todayExpenses = overview.indexOf('label: "Today\'s Expenses"');
  assert.ok(bank >= 0 && out > bank && todayExpenses > out);
  assert.match(overview, /additionalCards/);
  assert.match(overview, /details className="cg-pay-finance-extra"/);
  assert.match(stats, /Unpaid Balance/);
  assert.match(stats, /Paid So Far/);
  assert.match(expenses, /paidTotal=\{expenses\.reduce/);
  assert.match(expenses, /outstandingTotal=\{expenses\.filter/);
});
