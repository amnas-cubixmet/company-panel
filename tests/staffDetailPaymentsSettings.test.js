import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('staff detail keeps only its own tabs and removes redundant Back button', () => {
  const shell = read('src/pages/employees/StaffManagement.jsx');
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const card = read('src/components/staff-management/StaffDirectoryCard.jsx');
  assert.match(shell, /activeSection !== 'profile' && <StaffManagementTabs \/>/);
  assert.doesNotMatch(profile, /aria-label="Back to staff"|onClick=\{goBack\}/);
  assert.match(profile, /className="staff-profile-tabs staff360-tabs"/);
  assert.match(card, /className="staff-directory-full-link"/);
  assert.match(card, /to=\{\`\/staff-management\/staff\/\$\{encodeURIComponent\(staff\.id\)\}\`\}/);
  assert.match(card, /aria-label=\{\`Open \$\{staff\.name\} staff profile\`\}/);
});

test('payment settings offer rate and existing audited Cash/Bank wage payout routes', () => {
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const editor = read('src/components/payroll/EmployeePayConfigurationSheet.jsx');
  const wage = read('src/pages/payroll/DailyWageAccountPage.jsx');
  assert.match(profile, /canViewPayroll && can\('payroll\.rates\.manage'\)/);
  assert.match(profile, /canViewPayroll && can\('payroll\.payments\.record'\)/);
  assert.match(profile, /if \(!canEditWageRate \|\| paymentSettingsBusy \|\| !staff\?\.id\) return/);
  assert.match(profile, /await dailyWageService\.account\(staff\.id\)/);
  assert.match(profile, /onClick=\{openPaymentSettings\}/);
  assert.match(profile, /Payment Settings/);
  assert.match(profile, /Cash Payment/);
  assert.match(profile, /Bank Payment/);
  assert.match(profile, /state: \{ openPayment: true, paymentMethod: method \}/);
  assert.match(profile, /<EmployeePayConfigurationSheet/);
  assert.match(profile, /<ResponsiveModalSheet/);
  assert.match(editor, /dailyWageService\.addRate\(employeeId/);
  assert.match(editor, /aria-invalid=\{Boolean\(fieldErrors\.rate\)\}/);
  assert.match(editor, /aria-invalid=\{Boolean\(fieldErrors\.effectiveFrom\)\}/);
  assert.match(editor, /aria-invalid=\{Boolean\(fieldErrors\.reason\)\}/);
  assert.doesNotMatch(profile, /dailyWageService\.pay\(/);
  assert.match(wage, /dailyWageService\.pay\(id/);
  assert.match(wage, /location\.state\?\.openPayment/);
  assert.match(wage, /chosen\.currentBalance/);
  assert.match(wage, /Select account/);
  assert.match(wage, /insufficient|Insufficient/);
});

test('bank/cash payment setting and error borders are accessible on mobile', () => {
  const css = read('src/styles/staff-payment-settings.css');
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const wage = read('src/pages/payroll/DailyWageAccountPage.jsx');
  assert.match(profile, /Unable to load daily wage rate/);
  assert.match(profile, /paymentSettingsError && \(/);
  assert.match(profile, /role="alert"/);
  assert.match(css, /staff-payment-settings-ways/);
  assert.match(css, /aria-invalid="true"/);
  assert.match(css, /#dc2626/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.doesNotMatch(wage, /className="dw-text-link dw-back"/);
});

test('reset link is not offered for the owner or elevated system roles', () => {
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const share = read('src/utils/staffManualInvite.js');
  assert.match(profile, /canManageLogin && !isOwnProfile/);
  assert.match(profile, /super admin/);
  assert.match(profile, /Account Security/);
  assert.match(profile, /'\/account\/security'/);
  assert.match(profile, /Record staff WhatsApp consent/);
  assert.match(profile, /\['queued', 'sending', 'sent'\]/);
  assert.match(share, /\['queued', 'sending', 'sent'\]\.includes\(status\)/);
});
