import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const menu = read('src/routes/routeConfig.js');
const routes = read('src/routes/AppRoutes.jsx');
const desktop = read('src/components/layout/Sidebar.jsx');
const mobile = read('src/components/layout/MobileSlideSidebar.jsx');
const permission = read('src/utils/permissions.js');
const guard = read('src/routes/ProtectedRoute.jsx');
const page = read('src/pages/suppliers/SupplierWorkspace.jsx');
const service = read('src/services/supplierFinance.service.js');

test('Suppliers is one expandable parent with exactly four distinct child routes', () => {
  assert.equal((menu.match(/id: 'suppliers', label: 'Suppliers'/g) || []).length, 1);
  for (const [label,path] of [
    ['All Suppliers', '/suppliers'],
    ['Credit Management', '/suppliers/credits'],
    ['Purchase History', '/suppliers/purchases'],
    ['Supplier Payments', '/suppliers/payments'],
  ]) {
    assert.ok(menu.includes("label: '" + label + "'"), label);
    assert.ok(menu.includes("path: '" + path + "'"), path);
    const exact = path.replaceAll('/', '\\/');
    assert.equal((routes.match(new RegExp('path="' + exact + '"', 'g')) || []).length, 1, path);
  }
  assert.match(routes, /SupplierWorkspace = lazyPage/);
  assert.doesNotMatch(menu, /id: 'supplier-credits', label: 'Suppliers'/);
  assert.match(menu, /export const supplierSubmenu/);
});

test('desktop and mobile menus expand and close without duplicate navigation items', () => {
  assert.match(desktop, /aria-expanded=\{supplierExpanded\}/);
  assert.match(desktop, /supplier-desktop-submenu/);
  assert.match(desktop, /setSupplierExpanded/);
  assert.match(desktop, /supplierSubmenu\.filter\(item => featureAccess\.can\(item\.permission\)\)/);
  assert.match(desktop, /<NavLink key=\{item\.id\} to=\{item\.path\} end/);
  assert.match(mobile, /aria-expanded=\{supplierExpanded\}/);
  assert.match(mobile, /supplier-mobile-submenu/);
  assert.match(mobile, /onClick=\{onClose\}/);
  assert.match(mobile, /supplierSubmenu\.filter\(item => featureAccess\.can\(item\.permission\)\)/);
  assert.match(desktop, /var\(--primary-soft\)/);
  assert.match(mobile, /var\(--primary-soft\)/);
});

test('direct supplier finance routes need stock and expense permissions', () => {
  assert.match(permission, /'\/suppliers': 'stock'/);
  assert.match(permission, /'\/suppliers\/credits', 'expenses\.view'/);
  assert.match(permission, /'\/suppliers\/payments', 'expenses\.view'/);
  assert.match(guard, /missingSupplierAccess/);
  assert.match(guard, /!featureAccess\.can\('stock\.view'\)/);
  assert.match(guard, /!featureAccess\.can\('expenses\.view'\)/);
  assert.match(page, /featureAccess\.can\('stock\.edit'\)/);
  assert.match(page, /featureAccess\.can\('expenses\.create'\)/);
});

test('credit balances come only from Django; outgoing payments are written to supplier settlement endpoint', () => {
  assert.match(service, /supplierService\.list\(\)/);
  assert.match(service, /supplierService\.purchaseOrders\(\)/);
  assert.match(service, /apiClient\.get\('\/stock\/supplier-credits'\)/);
  assert.match(service, /apiClient\.get\('\/stock\/supplier-payments'\)/);
  assert.match(service, /apiClient\.post\('\/stock\/supplier-payments', payload\)/);
  assert.match(service, /USE_MOCK_API/);
  assert.match(service, /Mock supplier balances and payments are disabled/);
  assert.doesNotMatch(service, /localStorage|stockSuppliersMock|expensesMock|paymentsMock/);
  assert.match(page, /idempotencyKey: pendingPaymentRef\.current\.idempotencyKey/);
  assert.match(page, /payment is recorded in Expenses and linked to this credit/);
  assert.match(page, /amount > num\(selectedCredit\.outstanding\)/);
  assert.match(page, /only existing, fully received/i);
});
