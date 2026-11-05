import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = source('src/App.jsx');
const styles = source('src/styles/workspace-responsive-polish.css');
const nav = source('src/components/layout/MobileBottomNav.jsx');
const drawer = source('src/components/layout/MobileSlideSidebar.jsx');
const layout = source('src/components/layout/DashboardLayout.jsx');
const route = source('src/routes/ProtectedRoute.jsx');

test('responsive styles load after account theme without displacing final form rules', () => {
  const imports = [...app.matchAll(/import ['"]\.\/styles\/([^'"]+\.css)['"];/g)].map((match) => match[1]);
  assert.ok(imports.indexOf('workspace-responsive-polish.css') > imports.indexOf('account-ui-polish.css'));
  assert.deepEqual(imports.slice(-5), ['form-typography.css', 'form-controls-unified.css', 'form-errors-unified.css', 'desktop-typography.css', 'floating-fields.css']);
});

test('desktop increases tiny sidebar, header, account and wallet text without scaling the app', () => {
  assert.match(styles, /@media \(min-width:1024px\)/);
  for (const name of [
    '.sidebar-nav-label',
    '.sidebar-section-title',
    '.header-page-title',
    '.header-profile-copy strong',
    '.account-dashboard-tabs button',
    '.cg-credit-metric strong',
    '.cg-credit-panel>header h2',
    '.cg-credit-shortcuts strong',
  ]) assert.ok(styles.includes(name), name);
  assert.match(styles, /\.sidebar-nav-label \{font-size:13px/);
  assert.match(styles, /\.header-page-title \{font-size:16px/);
  assert.doesNotMatch(styles, /transform:\s*scale\(/);
  assert.doesNotMatch(styles, /(^|\n)\s*body\s*\{/);
});

test('phone bottom bar is touch friendly and safe-area aware, with compact labels', () => {
  assert.match(styles, /@media \(max-width:767px\)/);
  assert.match(styles, /\.app-shell \.mobile-bottom-nav \{/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /padding:16px 13px calc\(112px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(styles, /\.mobile-bottom-label \{/);
  assert.match(styles, /font-size:10px/);
  assert.match(styles, /\.mobile-bottom-item:focus-visible/);
  assert.match(nav, /const mobileLabels/);
  assert.match(nav, /credits: 'Account'/);
  assert.match(nav, /dashboard: 'Home'/);
  assert.match(nav, /aria-label=\{route\.label\}/);
  assert.match(nav, /mobileLabels\[route\.id\] \|\| route\.label/);
  assert.match(layout, /<MobileBottomNav \/>/);
});

test('mobile More retains server-authorized module links and safe owner routes', () => {
  assert.match(nav, /featureAccess\.can\(route\.permission\)/);
  assert.match(nav, /featureAccess\.isCompanyOwner/);
  assert.match(nav, /visiblePrimaryRoutes = primaryCandidates\.slice\(0, 4\)/);
  assert.match(nav, /visibleMoreRoutes = routeConfig\.filter/);
  assert.match(nav, /<MobileSlideSidebar/);
  assert.match(drawer, /visibleRoutes = routeConfig\.filter\(route => featureAccess\.can\(route\.permission\)/);
  assert.match(drawer, /to="\/profile"/);
  assert.match(drawer, /featureAccess\.isCompanyOwner && <NavLink to="\/account\/company"/);
  assert.match(route, /moduleIsVisible\(featureAccess, requiredPermission\)/);
  assert.match(route, /featureAccess\.can\(requiredPermission\)/);
});

test('phone wallet and drawer reflow at narrow widths while keeping dark theme tokens', () => {
  assert.match(styles, /@media \(max-width:390px\)/);
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(styles, /\.mobile-drawer-item-label \{font-size:13px/);
  assert.match(styles, /\.cg-credit-table-wrap \{max-width:100%;overflow-x:auto/);
  assert.match(styles, /var\(--surface\)/);
  assert.match(styles, /var\(--primary\)/);
  assert.match(styles, /var\(--border\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
