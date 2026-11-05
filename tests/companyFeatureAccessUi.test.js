import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('dashboard stat/action components get a callable can from the context', () => {
  const context = src('src/context/FeatureAccessContext.jsx');
  assert.match(context, /const can = useCallback\(\(permission\) =>/);
  assert.match(context, /loading: checking, refresh, can/);
  for (const path of [
    'src/components/dashboard/DashboardStats.jsx',
    'src/components/dashboard/DashboardBottomGrid.jsx',
    'src/components/dashboard/QuickActionsPanel.jsx',
  ]) assert.match(src(path), /const \{ can \} = useFeatureAccess\(\)/);
});

test('company identity never comes from a shared placeholder', () => {
  const context = src('src/context/CompanyContext.jsx');
  assert.match(context, /const source = user\?\.company/);
  assert.match(context, /override\?\.id === String\(source\.id\)/);
  assert.doesNotMatch(context, /CMP_99|CubixGear Motors Inc\./);
});

test('workspace search is tenant-scoped by backend and obeys UI route permissions', () => {
  const search = src('src/components/common/GlobalSearch.jsx');
  const service = src('src/services/globalSearch.service.js');
  assert.match(search, /getPermissionForPath\(/);
  assert.match(search, /can\(permission\)/);
  assert.match(search, /results\.filter\(/);
  assert.match(service, /apiClient\.get\('\/search'/);
  assert.doesNotMatch(service, /localStorage|searchMockData|searchPages/);
  assert.doesNotMatch(search, /localStorage/);
});

test('account, settings, search and header share paid module access', () => {
  assert.match(src('src/components/account/AccountHeader.jsx'), /visibleTabs = tabs\.filter\(tab => isCompanyOwner && can\(tab\[4\]\)\)/);
  assert.match(src('src/pages/saas/CreditWorkspace.jsx'), /featureAccess\.can\(route\.permission\)/);
  assert.match(src('src/components/layout/Header.jsx'), /canViewSettings = can\('settings\.view'\)/);
  assert.match(src('src/pages/settings/Settings.jsx'), /visibleSections = useMemo/);
  assert.match(src('src/pages/settings/Settings.jsx'), /can\(SETTINGS_SECTION_PERMISSIONS\[section\.id\]\)/);
});
