import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const app = read('../src/App.jsx');
const ui = read('../src/styles/account-ui-polish.css');
const tabs = read('../src/components/account/AccountHeader.jsx');
const routes = read('../src/routes/AppRoutes.jsx');
const credit = read('../src/pages/saas/CreditWorkspace.jsx');
const storage = read('../src/pages/saas/SaaSAccount.jsx');
const templates = read('../src/pages/saas/DocumentTemplates.jsx');
const security = read('../src/pages/account/AccountSecurity.jsx');

const routeTable = [
  ['/account', 'overview'],
  ['/account/credits/buy', 'credits-buy'],
  ['/account/storage', 'storage'],
  ['/account/credits/logs', 'credits-logs'],
  ['/account/templates', 'templates'],
  ['/account/security', 'security'],
];

test('six account routes share one navigation and correct active state', () => {
  for (const [path,key] of routeTable) {
    assert.ok(routes.includes(`path="${path}"`), 'Missing route '+path);
    assert.ok(tabs.includes(`['${key}'`), 'Missing active tab '+key);
    assert.ok(tabs.includes(`'${path}'`), 'Missing nav target '+path);
  }
  assert.doesNotMatch(tabs, /\['settings'|\['company'|\['credits-features'/);
  assert.match(tabs, /aria-current=\{active===key\?'page':undefined\}/);
  assert.doesNotMatch(tabs, /account-dashboard-eyebrow|account-dashboard-section-count/);
  for (const page of [credit,storage,templates,security]) assert.match(page, /<AccountHeader/);
});

test('account pages use common theme-aware responsive styling without changing PDF previews', () => {
  assert.match(app, /import '\.\/styles\/account-ui-polish\.css'/);
  for (const scope of ['.cg-credit-page', '.account-billing-page', '.document-templates-page',
                       '.account-security-page', '.storage-history-page', '.storage-day-page']) {
    assert.ok(ui.includes(scope), 'Missing shared UI style '+scope);
  }
  for (const token of ['var(--surface)', 'var(--primary)', 'var(--text-primary)', 'var(--border)']) {
    assert.ok(ui.includes(token), 'Missing theme token '+token);
  }
  assert.match(ui, /overflow-x:auto/);
  assert.match(ui, /position:sticky/);
  assert.match(ui, /@media \(max-width:520px\)/);
  assert.match(ui, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(ui, /\.template-preview\s*\{\s*transform:/);
});

test('wallet keeps real payment guards, refresh and staff based charges', () => {
  assert.match(credit, /creditWalletService\.overview\(\)/);
  assert.match(credit, /purchaseCredits\(pack\.id\)/);
  assert.match(credit, /\!wallet\?\.checkoutAvailable \|\| \!wallet\?\.canManage/);
  assert.match(credit, /featureAccess\.refresh\(\)/);
  assert.match(credit, /bundle\.perUserCredits/);
  assert.match(credit, /credits\(bundle\.totalCredits\)/);
  assert.match(credit, /creditWalletService\.disableBundle/);
});

test('storage shows file usage and event history, not subscription price or plan lookup', () => {
  assert.match(storage, /storage\.files\.length/);
  assert.match(storage, /Storage usage history/);
  assert.match(storage, /getStorageEvents\(/);
  assert.match(storage, /section === 'billing' \? saasAccountService\.getSubscriptionBilling\(\) : Promise\.resolve\(null\)/);
  assert.doesNotMatch(storage, /Extra GB rate|Estimated monthly extra|Storage billing history/);
  assert.match(templates, /Save Templates/);
  assert.match(security, /Change Password/);
});
