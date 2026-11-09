import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('staff list uses searchable responsive rows with protected actions', () => {
  const page = read('src/pages/staff-management/Staff.jsx');
  const row = read('src/components/staff-management/StaffDirectoryCard.jsx');
  const toolbar = read('src/components/staff-management/StaffDirectoryToolbar.jsx');
  assert.match(page, /staffService\.getStaff\(\{ liveOnly: true \}\)/);
  assert.match(page, /staff-directory-table-header/);
  assert.match(page, /staff-directory-table/);
  assert.match(page, /canViewPay=\{canViewPayroll \|\| canManagePayroll\}/);
  assert.match(page, /onToggleStatus=\{canEditStaff \?/);
  assert.match(row, /staff-directory-row/);
  assert.match(row, /staff\.phone/);
  assert.match(row, /staff\.role/);
  assert.match(row, /hasRate/);
  assert.match(row, /onOpenWages &&/);
  assert.match(row, /aria-label=\{\`View \$\{staff\.name\} profile\`\}/);
  assert.match(toolbar, /onQueryChange/);
  assert.match(toolbar, /hasPermission\(user, 'staff\.create'\)/);
});

test('role creation keeps explicit safe quick presets and full custom controls', () => {
  const page = read('src/pages/staff-management/UserRoles.jsx');
  const editor = read('src/components/staff-management/RoleEditorForm.jsx');
  const matrix = read('src/components/staff-management/RolePermissionMatrix.jsx');
  const roles = read('src/components/staff-management/RoleCardGrid.jsx');
  assert.match(page, /roleService\.createRole\(formData\)/);
  assert.match(page, /roleService\.updateRole\(editingRole\.id/);
  assert.match(page, /roleSearch/);
  assert.match(page, /role\.isProtected/);
  assert.match(roles, /disabled=\{Number\(role\.usersCount\) > 0\}/);
  for (const label of ['View only', 'No access', 'Custom']) assert.ok(editor.includes(label));
  assert.match(editor, /value === 'viewer' && action === 'view'/);
  assert.match(editor, /\['dashboard', 'customers', 'vehicles', 'services', 'jobs', 'stock'\]/);
  assert.match(editor, /setMode\('custom'\)/);
  assert.match(editor, /aria-expanded=\{advanced\}/);
  assert.match(editor, /<RolePermissionMatrix/);
  assert.match(matrix, /Search permission modules/);
  assert.match(matrix, /disabled=\{protectedRole\}/);
  assert.match(matrix, /onToggleModule\(module\.key, !allChecked\)/);
});

test('staff profile retains useful tabs, real wage account and documented actions', () => {
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const stylesheet = read('src/styles/staff-management-compact.css');
  const layout = read('src/pages/employees/StaffManagement.jsx');
  assert.doesNotMatch(profile, /\['Performance', Gauge\]/);
  assert.doesNotMatch(profile, /\['Activity History', Activity\]/);
  assert.doesNotMatch(profile, /className="staff360-quick-grid"/);
  assert.match(profile, /\['Attendance', CalendarDays\]/);
  assert.match(profile, /\['Assigned Work', BriefcaseBusiness\]/);
  assert.match(profile, /\['Payroll', WalletCards\]/);
  assert.match(profile, /\['Documents', FileText\]/);
  assert.match(profile, /canViewPayroll \|\| canManagePayroll \|\| isOwnProfile/);
  assert.match(profile, /navigate\(\`\/staff\/\$\{staff\.id\}\/wages\`\)/);
  assert.match(profile, /handleToggleAccount/);
  assert.match(profile, /handleSendInvite/);
  assert.match(profile, /handleCopyInvite/);
  assert.match(profile, /staff360-more-actions/);
  assert.match(stylesheet, /@media \(max-width: 1250px\)/);
  assert.match(stylesheet, /@media \(max-width: 560px\)/);
  assert.match(layout, /import '\.\.\/\.\.\/styles\/staff-management-compact\.css'/);
});
