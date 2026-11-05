import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('label-only mode checks activated company module AND backend role intersection', () => {
  const access = read('src/context/FeatureAccessContext.jsx');
  assert.match(access, /response\.labelOnly === true/);
  assert.match(access, /response\.activeLabelModules/);
  assert.match(access, /access\.labelOnly && !access\.activeLabelModules\.includes\(module\)/);
  assert.match(access, /current\.permissions\.includes\(permission\)/);
  assert.match(access, /nextLabelExpiryAt/);
  assert.match(access, /window\.setTimeout\(refresh, delay\)/);
  assert.match(access, /location\.pathname/);
  assert.match(access, /cubegear:credits-updated/);
});

test('protected routes, search, desktop and mobile navigation share authorization', () => {
  const guard = read('src/routes/ProtectedRoute.jsx');
  assert.match(guard, /moduleIsVisible\(featureAccess, requiredPermission\)/);
  assert.match(guard, /featureAccess\.can\(requiredPermission\)/);
  for (const file of [
    'src/components/layout/Sidebar.jsx',
    'src/components/layout/MobileSlideSidebar.jsx',
    'src/components/layout/MobileBottomNav.jsx',
  ]) assert.match(read(file), /featureAccess\.can\(route\.permission\)/);
  const search = read('src/components/common/GlobalSearch.jsx');
  assert.match(search, /getPermissionForPath\(/);
  assert.match(search, /can\(permission\)/);
  assert.match(search, /results\.filter\(/);
});

test('dashboard and account never advertise inactive-label workshop modules', () => {
  const dashboard = read('src/pages/dashboard/Dashboard.jsx');
  // Module shortcuts were intentionally removed; the sidebar still filters access.
  assert.doesNotMatch(dashboard, /Your available modules|routeConfig\.filter/);
  assert.match(dashboard, /can\('jobs\.view'\)/);
  assert.match(read('src/components/layout/Sidebar.jsx'), /featureAccess\.can\(route\.permission\)/);
  const account = read('src/pages/saas/CreditWorkspace.jsx');
  assert.match(account, /featureAccess\.can\(route\.permission\)/);
  assert.match(account, /featureAccess\.activeLabelModules\.length/);
  assert.doesNotMatch(account, /section === 'features' && !featureAccess\.labelOnly/);
  assert.match(account, /section === 'overview' && <section className="cg-credit-panel cg-bundle-marketplace"/);
  assert.match(account, /notifyCreditChange\(\)/);
});

test('nested Job Card invoice and parts are hidden without respective labels', () => {
  const paths = read('src/utils/permissions.js');
  assert.match(paths, /jobs.*invoice/);
  const job = read('src/pages/jobs/JobCardWorkspace.jsx');
  assert.match(job, /const hasInvoiceAccess = can\('invoices\.view'\)/);
  assert.match(job, /const hasStockAccess = can\('stock\.view'\)/);
  assert.match(job, /visibleTabs = TABS\.filter\(\(\[key\]\) => GUIDED_STAGES\.includes\(key\) && moduleTabAllowed\(key\)\)/);
  assert.match(job, /hasInvoiceAccess && activeTab === 'invoice'/);
  assert.match(job, /hasStockAccess && activeTab === 'parts'/);
});
