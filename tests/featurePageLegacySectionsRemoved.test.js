import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/saas/CreditWorkspace.jsx',import.meta.url),'utf8');

test('Feature Controls no longer displays legacy Optional Modules section',()=>{
  assert.doesNotMatch(source,/OPTIONAL MODULES/);
  assert.doesNotMatch(source,/Enable or disable features/);
  assert.doesNotMatch(source,/No feature pricing has been configured by the administrator/);
  assert.doesNotMatch(source,/className="cg-credit-features"/);
  assert.doesNotMatch(source,/features\.filter\(feature => !freeKeys\.includes/);
  assert.doesNotMatch(source,/creditWalletService\.features\(\)/);
  assert.doesNotMatch(source,/const toggle = async/);
});

test('Server-Recorded Usage summary widget is removed from company panel',()=>{
  assert.doesNotMatch(source,/SERVER-RECORDED USAGE/);
  assert.doesNotMatch(source,/section === 'overview' \|\| section === 'features' \|\| section === 'logs'\) && featureUsage/);
  assert.doesNotMatch(source,/Module Time Usage/);
  assert.doesNotMatch(source,/currentMonthLoggedCredits/);
  assert.match(source,/featureUsage\.readings/);
});

test('Paid label marketplace remains on overview, with free modules and server-authorized billing',()=>{
  assert.match(source,/section === 'overview' && <section className="cg-credit-panel cg-bundle-marketplace"/);
  assert.match(source,/Paid workshop modules/);
  assert.match(source,/paidBundles\.map/);
  assert.match(source,/onClick=\{\(\) => buyBundle\(bundle\)\}/);
  assert.match(source,/onClick=\{\(\) => stopBundle\(bundle\)\}/);
  assert.match(source,/aria-label="Free modules"/);
  assert.match(source,/creditWalletService\.featureUsageLogs\(\)/);
  assert.match(source,/creditWalletService\.monthlyStatements\(\)/);
});
