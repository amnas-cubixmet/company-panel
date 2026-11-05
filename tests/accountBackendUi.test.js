import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const endpoints = text('../src/api/endpoints.js');
const service = text('../src/services/saasAccount.service.js');
const account = text('../src/pages/saas/SaaSAccount.jsx');
const overview = text('../src/components/account/AccountOverview.jsx');
const css = text('../src/styles/account-overview-refined.css');
const storageHistory = text('../src/services/storageHistory.service.js');

test('SaaS frontend uses correct real Django endpoints, no undefined API paths',()=>{
  assert.match(endpoints, /SAAS_BILLING: "\/saas\/billing"/);
  assert.match(endpoints, /MEDIA_STORAGE: "\/saas\/storage"/);
  assert.match(service, /apiClient\.get\(API_ENDPOINTS\.SAAS_BILLING\)/);
  assert.match(service, /apiClient\.get\(API_ENDPOINTS\.MEDIA_STORAGE\)/);
  assert.match(storageHistory, /\/saas\/storage\/history\?/);
});

test('account loads independent data sources and preserves account page after one API fails',()=>{
  assert.match(account, /Promise\.allSettled\(/);
  assert.match(account, /settingsService\.getSettings\('company'\)/);
  assert.match(account, /billing\?\.plan/);
  assert.match(account, /getSubscriptionBilling\(\)/);
  assert.match(account, /getStorageAccount\(\)/);
  assert.match(account, /Retry/);
});

test('company profile is saved through the real company-scoped settings endpoint',()=>{
  assert.match(account, /settingsService\.updateSettings\('company', nextCompany\)/);
  assert.match(overview, /onSaveCompany\(validated\.draft\)/);
  assert.match(overview, /validateCompanyDraft\(draft\)/);
  assert.match(overview, /AccountOverview/);
  assert.match(overview, /Signed in as/);
  assert.match(overview, /role="status"/);
  assert.match(overview, /Save Company/);
  assert.doesNotMatch(overview, /customer\.id/);
});

test('billing and active users are read-only from backend, not editable fake seat count',()=>{
  assert.doesNotMatch(service, /export const updateSeatCount/);
  assert.doesNotMatch(account, /onSeatsChange/);
  assert.match(account, /Actual active users from your company/);
  assert.match(account, /No verified subscription invoices available/);
  assert.match(account, /No verified subscription rate is configured/);
  assert.match(account, /billing\.invoices\.map/);
});

test('upload/delete refresh authoritative media summary and handles errors',()=>{
  assert.match(service, /await apiClient\.post\(\`\$\{API_ENDPOINTS\.MEDIA_STORAGE\}\/files\`/);
  assert.match(service, /return getStorageAccount\(\)/);
  assert.match(account, /setStorageError\(/);
  assert.match(account, /setHistoryError\(/);
  assert.match(account, /role="alert"/);
  assert.match(account, /SERVER AUDIT LOG/);
  assert.match(account, /getStorageEvents\(/);
  assert.match(account, /No server-recorded events for this period/);
  assert.match(account, /Demo activity is stored in this browser/);
  assert.match(account, /if \(!USE_MOCK_API\) return;/);
  assert.match(account, /<div><span>Files<\/span><strong>\{row\.fileCount\}<\/strong><\/div>/);
  assert.doesNotMatch(account, /Storage billing history|Estimated monthly extra|Extra GB rate/);
});

test('account UI responsive typography, form validation and keyboard focus',()=>{
  assert.match(css, /@media\(max-width:550px\)/);
  assert.match(css, /@media\(max-width:850px\)/);
  assert.match(css, /account-overview-stats/);
  assert.match(css, /account-overview-company-form/);
  assert.match(css, /account-dashboard-tabs/);
  assert.match(css, /:focus-visible/);
});

test('account company overview no longer displays subscription summary', () => {
  assert.doesNotMatch(overview, /Subscription Summary/);
  assert.doesNotMatch(overview, /Charges and usage from your current subscription/);
  assert.doesNotMatch(overview, /billing\?\.plan/);
  assert.match(overview, /Company Information/);
  assert.match(overview, /Available Credits/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
});
