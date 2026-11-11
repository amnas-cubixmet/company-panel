import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/services/ServiceList.jsx');
const header = read('src/components/services/ServicesHeader.jsx');
const toolbar = read('src/components/services/ServiceFilterToolbar.jsx');
const catalog = read('src/components/services/ServiceCatalogGrid.jsx');
const stats = read('src/components/services/ServiceOverviewStats.jsx');
const categories = read('src/components/services/ServiceCategoriesPanel.jsx');
const css = read('src/styles/services-directory-refined.css');

test('services directory uses white workshop-primary UI and scoped responsive layout', () => {
  assert.match(page, /service-management-page cg-services service-dashboard cg-services-refined/);
  assert.match(page, /import '..\/..\/styles\/services-directory-refined\.css'/);
  assert.match(css, /\.cg-services\.service-dashboard\.cg-services-refined/);
  assert.match(css, /var\(--primary\)/);
  assert.match(css, /var\(--surface\)/);
  assert.match(css, /var\(--border\)/);
  assert.doesNotMatch(css, /orange|rose|#f57645|#d9582e/i);
  assert.match(header, /<h1>Services<\/h1>/);
  assert.match(header, /hasPermission\(user,'services.create'\)/);
  assert.match(header, /onClick=\{onAdd\}/);
  assert.match(header, /onClick=\{onAddCategory\}/);
  for (const label of ['Total Services','Active Services','Categories','Average Charge']) {
    assert.ok(stats.includes(label), label);
  }
});

test('search, category, status and reset filters continue using existing API-backed service data', () => {
  assert.match(page, /serviceService\.getServices\(\)/);
  assert.match(page, /serviceService\.getServiceCategories\(\)/);
  assert.match(page, /const filtered = useMemo/);
  assert.match(page, /categoryFilter === 'All' \|\| service\.category === categoryFilter/);
  assert.match(page, /String\(service\.status\)\.toLowerCase\(\) === statusFilter\.toLowerCase\(\)/);
  assert.match(page, /const hasActiveFilters = Boolean\(query\.trim\(\)/);
  assert.match(page, /const resetCatalogFilters = \(\) =>/);
  assert.match(page, /onReset=\{resetCatalogFilters\}/);
  assert.match(toolbar, /aria-label="Search services"/);
  assert.match(toolbar, /aria-label="Filter by service category"/);
  assert.match(toolbar, /aria-label="Filter by service status"/);
  assert.match(toolbar, /className="cg-service-filter-chips"/);
  assert.match(toolbar, /onClick=\{onReset\}/);
  assert.match(toolbar, /aria-label="Clear service search"/);
  assert.match(toolbar, /<option value="All">All Categories<\/option>/);
  assert.match(toolbar, /<option value="All">All Statuses<\/option>/);
  assert.match(css, /\.cg-service-filter-chips/);
});

test('service cards retain details, category, real price, duration, and permission-limited actions', () => {
  assert.match(page, /<ServiceCatalogGrid/);
  assert.match(page, /hasFilters=\{hasActiveFilters\}/);
  assert.match(catalog, /service\.code/);
  assert.match(catalog, /service\.name/);
  assert.match(catalog, /formatMoney\(service\.price\|\|0\)/);
  assert.match(catalog, /durationLabel\(service\.durationMinutes\)/);
  assert.match(catalog, /service\.pricingType/);
  assert.match(catalog, /hasPermission\(user,'services.edit'\)/);
  assert.match(catalog, /hasPermission\(user,'services.delete'\)/);
  assert.match(catalog, /onView\(service\)/);
  assert.match(catalog, /onEdit\(service\)/);
  assert.match(catalog, /onDelete\(service\)/);
  assert.match(catalog, /aria-label=\{'View service ' \+ service\.name\}/);
  assert.match(catalog, /hasFilters && <button type="button" onClick=\{onReset\}>Clear filters<\/button>/);
  assert.match(css, /\.service-card-grid/);
  assert.match(css, /\.service-catalog-card/);
});

test('create edit delete routes and hierarchical category management remain intact', () => {
  assert.match(page, /const serviceModalOpen = isNew \|\| isEdit \|\| isDetail \|\| isDelete/);
  assert.match(page, /<ResponsiveModalSheet/);
  assert.match(page, /<ServiceForm/);
  assert.match(page, /serviceService\.createService\(payload\)/);
  assert.match(page, /serviceService\.updateService\(id, payload\)/);
  assert.match(page, /serviceService\.deleteService\(service\.id\)/);
  assert.match(page, /serviceService\.createServiceCategory\(payload\)/);
  assert.match(page, /serviceService\.updateServiceCategory\(editingCategoryId, payload\)/);
  assert.match(page, /serviceService\.deleteServiceCategory\(category\.id\)/);
  assert.match(page, /aria-expanded=\{showCategories\}/);
  assert.match(categories, /buildCategoryTreeRows\(categories\)/);
  assert.match(page, /hasPermission\(user, 'services.create'\)/);
  assert.match(page, /hasPermission\(user, 'services.edit'\)/);
  assert.match(page, /hasPermission\(user, 'services.delete'\)/);
});

test('desktop, tablet and mobile controls remain accessible', () => {
  for (const selector of [
    '.cg-service-heading','.service-dashboard-stats','.cg-service-toolbar-row',
    '.cg-service-filter-controls','.service-card-grid','.service-card-actions',
    '@media(max-width:1180px)','@media(max-width:767px)',
    '@media(max-width:390px)','prefers-reduced-motion:reduce',
    'min-height:48px','font-size:16px',':focus-visible'
  ]) assert.ok(css.includes(selector), selector);
  assert.doesNotMatch(css, /\.app-sidebar\s*\{/);
});
