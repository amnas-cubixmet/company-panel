import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('server entitlements are loaded, are company-scoped and invalid responses fail closed', () => {
  const source = file('src/context/FeatureAccessContext.jsx');
  assert.match(source, /apiClient\.get\('\/saas\/credits\/access'\)/);
  assert.match(source, /const LOCKED = Object\.freeze\(/);
  assert.match(source, /setAccess\(\{ \.\.\.LOCKED, userKey \}\)/);
  assert.match(source, /response\.companyId/);
  assert.match(source, /current\.permissions\.includes\(permission\)/);
  assert.match(source, /cubegear:credits-updated/);
  assert.doesNotMatch(source, /error\?\.status === 404/);
  assert.match(source, /access\.freeModules\?\.includes\(module\)/);
  assert.match(source, /return access\.permissions\.includes\(permission\)/);
  assert.match(source, /if \(module === 'dashboard'\) return access\.permissions\.includes\('dashboard\.view'\)/);
});

test('desktop and mobile navigation use the same effective permission check', () => {
  for (const path of [
    'src/components/layout/Sidebar.jsx',
    'src/components/layout/MobileBottomNav.jsx',
    'src/components/layout/MobileSlideSidebar.jsx',
  ]) assert.match(file(path), /featureAccess\.can\(route\.permission\)/);
});

test('dashboard and direct routes block disabled workshop modules', () => {
  const guard = file('src/routes/ProtectedRoute.jsx');
  assert.match(guard, /setupRedirect\(featureAccess, location\.pathname\)/);
  assert.match(guard, /featureAccess\.can\(requiredPermission\)/);
  assert.match(guard, /moduleIsVisible\(featureAccess, requiredPermission\)/);
  const dashboard = file('src/pages/dashboard/Dashboard.jsx');
  assert.doesNotMatch(dashboard, /Your available modules|routeConfig\.filter/);
  assert.match(dashboard, /can\('jobs\.view'\)/);
  assert.match(file('src/components/layout/Sidebar.jsx'), /featureAccess\.can\(route\.permission\)/);
});

test('feature activation remains server-validated and refreshes account access', () => {
  const source = file('src/pages/saas/CreditWorkspace.jsx');
  assert.match(source, /creditWalletService\.purchaseBundle\(bundle\.id\)/);
  assert.match(source, /notifyCreditChange\(\)/);
  assert.match(source, /Company feature access/);
});
