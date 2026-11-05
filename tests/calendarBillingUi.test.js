import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('owner cycle status and payment retry use the server calendar settlement, not browser arithmetic', () => {
  const service = source('src/services/creditCycle.service.js');
  assert.match(service, /apiClient\.get\('\/saas\/credits\/billing-cycle'\)/);
  assert.match(service, /apiClient\.post\('\/saas\/credits\/billing-cycle', \{\}\)/);
  assert.doesNotMatch(service, /\/saas\/credits\/cycle'/);
});

test('owner sees next-month due, zero-credit grace and overdue recovery without deleting data', () => {
  const card = source('src/components/account/CreditCycleCard.jsx');
  assert.match(card, /Credit billing cycle/);
  assert.match(card, /cycle\.dueDay \|\| 5/);
  assert.match(card, /1st to the last day of each calendar month/);
  assert.match(card, /zero-credit usage is permitted only when the administrator enables/);
  assert.match(card, /cycle\.overdue/);
  assert.match(card, /navigate\('\/account\/credits\/buy'\)/);
  assert.match(card, /navigate\('\/account\/storage\/history'\)/);
  assert.match(card, /creditCycleService\.retry\(\)/);
  assert.match(card, /bill\.details\?\.items/);
});

test('storage tab and file-level audit remain accessible in free owner Account', () => {
  const header = source('src/components/account/AccountHeader.jsx');
  const paths = source('src/utils/permissions.js');
  const history = source('src/pages/saas/StorageHistory.jsx');
  assert.match(header, /Storage/);
  assert.match(header, /'\/account\/storage',HardDrive,'billing\.view'/);
  assert.match(paths, /\['\/account\/storage', 'billing\.view'\]/);
  assert.match(history, /storageHistoryService\.getStorageEvents/);
  assert.match(history, /event\.filename/);
  assert.match(history, /event\.actor \|\| 'System'/);
  assert.match(history, /event\.deltaBytes/);
  assert.doesNotMatch(history, /const loadMore[\s\S]*const loadMore/);
  assert.match(history, /credits/);
});

test('account safety does not remove backend-paid feature-role guards', () => {
  const access = source('src/context/FeatureAccessContext.jsx');
  const protectedRoute = source('src/routes/ProtectedRoute.jsx');
  assert.match(access, /return current\.permissions\.includes\(permission\)/);
  assert.match(protectedRoute, /!featureAccess\.can\(requiredPermission\)/);
  assert.match(access, /moduleIsVisible/);
});
