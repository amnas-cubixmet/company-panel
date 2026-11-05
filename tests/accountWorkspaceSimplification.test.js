import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const header = read('src/components/account/AccountHeader.jsx');
const overview = read('src/components/account/AccountOverview.jsx');
const credit = read('src/pages/saas/CreditWorkspace.jsx');
const storage = read('src/pages/saas/SaaSAccount.jsx');
const templates = read('src/pages/saas/DocumentTemplates.jsx');
const security = read('src/pages/account/AccountSecurity.jsx');
const styles = read('src/styles/account-workspace-compact.css');

test('Account navigation is compact, accessible and retains all six routes', () => {
  for (const route of ['/account', '/account/credits/buy', '/account/storage',
    '/account/credits/logs', '/account/templates', '/account/security']) {
    assert.ok(header.includes("'" + route + "'"), route);
  }
  assert.match(header, /aria-current=\{active===key\?'page':undefined\}/);
  assert.match(header, /nav\.scrollLeft = target/);
  assert.doesNotMatch(header, /CUBEGEAR.*ACCOUNT WORKSPACE|account-dashboard-section-count/);
});

test('Overview keeps backend data and only three primary metrics', () => {
  assert.match(overview, /creditWalletService\.overview\(\)/);
  assert.match(overview, /Available Credits/);
  assert.match(overview, /Active Modules/);
  assert.match(overview, /Storage Used/);
  assert.match(overview, /onSaveCompany\(validated\.draft\)/);
  assert.doesNotMatch(overview, /30-day Feature Estimate|Verified company wallet credits/);
});

test('Credit purchase and history keep financial guards with focused views', () => {
  assert.match(credit, /purchaseCredits\(pack\.id\)/);
  assert.match(credit, /!wallet\?\.checkoutAvailable \|\| !wallet\?\.canManage/);
  assert.match(credit, /logView === 'transactions'/);
  assert.match(credit, /logView === 'features'/);
  assert.match(credit, /logView === 'statements'/);
  assert.match(credit, /logView === 'usage'/);
  assert.match(credit, /logSearch/);
  assert.match(credit, /logFrom/);
  assert.match(credit, /logTo/);
  assert.match(credit, /visibleLogs\.map/);
  assert.match(credit, /Math\.ceil\(filteredLogs\.length \/ 10\)/);
});

test('Storage still reads real file and ledger values with compact advanced settings', () => {
  assert.match(storage, /storage\.usedGb/);
  assert.match(storage, /storage\.files\.length/);
  assert.match(storage, /getStorageEvents\(/);
  assert.match(storage, /saas-storage-advanced/);
  assert.match(storage, /Previously recorded charges remain payable/);
});

test('Templates retain server save, field validation and both live document previews', () => {
  assert.match(templates, /loadDocumentTemplateSettings\(/);
  assert.match(templates, /saveDocumentTemplateSettings\(/);
  assert.match(templates, /template-editor-preview-layout/);
  assert.match(templates, /mobilePane/);
  assert.match(templates, /previewKind/);
  assert.match(templates, /<Preview kind="invoice"/);
  assert.match(templates, /<Preview kind="estimate"/);
  assert.match(styles, /\.template-editor-preview-layout/);
});

test('Security does not expose one-time magic links or internal recovery flow', () => {
  assert.match(security, /changePassword\(\{ currentPassword, newPassword \}\)/);
  assert.match(security, /requestMagicLink\(user\.email\)/);
  assert.match(security, /navigate\('\/forgot-password'\)/);
  assert.doesNotMatch(security, /result\?\.previewUrl|Magic link created:/);
  assert.doesNotMatch(security, /Secure token created|Password reset \/ session granted/);
});
