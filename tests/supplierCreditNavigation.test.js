import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const menu = read('src/routes/routeConfig.js');
const routes = read('src/routes/AppRoutes.jsx');
const desktop = read('src/components/layout/Sidebar.jsx');
const mobile = read('src/components/layout/MobileSlideSidebar.jsx');
const tabs = read('src/components/suppliers/SupplierSectionTabs.jsx');
const tabStyles = read('src/styles/supplier-section-tabs.css');
const permission = read('src/utils/permissions.js');
const guard = read('src/routes/ProtectedRoute.jsx');
const page = read('src/pages/stock/SupplierFinancePage.jsx');
const service = read('src/services/supplierFinance.service.js');
const suppliers = read('src/pages/suppliers/SuppliersPage.jsx');

test('Suppliers retains one parent menu item and four addressable in-page tabs', () => {
  assert.equal((menu.match(/id: 'suppliers', label: 'Suppliers'/g) || []).length, 1);
  for (const [label, path] of [
    ['All Suppliers', '/suppliers'],
    ['Credit Management', '/suppliers/credits'],
    ['Purchase History', '/suppliers/purchases'],
    ['Supplier Payments', '/suppliers/payments'],
  ]) {
    assert.ok(menu.includes("label: '" + label + "'"), label);
    assert.ok(menu.includes("path: '" + path + "'"), path);
    assert.ok(routes.includes('path="' + path + '"'), path);
  }
  assert.match(routes, /path="\/stock\/suppliers" element=\{<SupplierFinancePage \/>\}/);
  assert.match(routes, /path="\/suppliers\/credits" element=\{<SupplierFinancePage section="credits" \/>\}/);
  assert.match(routes, /path="\/suppliers\/purchases" element=\{<SuppliersPage section="purchases" \/>\}/);
  assert.match(routes, /path="\/suppliers\/payments" element=\{<SupplierFinancePage section="payments" \/>\}/);
  assert.doesNotMatch(routes, /path="\/suppliers\/credits" element=\{<Navigate/);
});

test('Desktop and mobile sidebars show one Supplier link with no expandable submenu', () => {
  assert.doesNotMatch(desktop, /supplierExpanded|supplier-desktop-submenu|supplierSubmenu/);
  assert.doesNotMatch(mobile, /supplierExpanded|supplier-mobile-submenu|supplierSubmenu/);
  assert.match(desktop, /to=\{route.path\}/);
  assert.match(mobile, /to=\{route.path\}/);
  assert.match(tabs, /supplierSubmenu\.filter/);
  assert.match(tabs, /aria-label="Supplier sections"/);
  assert.match(tabs, /access\.can\('stock\.view'\)/);
  assert.match(tabs, /access\.can\(item\.permission\)/);
  assert.match(suppliers, /<SupplierSectionTabs \/>/);
  assert.match(page, /supplierSection && <SupplierSectionTabs \/>/);
});

test('Supplier tabs are responsive without horizontal slide scroll or duplicate finance tabs', () => {
  assert.match(tabStyles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(tabStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(tabStyles, /overflow-x:\s*auto|scroll-snap-type|translateX/);
  assert.match(page, /!supplierSection && <nav/);
  assert.match(suppliers, /purchaseView&&/);
  assert.match(suppliers, /supplierService\.purchaseOrders\(\)/);
  assert.match(suppliers, /Supplier Purchase Bills/);
});

test('Supplier financial routes preserve stock and payments permission checks', () => {
  assert.match(permission, /'\/suppliers\/credits', 'payments\.view'/);
  assert.match(permission, /'\/suppliers\/payments', 'payments\.view'/);
  assert.match(permission, /'\/stock\/suppliers', 'payments\.view'/);
  assert.match(guard, /missingSupplierAccess/);
  assert.match(guard, /!featureAccess\.can\('stock\.view'\)/);
  assert.match(guard, /!featureAccess\.can\('payments\.view'\)/);
  assert.match(menu, /permission: 'payments\.view'/);
});

test('Canonical supplier finance continues using actual backend ledger, bills and payments', () => {
  assert.match(service, /const root = '\/inventory\/procurement'/);
  assert.match(service, /getBills: \(supplier\)/);
  assert.match(service, /recordPayment: \(payload\)/);
  assert.match(service, /getSupplierLedger: \(id\)/);
  assert.match(service, /Supplier credit accounting requires the live Django backend/);
  assert.doesNotMatch(service, /localStorage|stockSuppliersMock|expensesMock|paymentsMock/);
  assert.match(page, /idempotencyKey: requestKey\.current/);
  assert.match(page, /finance\.recordPayment\(/);
  assert.match(page, /finance\.postBill\(/);
  assert.match(suppliers, /supplierFinanceService\.getBills\(\)/);
  assert.match(suppliers, /bill\.postingStatus !== 'Posted'/);
});
