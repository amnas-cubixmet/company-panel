import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_PERMISSION_MODULES,
  buildRoleAccessPreset,
  permissionMatrixToCodes,
} from '../src/config/rolePermissions.js';

const codesFor = (preset) => permissionMatrixToCodes(buildRoleAccessPreset(
  ROLE_PERMISSION_MODULES, preset,
));

test('View only preset allows basic workshop reading only', () => {
  assert.deepEqual(codesFor('viewer'), [
    'dashboard.view',
    'customers.view',
    'vehicles.view',
    'services.view',
    'jobs.view',
    'stock.view',
  ]);
});

test('Standard access only adds customer, vehicle, job editing and self attendance', () => {
  assert.deepEqual(codesFor('standard'), [
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit',
    'vehicles.view', 'vehicles.create', 'vehicles.edit',
    'services.view',
    'jobs.view', 'jobs.create', 'jobs.edit',
    'stock.view',
    'attendance.self',
  ]);
});

test('Standard access never grants destructive or sensitive permissions', () => {
  const codes = codesFor('standard');
  assert.ok(codes.length > 0);
  for (const code of codes) {
    assert.equal(/^(?:payments|expenses|payroll|invoices|settings|storage|staff|reports|notifications)\./.test(code), false, code);
    assert.equal(/\.(?:delete|reverse|manage|approve|process)$/.test(code), false, code);
  }
});

test('Presets operate only on permitted and visible actions', () => {
  const available = [
    { key: 'customers', actions: ['view', 'create'] },
    { key: 'jobs', actions: ['view'] },
    { key: 'payroll', actions: ['view', 'payments.record'] },
  ];
  assert.deepEqual(buildRoleAccessPreset(available, 'standard'), {
    customers: { view: true, create: true },
    jobs: { view: true },
    payroll: { view: false, 'payments.record': false },
  });
});
