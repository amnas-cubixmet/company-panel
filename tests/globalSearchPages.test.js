import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { searchWorkspacePages } from '../src/utils/workspacePageSearch.js';

const routes = [
  { id: 'suppliers', path: '/suppliers', label: 'Suppliers', section: 'Workshop Operations', permission: 'stock.view' },
  { id: 'jobs', path: '/jobs', label: 'Job Cards', section: 'Workshop Operations', permission: 'jobs.view' },
  { id: 'expenses', path: '/expenses', label: 'Expenses', section: 'Finance', permission: 'expenses.view' },
  { id: 'settings', path: '/settings', label: 'Settings', section: 'Workspace', permission: 'settings.view' },
];
const can = (...grants) => permission => grants.includes(permission);
const searchUI = readFileSync(new URL('../src/components/common/GlobalSearch.jsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/globalSearch.service.js', import.meta.url), 'utf8');

test('supplier query opens the correct Suppliers page, not the old Stock supplier selector', () => {
  const matches = searchWorkspacePages('supp', routes, can('stock.view'));
  assert.equal(matches[0].title, 'Suppliers');
  assert.equal(matches[0].route, '/suppliers');
  assert.equal(matches[0].group, 'Pages & Features');
  assert.ok(matches[0].subtitle);
  assert.ok(matches.every(item => item.route.startsWith('/suppliers')));
});

test('page search matches navigation labels, aliases and real subpage routes', () => {
  assert.equal(searchWorkspacePages('vendor', routes, can('stock.view'))[0].route, '/suppliers');
  assert.equal(searchWorkspacePages('expense', routes, can('expenses.view'))[0].route, '/expenses');
  assert.ok(searchWorkspacePages('new job', routes, can('jobs.view', 'jobs.create'))
    .some(item => item.route === '/jobs/new'));
  assert.ok(searchWorkspacePages('payroll payments', routes, can('payroll.payments.view'))
    .some(item => item.route === '/payroll/payments'));
  assert.deepEqual(searchWorkspacePages('s', routes, can('stock.view')), []);
});

test('search catalog never exposes routes without both route and entitlement permissions', () => {
  assert.deepEqual(searchWorkspacePages('supplier', routes, can()), []);
  assert.ok(searchWorkspacePages('supplier', routes, can('stock.view'))
    .every(item => item.title !== 'Supplier Credits'));
  assert.ok(searchWorkspacePages('supplier', routes, can('stock.view', 'payments.view'))
    .some(item => item.title === 'Supplier Credits'));
  assert.deepEqual(searchWorkspacePages('expense', routes, can('jobs.view')), []);
  assert.deepEqual(searchWorkspacePages('settings', routes, can()), []);
});

test('global search renders page suggestions while Django is still searching records', () => {
  assert.match(searchUI, /searchWorkspacePages\(query, routeConfig, can\)/);
  assert.match(searchUI, /\[\.\.\.pages, \.\.\.results\]/);
  assert.match(searchUI, /\{groups\.map\(\(group\) => \{/);
  assert.match(service, /apiClient\.get\('\/search'/);
});
