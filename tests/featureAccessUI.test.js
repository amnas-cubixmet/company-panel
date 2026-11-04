import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const access = read('../src/context/FeatureAccessContext.jsx');
const router = read('../src/routes/ProtectedRoute.jsx');
const sidebar = read('../src/components/layout/Sidebar.jsx');
const mobile = read('../src/components/layout/MobileBottomNav.jsx');
const drawer = read('../src/components/layout/MobileSlideSidebar.jsx');
const dashboard = read('../src/pages/dashboard/Dashboard.jsx');
const dashboardStats = read('../src/components/dashboard/DashboardStats.jsx');
const grid = read('../src/components/dashboard/DashboardBottomGrid.jsx');
const creditUI = read('../src/pages/saas/CreditWorkspace.jsx');

test('real Django access endpoint authorizes all tenant navigation; no local mock fallback', () => {
  assert.match(access, /apiClient\.get\('\/saas\/credits\/access'\)/);
  assert.match(access, /setAccess\(LOCKED\)/);
  assert.match(access, /response\.enabledModules/);
  assert.match(access, /cubegear:credits-updated/);
  assert.doesNotMatch(access, /localStorage\.getItem\(['"]feature/);
});

test('backend entitlement is enforced at desktop/mobile navigation and route boundary', () => {
  assert.match(router, /useFeatureAccess/);
  assert.match(router, /!featureAccess\.can\(requiredPermission\)/);
  assert.match(router, /setupRedirect\(featureAccess, location\.pathname\)/);
  assert.match(router, /isAccountOnly\(featureAccess\)/);
  for (const widget of [sidebar, mobile, drawer]) {
    assert.match(widget, /useFeatureAccess/);
    assert.match(widget, /can\(route\.permission\)/);
  }
});

test('dashboard hides module-owned widgets instead of showing inactive data', () => {
  assert.match(dashboard, /can\('jobs\.view'\)/);
  assert.match(dashboardStats, /stats\.filter\(\(stat\) => can\(stat\.permission\)\)/);
  assert.match(grid, /can\('staff\.view'\)/);
  assert.match(grid, /can\('payments\.view'\)/);
});

test('feature UI distinguishes prepaid charges from month-end usage billing', () => {
  assert.match(creditUI, /result\?\.billingMode === 'monthly_postpaid'/);
  assert.match(creditUI, /nothing was debited today/);
  assert.match(creditUI, /postpaidAccruedCredits/);
  assert.match(creditUI, /Active · usage metered|Switch ON · pay next month/);
});
