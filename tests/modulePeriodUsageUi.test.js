import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('owner module usage logs are fetched from Django with no browser-created prices', () => {
  const service = read('src/services/creditWallet.service.js');
  const page = read('src/pages/saas/CreditWorkspace.jsx');
  assert.match(service, /featureUsageLogs: \(\) => apiClient\.get\('\/saas\/credits\/feature-usage-logs'\)/);
  assert.match(page, /creditWalletService\.featureUsageLogs\(\)/);
  assert.match(page, /featureUsage\.readings/);
  assert.match(page, /row\.coveredSeconds/);
  assert.match(page, /row\.accruedCredits/);
  assert.doesNotMatch(page, /currentMonthLoggedCredits/);
  assert.doesNotMatch(page, /localStorage\.setItem\(['"]moduleUsage/);
});

test('all selected rate periods are distinguished from a monthly payment due day', () => {
  const page = read('src/pages/saas/CreditWorkspace.jsx');
  for (const period of ['ten_seconds', 'hourly', 'daily', 'weekly', 'monthly', 'permanent']) {
    assert.ok(page.includes(period), period);
  }
  assert.doesNotMatch(page, /Module Time Usage/);
  assert.doesNotMatch(page, /ON \/ OFF/);
  assert.match(page, /configured due date/);
  assert.doesNotMatch(page, /Turning OFF stops new usage/);
  assert.match(page, /Monthly usage statements/);
});

test('time-metered postpaid activation does not require upfront wallet balance', () => {
  const activation = read('src/utils/featureActivation.js');
  const check = activation.indexOf("if (bundle.billingMode === 'monthly_postpaid')");
  const balance = activation.indexOf('if (!Number.isFinite(balance)');
  assert.ok(check !== -1 && balance !== -1 && check < balance);
  assert.match(activation, /settled next month/);
});
