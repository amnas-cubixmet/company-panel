import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPermissionForPath } from '../src/utils/permissions.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const routes = read('../src/routes/AppRoutes.jsx');
const menu = read('../src/routes/routeConfig.js');
const tabs = read('../src/components/layout/FinanceNavigation.jsx');
const accounts = read('../src/pages/finance/AccountsPage.jsx');

test('one Finance sidebar item replaces duplicate Payments and Expenses items', () => {
  assert.match(menu, /label: 'Finance Management', path: '\/finance'/);
  assert.doesNotMatch(menu, /id: 'payments', label: 'Payments'/);
  assert.doesNotMatch(menu, /id: 'expenses', label: 'Expenses'/);
});
test('Finance routes retain payments and expenses records and bookmarked URLs', () => {
  assert.match(routes, /path="\/finance\/payments\/new"/);
  assert.match(routes, /path="\/finance\/expenses\/:id\/edit"/);
  assert.match(routes, /path="\/payments\/\*"/);
  assert.match(routes, /path="\/expenses\/\*"/);
  assert.match(tabs, /aria-label="Finance sections"/);
  assert.match(tabs, /access\.can\(link\.permission\)/);
});
test('Finance nested routes enforce their actual CRUD permissions', () => {
  assert.equal(getPermissionForPath('/finance/payments'), 'payments.view');
  assert.equal(getPermissionForPath('/finance/payments/new'), 'payments.create');
  assert.equal(getPermissionForPath('/finance/expenses'), 'expenses.view');
  assert.equal(getPermissionForPath('/finance/expenses/new'), 'expenses.create');
  assert.equal(getPermissionForPath('/finance/expenses/abc/edit'), 'expenses.edit');
  assert.equal(getPermissionForPath('/finance/expenses/abc/delete'), 'expenses.delete');
  assert.equal(getPermissionForPath('/finance/accounts'), 'payments.view');
});
test('New financial accounts use two logical categories, Cash and Bank', () => {
  assert.match(accounts, /const KINDS = \['Cash', 'Bank'\]/);
});
