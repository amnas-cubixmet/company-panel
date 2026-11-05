import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  permissionCodesToMatrix, permissionMatrixToCodes,
  ROLE_PERMISSION_MODULES, permissionActionLabel,
} from '../src/config/rolePermissions.js';
import { getPermissionForPath } from '../src/utils/permissions.js';

test('nested permission codes round-trip without collapsing permissions', () => {
  const codes = [
    'attendance.team.view', 'attendance.overtime.approve',
    'payroll.view', 'payroll.rates.manage', 'payroll.payments.record',
    'payroll.payments.reverse',
  ];
  const matrix = permissionCodesToMatrix(codes);
  assert.equal(matrix.attendance['team.view'], true);
  assert.equal(matrix.attendance['overtime.approve'], true);
  assert.equal(matrix.payroll['payments.record'], true);
  assert.equal(matrix.payroll['payments.reverse'], true);
  for (const code of codes) assert.ok(permissionMatrixToCodes(matrix).includes(code), code);
  assert.ok(ROLE_PERMISSION_MODULES.some(m => m.key === 'payroll'));
  assert.equal(permissionActionLabel('payments.reverse', 'payroll'), 'Reverse Wage Payment');
  assert.equal(permissionActionLabel('reverse', 'payments'), 'Reverse');
});

test('attendance approvals do not require payroll and payment history is separate', () => {
  assert.equal(getPermissionForPath('/payroll/daily-wages/overtime-approvals'), 'attendance.team.view');
  assert.equal(getPermissionForPath('/payroll/payments'), 'payroll.payments.view');
  assert.equal(getPermissionForPath('/payroll/daily-wages'), 'payroll.view');
});

test('every wage mutation is hidden unless its exact capability is granted', () => {
  const page = readFileSync(new URL('../src/pages/payroll/DailyWageAccountPage.jsx', import.meta.url), 'utf8');
  for (const permission of [
    'payroll.rates.manage', 'payroll.wages.finalize', 'payroll.extras.manage',
    'payroll.extras.approve', 'payroll.adjustments.manage',
    'payroll.payments.record', 'payroll.payments.reverse',
  ]) assert.ok(page.includes(permission), permission);
  assert.doesNotMatch(page, /hasPermission\(user, 'payroll.edit'\)/);
  assert.match(page, /if \(!actionAccess\[modal\]/);
});
