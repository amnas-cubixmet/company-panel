import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPermissionForPath } from '../src/utils/permissions.js';

const source = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('owner storage usage, day logs and file event history share the free Account permission', () => {
  for (const url of ['/account/storage', '/account/storage/history', '/account/storage/history/2026-10-16']) {
    assert.equal(getPermissionForPath(url), 'billing.view');
  }
  const header = source('src/components/account/AccountHeader.jsx');
  assert.match(header, /'storage','Storage','\/account\/storage',HardDrive,'billing\.view'/);
  assert.match(header, /isCompanyOwner && can\(tab\[4\]\)/);
  const routes = source('src/routes/AppRoutes.jsx');
  assert.match(routes, /<Route path="\/account\/storage" element=\{<SaaSAccount section="storage" \/>\}/);
  assert.match(routes, /<Route path="\/account\/storage\/history" element=\{<StorageHistory \/>\}/);
});

test('read-only storage audit is independent of paid storage.manage mutations', () => {
  const sourceText = source('src/pages/saas/SaaSAccount.jsx');
  assert.match(sourceText, /const canManageStorage = can\('storage\.manage'\)/);
  assert.match(sourceText, /if \(!canManageStorage\) return setStorageError/);
  assert.match(sourceText, /\{canManageStorage && <div className="saas-storage-actions">/);
  assert.match(sourceText, /disabled=\{storageBusy \|\| !canManageStorage\}/);
  assert.match(sourceText, /disabled=\{!canManageStorage\}/);
  assert.match(sourceText, /\{canManageStorage && <button className="saas-icon-button"/);
  assert.match(sourceText, /getStorageEvents/);
  assert.match(sourceText, /Storage usage history/);
});

test('storage logs are reachable from wallet and do not grant paid storage role access', () => {
  const wallet = source('src/pages/saas/CreditWorkspace.jsx');
  assert.match(wallet, /featureAccess\.isCompanyOwner && featureAccess\.can\('billing\.view'\)/);
  assert.match(wallet, /navigate\('\/account\/storage'\)/);
  assert.match(wallet, /navigate\('\/account\/storage\/history'\)/);
  const access = source('src/context/FeatureAccessContext.jsx');
  assert.match(access, /access\.freeModules\?\.includes\(module\)/);
  assert.match(access, /current\.permissions\.includes\(permission\)/);
  const routeGuard = source('src/routes/ProtectedRoute.jsx');
  assert.match(routeGuard, /isAccountRoute && !featureAccess\.isCompanyOwner/);
});
