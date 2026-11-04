import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const css = read('../src/styles/account-workspace-unified.css');
const tabs = read('../src/components/account/AccountHeader.jsx');
const saas = read('../src/pages/saas/SaaSAccount.jsx');
const templates = read('../src/pages/saas/DocumentTemplates.jsx');
const security = read('../src/pages/account/AccountSecurity.jsx');

test('active Account pages use shared navigation with semantic active tab', () => {
  for (const path of ['/account', '/account/credits/buy', '/account/storage', '/account/credits/logs', '/account/templates', '/account/security']) {
    assert.ok(tabs.includes(path), 'Missing account route: ' + path);
  }
  assert.match(tabs, /aria-current=\{active===key\?'page':undefined\}/);
  assert.doesNotMatch(tabs, /credits-features|\/account\/credits\/features/);
  assert.match(tabs, /type="button"/);
  assert.match(saas, /<AccountHeader/);
  assert.match(templates, /<AccountHeader/);
  assert.match(security, /<AccountHeader/);
  assert.match(security, /active="security"/);
});

test('account UI stylesheet loads after legacy billing styling without changing global field rules', () => {
  const imported = [...app.matchAll(/import ['"]\.\/styles\/([^'"]+\.css)['"];/g)].map((match) => match[1]);
  assert.ok(imported.indexOf('account-workspace-unified.css') > imported.indexOf('billing-ui-unified.css'));
  assert.deepEqual(imported.slice(-4), ['form-typography.css', 'form-controls-unified.css', 'form-errors-unified.css', 'desktop-typography.css']);
  for (const scope of ['.saas-page.account-billing-page', '.document-templates-page', '.account-security-page']) {
    assert.ok(css.includes(scope), scope);
  }
});

test('account tabs are swipeable without cramped rows on mobile', () => {
  assert.match(css, /\.account-dashboard-tabs::-webkit-scrollbar/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /scrollbar-width:none/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:767px\)/);
});

test('account billing and storage preserve real data and controls', () => {
  assert.match(saas, /saasAccountService\.getSubscriptionBilling/);
  assert.match(saas, /saasAccountService\.uploadMediaFiles/);
  assert.match(saas, /saasAccountService\.deleteMediaFiles/);
  assert.match(saas, /storageHistoryService\.getStorageHistory/);
  assert.match(css, /\.saas-storage-summary/);
  assert.match(css, /\.saas-file-main/);
  assert.match(css, /\.saas-breakdown/);
});

test('templates retain previews and editable company document fields', () => {
  assert.match(templates, /saveDocumentTemplateSettings/);
  assert.match(templates, /loadDocumentTemplateSettings/);
  assert.doesNotMatch(templates, /localStorage/);
  assert.match(templates, /Invoice Template/);
  assert.match(templates, /Estimate Template/);
  assert.match(templates, /businessLogo/);
  assert.match(templates, /<Preview kind="invoice"/);
  assert.match(templates, /<Preview kind="estimate"/);
  assert.match(css, /Never scale the miniature PDF preview/);
});

test('security inputs remain accessible and support password managers', () => {
  assert.match(security, /autoComplete="current-password"/);
  assert.match(security, /autoComplete="new-password"/);
  assert.match(security, /aria-label=\{showCurrent \?/);
  assert.match(security, /aria-label=\{showNew \?/);
  assert.match(security, /minLength=\{8\}/);
  assert.match(security, /role="status" aria-live="polite"/);
  assert.match(css, /\.account-security-form input/);
  assert.match(css, /font-weight:400/);
  assert.match(css, /\.account-security-form label>div:focus-within/);
});

test('Company tab is hidden without deleting existing company profile route', () => {
  const routes = read('../src/routes/AppRoutes.jsx');
  assert.doesNotMatch(tabs, /\['company','Company','\/account\/company'/);
  assert.match(routes, /path="\/account\/company"/);
  for (const path of ['/account', '/account/credits/buy', '/account/storage', '/account/credits/logs']) {
    assert.ok(tabs.includes(path), 'Expected credit wallet tab ' + path);
  }
});

test('all visible Account tabs route to real pages; Settings is hidden from Account only', () => {
  const routes = read('../src/routes/AppRoutes.jsx');
  const expected = [
    ['/account', 'overview'],
    ['/account/credits/buy', 'credits-buy'],
    ['credits-features'],
    ['/account/storage', 'storage'],
    ['/account/credits/logs', 'credits-logs'],
    ['/account/templates', 'templates'],
    ['/account/security', 'security'],
  ];
  for (const [path, key] of expected) {
    assert.ok(tabs.includes(`['${key}'`), `Missing tab ${key}`);
    assert.ok(tabs.includes(`'${path}'`), `Missing tab target ${path}`);
    assert.ok(routes.includes(`path="${path}"`), `Missing matched route ${path}`);
  }
  assert.doesNotMatch(tabs, /\['settings','Settings','\/settings'/);
  assert.match(routes, /path="\/settings"/);
  assert.match(routes, /path="\/account\/billing" element=\{<Navigate to="\/account" replace \/>\}/);
  assert.match(routes, /path="\/account\/plans" element=\{<Navigate to="\/account\/credits" replace \/>\}/);
});

test('account route changes reset the actual dashboard scroll container to the top', () => {
  const layout = read('../src/components/layout/DashboardLayout.jsx');
  assert.match(layout, /useLayoutEffect\(\(\) =>/);
  assert.match(layout, /location\.pathname\.startsWith\('\/account\/'\)/);
  assert.match(layout, /scrollAreaRef\.current\.scrollTop = 0/);
  assert.match(layout, /className="app-scroll-area" ref=\{scrollAreaRef\}/);
  assert.match(tabs, /openTab\(path\)/);
  assert.match(tabs, /nav\.scrollLeft = target/);
  assert.match(tabs, /aria-current=\{active===key\?'page':undefined\}/);
});

test('credit, storage history, day details, templates and security share one sticky tab layout', () => {
  const history = read('../src/pages/saas/StorageHistory.jsx');
  const day = read('../src/pages/saas/StorageDayDetails.jsx');
  const wallet = read('../src/pages/saas/CreditWorkspace.jsx');
  for (const page of [history, day, wallet, saas, templates, security]) {
    assert.match(page, /<AccountHeader/);
  }
  assert.match(history, /active="storage"/);
  assert.match(day, /active="storage"/);
  assert.match(day, /role="status">Loading storage snapshot/);
  for (const scope of ['.saas-page.cg-credit-page', '.saas-page.storage-history-page', '.saas-page.storage-day-page']) {
    assert.ok(css.includes(scope), `Missing account tab theme for ${scope}`);
  }
  assert.match(css, /position:sticky/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /min-height:43px/);
});
