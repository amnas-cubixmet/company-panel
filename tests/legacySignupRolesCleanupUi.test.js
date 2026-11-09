import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('company roles come only from Django, with a separate old-seed preview', () => {
  const service = read('src/services/role.service.js');
  assert.match(service, /apiClient\.get\('\/roles\/'\)/);
  assert.match(service, /previewLegacyRoles: async \(\) => apiClient\.get\('\/roles\/legacy-presets\/'\)/);
  assert.match(service, /removeLegacyRoles: async \(roleIds\) => apiClient\.post\(/);
  assert.match(service, /'\/roles\/legacy-presets\/', \{ roleIds \}/);
  assert.doesNotMatch(service, /mockRolesList|setTimeout\(/);
});

test('preview and cleanup controls are company-owner-only and explicitly confirmed', () => {
  const page = read('src/pages/staff-management/UserRoles.jsx');
  assert.match(page, /const featureAccess = useFeatureAccess\(\)/);
  assert.match(page, /const \{ isCompanyOwner \} = featureAccess;/);
  assert.match(page, /if \(isCompanyOwner\) \{\s*try \{\s*const preview = await roleService\.previewLegacyRoles\(\)/);
  assert.match(page, /if \(!isCompanyOwner \|\| cleanupBusy \|\| !legacyPresetRoles\.length\) return/);
  assert.match(page, /const confirmed = await appConfirm\(/);
  assert.match(page, /if \(!confirmed\) return/);
  assert.match(page, /roleService\.removeLegacyRoles\(legacyPresetRoles\.map\(role => role\.id\)\)/);
  assert.match(page, /isCompanyOwner && legacyPresetRoles\.length > 0/);
  assert.match(page, /legacyPresetRoles\.map\(role => <li key=\{role\.id\}>\{role\.name\}<\/li>\)/);
  assert.match(page, /await loadRoles\(\)/);
  assert.match(page, /Custom and assigned roles were kept/);
  assert.doesNotMatch(page, /automaticallyDelete|removeLegacyRoles\(\[\]\)/);
});

test('legacy review is responsive and does not alter role metadata or access', () => {
  const css = read('src/styles/staff-management.css');
  assert.match(css, /\.roles-legacy-review/);
  assert.match(css, /@media \(max-width: 600px\)/);
  const page = read('src/pages/staff-management/UserRoles.jsx');
  assert.match(page, /<RoleCardGrid/);
  assert.match(page, /roles-search-row/);
  assert.match(page, /roles=\{visibleRoles\}/);
  assert.doesNotMatch(page, /<RoleOverviewStats/);
});
