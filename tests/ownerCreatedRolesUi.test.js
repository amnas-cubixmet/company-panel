import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/staff-management/UserRoles.jsx');
const service = read('src/services/role.service.js');
const header = read('src/components/staff-management/RolesHeader.jsx');
const cards = read('src/components/staff-management/RoleCardGrid.jsx');
const roleForm = read('src/components/staff-management/RoleEditorForm.jsx');
const matrix = read('src/config/rolePermissions.js');
const staffAdd = read('src/pages/staff-management/StaffAddPage.jsx');

test('roles list, create, edit and delete always call Django; never mock data', () => {
  assert.match(service, /apiClient\.get\('\/roles\/'\)/);
  assert.match(service, /apiClient\.post\('\/roles\/'/);
  assert.match(service, /apiClient\.patch/);
  assert.match(service, /apiClient\.delete/);
  assert.doesNotMatch(service, /mockRolesList|USE_MOCK_API|setTimeout/);
  assert.match(page, /roleService\.getRoles\(\)/);
  assert.match(page, /setRoles\(Array\.isArray\(data\) \? data : \[\]\)/);
});

test('only backend-verified company owner can mutate tenant role settings', () => {
  assert.match(page, /useFeatureAccess\(\)/);
  assert.match(page, /if \(!isCompanyOwner\) return/);
  assert.match(page, /if \(!isCompanyOwner \|\| saving \|\| editingRole\?\.isProtected\) return/);
  assert.match(page, /if \(!isCompanyOwner \|\| saving \|\| role\.isProtected \|\| Number\(role\.usersCount\) > 0\) return/);
  assert.match(page, /<RolesHeader onAdd=\{handleOpenAdd\} canManage=\{isCompanyOwner\}/);
  assert.match(page, /canManage=\{isCompanyOwner\}/);
  assert.match(header, /canManage &&/);
  assert.match(cards, /canManage &&/);
  assert.match(cards, /disabled=\{Number\(role\.usersCount\) > 0\}/);
  assert.match(page, /await appConfirm/);
  assert.doesNotMatch(page, /window\.confirm/);
});

test('role editor removes fabricated branch scope and fake descriptions', () => {
  assert.doesNotMatch(page, /Main Garage Branch|branchScope|selectedBranches/);
  assert.doesNotMatch(roleForm, /branchScope|Description<\/span>|Brief summary/);
  assert.doesNotMatch(cards, /Branch Scope|Assigned Branch Only|All Company Branches/);
  assert.match(page, /code: role\.code/);
  assert.doesNotMatch(service, /branchScope: 'All Company Branches'/);
  assert.doesNotMatch(matrix, /key: 'company'/);
  assert.doesNotMatch(matrix, /key: 'billing'/);
});

test('staff creation dropdown shows owner-created roles, not predefined professions', () => {
  assert.doesNotMatch(staffAdd, /designation: ''|name="designation"/);
  assert.match(staffAdd, /Choose role/);
  assert.match(staffAdd, /No roles available/);
  assert.doesNotMatch(staffAdd, /designation: 'Mechanic'/);
});
