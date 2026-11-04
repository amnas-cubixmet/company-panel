import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const layout = read('src/components/layout/SaaSAccountLayout.jsx');
const css = read('src/styles/saas-account-layout.css');
const workspace = read('src/pages/saas/CreditWorkspace.jsx');

test('owner account desktop uses the entire available panel without mobile-sized max-width', () => {
  assert.match(css, /\.saas-account-content\.app-scroll-area\s*\{[^}]*max-width:none/s);
  assert.match(css, /\.saas-account-content>\.app-content\s*\{[^}]*max-width:none/s);
  assert.match(css, /\.saas-account-content \.saas-page\s*\{[^}]*max-width:none/s);
  assert.match(css, /width:clamp\(226px,17\.5vw,286px\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width:900px\)/);
  assert.match(css, /@media \(max-width:600px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('sidebar groups account and backend-authorized modules, not all possible staff/dashboard routes', () => {
  assert.match(layout, /const ACCOUNT_LINKS/);
  assert.match(layout, /route\.id !== 'credits' && access\.can\(route\.permission\)/);
  assert.match(layout, /const workshopSections = Object\.values\(ROUTE_SECTIONS\)/);
  assert.match(layout, /workshopSections\.map/);
  assert.match(layout, /Workshop modules appear here when an active feature label and your role allow access/);
  assert.doesNotMatch(layout, /const workshopLinks = routeConfig;/);
  assert.match(layout, /<NavLink to="\/account"/);
});

test('mobile menu opens accessibly and closes on navigation or backdrop', () => {
  assert.match(layout, /aria-expanded=\{menuOpen\}/);
  assert.match(layout, /aria-controls="saas-owner-navigation"/);
  assert.match(layout, /setMenuOpen\(false\)/);
  assert.match(layout, /saas-owner-menu-backdrop/);
  assert.match(layout, /aria-label="Close navigation"/);
  assert.match(css, /\.saas-owner-sidebar\.is-open/);
  assert.match(css, /\.saas-owner-menu-backdrop/);
});

test('overview shows authorized module count and server-based price/cash-flow rather than invented monthly sum', () => {
  assert.match(workspace, /featureAccess\.can\(route\.permission\)/);
  assert.match(workspace, /featureAccess\.activeLabelModules\.length/);
  assert.match(workspace, /availableRoutes\.length/);
  assert.match(workspace, /const activeBundles = paidBundles\.filter\(bundle => bundle\.active === true\)/);
  assert.match(workspace, /Activated modules and their credit costs/);
  assert.match(workspace, /credits\(bundle\.totalCredits\)/);
  assert.match(workspace, /bundle\.billingType === 'permanent'/);
  assert.match(workspace, /Check Wallet Cash Flow/);
  assert.doesNotMatch(workspace, /section === 'features' && !featureAccess\.labelOnly/);
  assert.match(workspace, /section === 'overview' && <section className="cg-credit-panel cg-bundle-marketplace"/);
  assert.match(workspace, /notifyCreditChange\(\)/);
});
