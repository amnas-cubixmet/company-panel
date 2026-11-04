import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Inventory Management is the shared stock module label on desktop and mobile', () => {
  const routes = read('src/routes/routeConfig.js');
  const page = read('src/pages/stock/StockEasyPage.jsx');
  const mobile = read('src/components/layout/MobileBottomNav.jsx');
  const resources = read('src/pages/operations/resourceConfigs.js');

  assert.match(routes, /id: 'stock', label: 'Inventory Management', path: '\/stock'/);
  assert.match(page, /<h1>Inventory Management<\/h1>/);
  assert.match(mobile, /stock: 'Inventory'/);
  assert.match(resources, /stock: \{\s*title: 'Inventory Management'/);
  assert.doesNotMatch(routes, /label: 'Stock Management'/);
  assert.doesNotMatch(resources, /title: 'Stock Management'/);
});

test('relabeling does not change existing stock route, permissions or backend actions', () => {
  const routes = read('src/routes/routeConfig.js');
  const app = read('src/routes/AppRoutes.jsx');
  const page = read('src/pages/stock/StockEasyPage.jsx');

  assert.match(routes, /id: 'stock', label: 'Inventory Management', path: '\/stock', icon: Boxes/);
  assert.match(routes, /permission: 'stock.view'/);
  assert.match(app, /path="\/stock" element=\{<StockEasyPage \/>\}/);
  assert.match(page, /stockCatalogService\.getItems\(\)/);
  assert.match(page, /stockCatalogService\.stockIn\(payload\)/);
  assert.match(page, /stockCatalogService\.stockOut\(payload\)/);
});
