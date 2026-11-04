import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAccountOnly, setupRedirect } from '../src/utils/accountWorkspace.js';

const source = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const base = {
  enforced: true, paidAccessRequired: true, labelOnly: true,
  modules: [], activeLabelModules: [], freeModules: ['billing','dashboard','roles','settings','staff'],
  permissions: ['billing.view','dashboard.view','settings.view','settings.manage','staff.view','staff.create','company.manage'],
  isCompanyOwner: true, unavailable: false,
};

test('free dashboard and staff keep owner out of paywall even with zero paid labels', () => {
  assert.equal(isAccountOnly(base), false);
  assert.equal(setupRedirect(base, '/dashboard'), null);
  assert.equal(setupRedirect(base, '/staff-management/overview'), null);
  assert.equal(setupRedirect(base, '/settings'), null);
  assert.equal(setupRedirect(base, '/account'), null);
});

test('free staff module is accessible by authorized staff without owner billing', () => {
  const staff = {...base, isCompanyOwner: false, permissions: ['staff.view','staff.create']};
  assert.equal(isAccountOnly(staff), false);
  assert.equal(setupRedirect(staff, '/staff-management/overview'), null);
});

test('settings is free for permitted staff even with no paid module entitlement', () => {
  const allowed = {...base, isCompanyOwner: false, permissions: ['settings.view']};
  assert.equal(isAccountOnly(allowed), false);
  assert.equal(setupRedirect(allowed, '/settings'), null);
  const denied = {...base, isCompanyOwner: false, permissions: []};
  assert.equal(isAccountOnly(denied), true);
});

test('roles are free but require the existing company-admin permission', () => {
  const admin = {...base, isCompanyOwner: false, permissions: ['company.manage']};
  // Roles are part of free core access; the role-management screen itself
  // requires company.manage, enforced by Django on every role API request.
  assert.equal(setupRedirect(admin, '/staff-management/roles'), null);
  const staff = {...base, isCompanyOwner: false, permissions: ['staff.view']};
  assert.equal(setupRedirect(staff, '/staff-management/roles'), null);
  // Route guard must still reject this staff member for company.manage.
  assert.match(source('src/routes/ProtectedRoute.jsx'), /featureAccess\.can\(requiredPermission\)/);
});

test('no free role permissions preserves safe account-only setup flow', () => {
  const noFree = {...base, permissions: ['billing.view']};
  assert.equal(isAccountOnly(noFree), true);
  assert.equal(setupRedirect(noFree, '/dashboard'), '/account');
  assert.equal(setupRedirect(noFree, '/jobs'), '/account');
  assert.equal(setupRedirect({...noFree, isCompanyOwner:false}, '/account'), '/access-denied');
  const unavailable = {...base, freeModules:[], permissions:[]};
  assert.equal(isAccountOnly(unavailable), true);
});

test('backend free module list is not confused with purchased labels', () => {
  const access = source('src/context/FeatureAccessContext.jsx');
  assert.match(access, /response\.freeModules/);
  assert.match(access, /freeModules: \[\]/);
  assert.match(access, /access\.freeModules\?\.includes\(module\)/);
  assert.match(access, /access\.permissions\.includes\(permission\)/);
  assert.match(access, /access\.labelOnly && !access\.activeLabelModules\.includes\(module\)/);
  assert.match(access, /current\.permissions\.includes\(permission\)/);
  assert.match(access, /setAccess\(\{ \.\.\.LOCKED, userKey \}\)/);
});

test('dashboard retains free overview widgets but hides paid data/actions by permission', () => {
  const dashboard = source('src/pages/dashboard/Dashboard.jsx');
  const stat = source('src/components/dashboard/DashboardStats.jsx');
  const panels = source('src/components/dashboard/DashboardBottomGrid.jsx');
  assert.match(dashboard, /fetchDashboard\(\);/);
  assert.doesNotMatch(dashboard, /if \(featureAccess\.enforced\) \{\s*setLoading\(false\);/);
  assert.doesNotMatch(dashboard, /Your available modules|routeConfig\.filter/);
  assert.match(source('src/components/layout/MobileBottomNav.jsx'), /featureAccess\.can\(route\.permission\)/);
  assert.match(dashboard, /can\('jobs\.view'\)/);
  assert.match(stat, /stats\.filter\(\(stat\) => can\(stat\.permission\)\)/);
  assert.match(panels, /can\('staff\.view'\)/);
  assert.match(panels, /can\('payments\.view'\)/);
});

test('free module cards appear on the SaaS account overview without purchase action', () => {
  const wallet = source('src/pages/saas/CreditWorkspace.jsx');
  assert.match(wallet, /featureAccess\.freeModules\?\.includes\(route\.permission\.split\('\.'\)\[0\]\)/);
  assert.match(wallet, /featureAccess\.can\(route\.permission\)/);
  assert.match(wallet, /aria-label="Free modules"/);
  assert.match(wallet, /Free • allowed by your role/);
  assert.match(wallet, /section === 'overview'/);
  assert.match(wallet, /'credits', 'dashboard', 'settings', 'staff-management'/);
  assert.match(wallet, /Paid workshop modules \(\{paidBundles\.length\}\)/);
  assert.match(wallet, /paidBundles\.map\(\(bundle\)/);
  assert.match(wallet, /!featureAccess\.freeModules\?\.includes/);
  assert.doesNotMatch(wallet, /features\.filter\(feature => !freeKeys\.includes\(feature\.key\)\)\.map/);
  assert.match(wallet, /purchaseDisabledReason === 'FREE_MODULES_ONLY'/);
  assert.match(wallet, /freeKeys = \['dashboard', 'settings', 'staff', 'roles', 'billing'\]/);
  assert.match(wallet, /featureAccess\.freeModules\?\.includes\('roles'\)/);
  assert.match(wallet, /featureAccess\.can\('company\.manage'\)/);
  assert.match(wallet, /label: 'Roles & Permissions'/);
  assert.match(wallet, /path: '\/staff-management\/roles'/);
  const access = source('src/context/FeatureAccessContext.jsx');
  assert.match(access, /'dashboard', 'settings', 'staff', 'roles', 'billing'/);
  const pathPermissions = source('src/utils/permissions.js');
  assert.match(pathPermissions, /\['\/staff-management\/roles', 'company\.manage'\]/);
});

test('existing route guard and mobile/desktop menus remain server authorized', () => {
  const guard = source('src/routes/ProtectedRoute.jsx');
  assert.match(guard, /moduleIsVisible\(featureAccess, requiredPermission\)/);
  assert.match(guard, /featureAccess\.can\(requiredPermission\)/);
  for (const file of ['src/components/layout/Sidebar.jsx','src/components/layout/MobileBottomNav.jsx','src/components/layout/MobileSlideSidebar.jsx']) {
    assert.match(source(file), /featureAccess\.can\(route\.permission\)/);
  }
});
