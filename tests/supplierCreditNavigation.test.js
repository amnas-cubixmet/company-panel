import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const menu = read('src/routes/routeConfig.js');
const routes = read('src/routes/AppRoutes.jsx');
const desktop = read('src/components/layout/Sidebar.jsx');
const mobile = read('src/components/layout/MobileSlideSidebar.jsx');
const permission = read('src/utils/permissions.js');
const guard = read('src/routes/ProtectedRoute.jsx');
const page = read('src/pages/stock/SupplierFinancePage.jsx');
const service = read('src/services/supplierFinance.service.js');
const suppliers = read('src/pages/suppliers/SuppliersPage.jsx');

test('Suppliers remains one parent with four available submenu URLs', () => {
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
  assert.match(routes, /path="\/suppliers\/credits" element=\{<Navigate to="\/stock\/suppliers\?tab=overview" replace \/>\}/);
  assert.match(routes, /path="\/suppliers\/payments" element=\{<Navigate to="\/stock\/suppliers\?tab=payment" replace \/>\}/);
  assert.match(menu, /export const supplierSubmenu/);
});

test('desktop and mobile Supplier navigation continue to use one submenu', () => {
  assert.match(desktop, /aria-expanded=\{supplierExpanded\}/);
  assert.match(desktop, /supplier-desktop-submenu/);
  assert.match(desktop, /supplierSubmenu\.filter/);
  assert.match(mobile, /aria-expanded=\{supplierExpanded\}/);
  assert.match(mobile, /supplier-mobile-submenu/);
  assert.match(mobile, /supplierSubmenu\.filter/);
});

test('supplier financial pages use stock and payments permissions', () => {
  assert.match(permission, /'\/suppliers\/credits', 'payments\.view'/);
  assert.match(permission, /'\/suppliers\/payments', 'payments\.view'/);
  assert.match(permission, /'\/stock\/suppliers', 'payments\.view'/);
  assert.match(guard, /missingSupplierAccess/);
  assert.match(guard, /!featureAccess\.can\('stock\.view'\)/);
  assert.match(guard, /!featureAccess\.can\('payments\.view'\)/);
  assert.match(menu, /permission: 'payments\.view'/);
});

test('canonical supplier financial API never fabricates balances or expenses', () => {
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
