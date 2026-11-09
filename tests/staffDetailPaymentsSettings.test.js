import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('staff profile hides top directory tabs but preserves staff list navigation', () => {
  const shell = read('src/pages/employees/StaffManagement.jsx');
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  assert.match(shell, /activeSection !== 'profile' && <StaffManagementTabs \/>/);
  assert.match(shell, /activeSection === 'profile' \? null : <StaffManagementHeader \/>/);
  assert.match(profile, /aria-label="Back to staff"/);
  assert.match(profile, /onClick=\{goBack\}/);
  // The employee's own Attendance, Work, Payroll and Documents tabs remain.
  assert.match(profile, /className="staff-profile-tabs staff360-tabs"/);
});

test('staff payment settings use the real wage API and existing rate editor', () => {
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const editor = read('src/components/payroll/EmployeePayConfigurationSheet.jsx');
  assert.match(profile, /const canEditPaymentSettings = canViewPayroll && can\('payroll\.rates\.manage'\)/);
  assert.match(profile, /if \(!canEditPaymentSettings \|\| paymentSettingsBusy \|\| !staff\?\.id\) return/);
  assert.match(profile, /await dailyWageService\.account\(staff\.id\)/);
  assert.match(profile, /dailyRate: account\?\.currentRate/);
  assert.match(profile, /onClick=\{openPaymentSettings\}/);
  assert.match(profile, /Payment Settings/);
  assert.match(profile, /<EmployeePayConfigurationSheet/);
  assert.match(profile, /structure=\{paymentStructure\}/);
  assert.match(profile, /setPaymentSettingsOpen\(false\)/);
  assert.match(editor, /dailyWageService\.addRate\(employeeId/);
  assert.doesNotMatch(profile, /dailyWageService\.pay\(/);
  assert.doesNotMatch(profile, /apiClient\.post\(/);
});

test('staff payment settings handle backend failure and support mobile touch targets', () => {
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const css = read('src/styles/staff-management-compact.css');
  assert.match(profile, /Unable to load payment settings/);
  assert.match(profile, /paymentSettingsError && \(/);
  assert.match(profile, /role="alert"/);
  assert.match(profile, /disabled=\{paymentSettingsBusy\}/);
  assert.match(css, /\.staff360-payment-settings/);
  assert.match(css, /min-height: 44px !important/);
});
