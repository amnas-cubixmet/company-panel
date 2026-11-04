import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Manage Features jumps to real module marketplace, not another copy of Wallet Overview', () => {
  const source = read('src/pages/saas/CreditWorkspace.jsx');
  assert.match(source, /const modulePricingRef = useRef\(null\)/);
  assert.match(source, /const openModulePricing = \(\) => \{/);
  assert.match(source, /sectionElement\.scrollIntoView/);
  assert.match(source, /sectionElement\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /onClick=\{openModulePricing\} aria-controls="module-pricing">Manage Features/);
  assert.match(source, /className="cg-credit-panel cg-bundle-marketplace" id="module-pricing" ref=\{modulePricingRef\} tabIndex=\{-1\}/);
  assert.match(source, /paidBundles\.map\(/);
});

test('other pricing actions also jump to the marketplace and old route stays removed', () => {
  const source = read('src/pages/saas/CreditWorkspace.jsx');
  const legacyAccount = read('src/components/account/AccountOverview.jsx');
  const routes = read('src/routes/AppRoutes.jsx');
  const styles = read('src/styles/credit-wallet.css');
  assert.match(source, /onClick=\{openModulePricing\} aria-controls="module-pricing">Choose Features/);
  assert.match(source, /onClick=\{openModulePricing\} aria-controls="module-pricing">View Prices/);
  assert.match(source, /<strong>Module Pricing<\/strong>/);
  assert.match(source, /location\.hash === '#module-pricing'/);
  assert.match(legacyAccount, /href: '\/account#module-pricing'/);
  assert.match(routes, /path="\/account\/credits\/features" element=\{<Navigate to="\/account\/credits" replace \/>\}/);
  assert.match(styles, /#module-pricing\{scroll-margin-top:85px/);
  assert.doesNotMatch(source, /OPTIONAL MODULES|SERVER-RECORDED USAGE/);
});
