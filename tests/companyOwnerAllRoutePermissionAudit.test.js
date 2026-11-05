import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getPermissionForPath } from '../src/utils/permissions.js';
import { routeConfig } from '../src/routes/routeConfig.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('every nonpublic company route requires an explicit tenant permission', () => {
  const source = read('src/routes/AppRoutes.jsx');
  const begin = source.indexOf('<Route element={<ProtectedRoute />}>');
  const end = source.indexOf('\n    </Route>', begin);
  assert.ok(begin > 0 && end > begin);
  const declaredPaths = [...source.slice(begin, end).matchAll(/<Route path="([^"]+)"/g)]
    .map(match => match[1]);
  assert.ok(declaredPaths.length > 70, 'Unexpectedly few tenant routes scanned');
  const aliases = new Set(['/subscribe','/profile','/access-denied']);
  for (const path of declaredPaths) {
    if (aliases.has(path)) continue;
    assert.ok(getPermissionForPath(path), 'Unprotected tenant route: '+path);
  }
});

test('company owner module entry routes match sidebar permission requirements', () => {
  for (const route of routeConfig) {
    assert.equal(getPermissionForPath(route.path), route.permission,
      'Route/sidebar mismatch: '+route.path);
  }
});

test('all company sub-pages require the correct view or edit codes', () => {
  const cases = {
    '/dashboard': 'dashboard.view',
    '/staff-management/overview': 'staff.view',
    '/staff-management/staff': 'staff.view',
    '/staff-management/staff/employee-id': 'staff.view',
    '/staff-management/add': 'staff.create',
    '/staff-management/roles': 'company.manage',
    '/staff-management/teams': 'staff.edit',
    '/staff-management/shifts': 'staff.edit',
    '/attendance-manager/leave-requests': 'attendance.team.view',
    '/attendance-manager/rules': 'attendance.team.view',
    '/my-attendance/leave': 'attendance.self',
    '/payroll/daily-wages': 'payroll.view',
    '/staff/example-id/wages': 'payroll.view',
    '/customers/new': 'customers.create',
    '/customers/example-id/edit': 'customers.edit',
    '/customers/edit/example-id': 'customers.edit',
    '/customers/example-id': 'customers.view',
    '/vehicles/example-id/edit': 'vehicles.edit',
    '/jobs/example-id/edit': 'jobs.edit',
    '/jobs/example-id/invoice': 'invoices.view',
    '/jobs/example-id/parts': 'stock.view',
    '/invoices/new': 'invoices.create',
    '/invoices/e-way-bills/new': 'invoices.create',
    '/invoices/e-way-bills/example-id/edit': 'invoices.edit',
    '/quotations/new': 'invoices.create',
    '/account': 'billing.view',
    '/account/credits/features': 'billing.view',
    '/account/company': 'billing.view',
    '/account/storage/history/2026-10-28': 'billing.view',
    '/settings': 'settings.view',
  };
  for (const [path, code] of Object.entries(cases)) {
    assert.equal(getPermissionForPath(path), code, 'Wrong permission for '+path);
  }
});

test('verified company owner access still depends on Django server entitlements', () => {
  const access = read('src/context/FeatureAccessContext.jsx');
  const route = read('src/routes/ProtectedRoute.jsx');
  assert.match(access, /apiClient\.get\('\/saas\/credits\/access'\)/);
  assert.match(access, /current\.permissions\.includes\(permission\)/);
  assert.match(route, /!featureAccess\.can\(requiredPermission\)/);
  assert.match(route, /isAccountRoute && !featureAccess\.isCompanyOwner/);
  assert.match(route, /missingJobAccess/);
  assert.doesNotMatch(route, /isCompanyOwner\s*\|\|\s*featureAccess\.can/);
});
