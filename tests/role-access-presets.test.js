import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_PERMISSION_MODULES,
  WORKSHOP_ROLE_PRESETS,
  buildRolePresetPermissions,
  permissionMatrixToCodes,
} from '../src/config/rolePermissions.js';

const preset = name => WORKSHOP_ROLE_PRESETS.find(role => role.name === name);
const codesFor = name => permissionMatrixToCodes(buildRolePresetPermissions(
  ROLE_PERMISSION_MODULES, preset(name),
));

test('Workshop role presets include different permissions for daily work', () => {
  assert.deepEqual(codesFor('Mechanic'), [
    'dashboard.view', 'vehicles.view', 'jobs.view', 'jobs.edit', 'attendance.self',
  ]);
  assert.ok(codesFor('Service Advisor').includes('customers.create'));
  assert.ok(codesFor('Parts Manager').includes('stock.edit'));
  assert.ok(codesFor('Workshop Supervisor').includes('attendance.team.view'));
  assert.ok(codesFor('Accountant').includes('invoices.create'));
  assert.ok(codesFor('Accountant').includes('payments.create'));
  assert.ok(codesFor('Accountant').includes('expenses.create'));
  assert.equal(new Set(WORKSHOP_ROLE_PRESETS.map(role => codesFor(role.name).join('|'))).size,
    WORKSHOP_ROLE_PRESETS.length);
});

test('Workshop presets keep financial write access with Accountant and exclude destructive and admin actions', () => {
  for (const role of WORKSHOP_ROLE_PRESETS) {
    const codes = codesFor(role.name);
    assert.ok(codes.length > 0);
    for (const code of codes) {
      assert.doesNotMatch(code, /^(?:company|billing|payroll|settings|staff|storage)\.|\.(?:delete|reverse|manage|approve|process)$/);
      if (role.name !== 'Accountant') assert.doesNotMatch(code, /^(?:invoices|payments|expenses)\./);
    }
  }
});

test('Presets operate only on the available actions and custom roles start empty', () => {
  const available = [
    { key: 'customers', actions: ['view', 'delete'] },
    { key: 'jobs', actions: ['view'] },
    { key: 'payroll', actions: ['view', 'payments.record'] },
  ];
  assert.deepEqual(buildRolePresetPermissions(available, preset('Service Advisor')), {
    customers: { view: true, delete: false },
    jobs: { view: true },
    payroll: { view: false, 'payments.record': false },
  });
  assert.deepEqual(codesFor(''), []);
});
