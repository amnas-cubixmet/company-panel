import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Supplier directory/detail routes are protected and discoverable in desktop and mobile navigation', () => {
  const routes = source('src/routes/AppRoutes.jsx');
  const navigation = source('src/routes/routeConfig.js');
  const permissions = source('src/utils/permissions.js');
  const desktop = source('src/components/layout/Sidebar.jsx');
  const mobile = source('src/components/layout/MobileSlideSidebar.jsx');
  assert.match(routes, /path="\/suppliers" element=\{<SuppliersPage \/>\}/);
  assert.match(routes, /path="\/suppliers\/:id" element=\{<SuppliersPage \/>\}/);
  assert.match(navigation, /id: 'suppliers', label: 'Suppliers', path: '\/suppliers'/);
  assert.match(navigation, /permission: 'stock.view'/);
  assert.match(permissions, /'\/suppliers': 'stock'/);
  assert.match(desktop, /routeConfig\.filter/);
  assert.match(mobile, /routeConfig\.filter/);
});

test('Supplier page uses company-scoped Django endpoints and never fakes credit balances', () => {
  const page = source('src/pages/suppliers/SuppliersPage.jsx');
  const service = source('src/services/supplier.service.js');
  assert.match(service, /const base = '\/stock\/suppliers'/);
  assert.match(service, /'\/stock\/purchase-orders'/);
  assert.match(service, /'\/stock'/);
  assert.match(page, /Supplier Information/);
  assert.match(page, /Purchase Orders/);
  assert.match(page, /Supplied Products/);
  assert.match(page, /Add Supplier/);
  assert.match(page, /Edit Supplier/);
  assert.match(page, /can\('stock.create'\)/);
  assert.match(page, /can\('stock.edit'\)/);
  assert.doesNotMatch(page, /Outstanding Balance|Credit Balance|creditBalance:\s*0/);
});

test('Supplier list has search and responsive theme-aware controls', () => {
  const page = source('src/pages/suppliers/SuppliersPage.jsx');
  const css = source('src/styles/suppliers-workspace.css');
  assert.match(page, /Search suppliers/);
  assert.match(page, /setParams\(p,\{replace:true\}\)/);
  assert.match(page, /No suppliers added yet/);
  assert.match(page, /role="alert"/);
  assert.match(css, /--text-primary/);
  assert.match(css, /--surface/);
  assert.match(css, /@media\(max-width:480px\)/);
});
