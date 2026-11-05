import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('SaaS owner Account retains Storage tab and all nested log pages', () => {
  const header = code('src/components/account/AccountHeader.jsx');
  const routes = code('src/routes/AppRoutes.jsx');
  const access = code('src/context/FeatureAccessContext.jsx');
  const workspace = code('src/utils/accountWorkspace.js');
  assert.match(header, /\['storage','Storage','\/account\/storage',HardDrive,'billing\.view'\]/);
  assert.match(header, /visibleTabs = tabs\.filter\(tab => isCompanyOwner && can\(tab\[4\]\)\)/);
  assert.match(routes, /path="\/account\/storage" element=\{<SaaSAccount section="storage"\s*\/>\}/);
  assert.match(routes, /path="\/account\/storage\/history"/);
  assert.match(routes, /path="\/account\/storage\/history\/:date"/);
  assert.match(access, /module === 'storage' && access\.isCompanyOwner/);
  assert.match(workspace, /'\/account\/storage'/);
  assert.match(workspace, /normalized\.startsWith\(\x27\/account\/storage\/history\/\x27\)/);
  assert.match(access, /billingHold: response\.billingHold === true/);
});

test('frontend storage history paginates all real backend events including deleted filenames', () => {
  const log = code('src/pages/saas/StorageHistory.jsx');
  const service = code('src/services/storageHistory.service.js');
  const storage = code('src/pages/saas/SaaSAccount.jsx');
  assert.match(log, /All recorded activity/);
  assert.match(log, /Load 50 more file events/);
  assert.match(log, /event\.filename/);
  assert.match(log, /event\.deltaBytes/);
  assert.match(service, /offset = 0/);
  assert.match(service, /params\.set\('offset'/);
  assert.match(storage, /Upload and delete events/);
  assert.match(storage, /serverEvents/);
  assert.match(storage, /event\.actor/);
});

test('owner cycle widget reads backend invoice dates and never computes payments in browser', () => {
  const component = code('src/components/account/CreditCycleCard.jsx');
  const service = code('src/services/creditCycle.service.js');
  const overview = code('src/pages/saas/CreditWorkspace.jsx');
  const storage = code('src/pages/saas/SaaSAccount.jsx');
  assert.match(service, /apiClient\.get\('\/saas\/credits\/billing-cycle'\)/);
  assert.match(service, /apiClient\.post\('\/saas\/credits\/billing-cycle', \{\}\)/);
  assert.match(component, /cycle\.nextDueAt/);
  assert.match(component, /cycle\.amountDue/);
  assert.match(component, /cycle\.invoices/);
  assert.match(component, /file\.filename/);
  assert.match(component, /cycle\.overdue/);
  assert.match(component, /'\/account\/credits\/buy'/);
  assert.match(overview, /<CreditCycleCard \/>/);
  assert.match(storage, /<CreditCycleCard \/>/);
});

test('monthly paid label activation allows zero wallet only in backend-announced cycle mode', () => {
  const ui = code('src/utils/featureActivation.js');
  const wallet = code('src/pages/saas/CreditWorkspace.jsx');
  assert.match(ui, /if \(bundle\.cyclePostpaid\)/);
  assert.match(ui, /bundle\.billingType !== 'monthly'/);
  assert.match(ui, /bundle\.purchaseEnabled/);
  assert.match(ui, /wallet\.canManage/);
  assert.match(ui, /Activate now; no credits are deducted/);
  assert.match(wallet, /bundle\.cyclePostpaid/);
});
