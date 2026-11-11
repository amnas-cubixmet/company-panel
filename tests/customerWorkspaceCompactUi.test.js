import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const routes = read('src/routes/AppRoutes.jsx');
const list = read('src/pages/customers/CustomerList.jsx');
const profile = read('src/pages/customers/CustomerDetails.jsx');
const css = read('src/styles/customer-workspace-compact.css');
const portal = read('src/components/customers/CustomerTrackingLinkPanel.jsx');

test('directory and profile keep existing routes, navigation and scoped CSS', () => {
  assert.match(routes, /path="\/customers" element=\{<CustomerList \/>\}/);
  assert.match(routes, /path="\/customers\/:id" element=\{<CustomerDetails \/>\}/);
  assert.match(list, /import '..\/..\/styles\/customer-workspace-compact\.css'/);
  assert.match(profile, /import '..\/..\/styles\/customer-workspace-compact\.css'/);
  assert.match(list, /navigate\(\`\/customers\/\$\{customer\.id\}\`\)/);
  assert.match(profile, /customer-profile-tabs__rail/);
  assert.match(profile, /role="tablist"/);
  assert.match(profile, /aria-selected=\{isActive\}/);
});

test('customer list has concise header and compact real-data search/filter bar', () => {
  assert.match(list, /<h1[^>]*>Customers<\/h1>/);
  assert.doesNotMatch(list, /Manage workshop customers, vehicles and service history\./);
  assert.match(list, /customer-directory-toolbar/);
  assert.match(list, /Search name, phone, WhatsApp, email or vehicle/);
  assert.match(list, /Branch filter/);
  assert.match(list, /onClick=\{resetFilters\}/);
  assert.match(list, /customer\.__vehicles\?\.some/);
  assert.match(list, /customer\.__jobs\?\.some/);
  assert.match(list, /\[customers, search, statusFilter, branchFilter, typeFilter, remoteSearchIds\]/);
  assert.match(list, /Job Cards<\/th>/);
  assert.match(list, /c\.vehicleCount \?\? '—'/);
  assert.match(list, /c\.jobsCount \?\? '—'/);
  assert.match(list, /formatCustomerMoney\(c\.outstanding\)/);
  assert.match(list, /!customers\.length/);
});

test('customer profile retains functional tabs and four supported KPI summaries', () => {
  assert.match(profile, /\{ label: 'Vehicles', value: vehiclesAvailable/);
  assert.match(profile, /\{ label: 'Job Cards', value: jobsAvailable/);
  assert.match(profile, /\{ label: 'Invoices', value: invoicesAvailable \? String\(activeCustomerInvoices\(invoices\)\.length\)/);
  assert.match(profile, /\{ label: 'Outstanding', value: formatINR\(totalOutstanding\)/);
  assert.match(profile, /customerProfileFinancials\(invoices, invoicesAvailable\)/);
  for (const key of ['overview', 'vehicles', 'jobs', 'service-history', 'invoices', 'payments', 'notes', 'documents', 'activity']) {
    assert.ok(profile.includes("id: '"+key+"'"), key);
  }
});

test('profile removes repeated helper descriptions but keeps real records and actions', () => {
  for (const paragraph of [
    'All vehicles registered under this customer account',
    'All repair & service jobs executed for this customer',
    'Complete history of services, replaced parts, and costs across all vehicles',
    'Calculated from actual unpaid & paid invoice balances',
    'All transactions recorded against customer invoices',
    'Special preferences & observations maintained by workshop staff',
    'System events logged for this customer account',
  ]) assert.ok(!profile.includes(paragraph), paragraph);
  assert.match(profile, /Linked Vehicles/);
  assert.match(profile, /Job Card History/);
  assert.match(profile, /Payment Records/);
  assert.match(profile, /New Job Card/);
  assert.match(profile, /Add Vehicle/);
  assert.match(profile, /paymentService\.createPayment/);
  assert.match(profile, /customerService\.updateCustomer/);
  assert.match(profile, /customerService\.archiveCustomer/);
});

test('secure portal stays available in overview with existing consent and safety controls', () => {
  assert.match(profile, /activeTab === 'overview' &&/);
  assert.match(profile, /<CustomerTrackingLinkPanel/);
  assert.match(profile, /<CustomerWhatsAppConsent/);
  assert.match(portal, /Private access link for this customer/);
  assert.match(portal, /navigator\.clipboard\.writeText\(link\)/);
  assert.match(portal, /<WhatsAppManualShareButton/);
  assert.match(portal, /change\('revoke'\)/);
  assert.match(portal, /change\(enabled \? 'rotate' : 'enable'\)/);
});

test('add/edit forms retain fields and display backend validation without discarding user data', () => {
  assert.match(list, /customerService\.checkDuplicateCustomer\(payload\)/);
  assert.match(list, /customerService\.createCustomer\(payload\)/);
  assert.match(list, /customerService\.updateCustomer\(editingCustomerId, payload\)/);
  assert.match(list, /setFormFieldErrors\(next\)/);
  assert.match(list, /customerFormRef\.current\?\.querySelector/);
  assert.match(list, /data-customer-field="name"/);
  assert.match(list, /onInvalid=\{\(event\) =>/);
  assert.match(list, /disabled=\{formBusy \|\| duplicateChecking\}/);
  assert.match(profile, /setEditFormError\(error\?\.message/);
  assert.match(profile, /editFormRef\.current\?\.querySelector/);
  assert.match(profile, /disabled=\{editSaving\}/);
});

test('mobile and desktop customers views use compact route-scoped theme styles', () => {
  for (const fragment of [
    '.cg-customers.customer-directory-page',
    '.cg-customers.customer-profile-page',
    '.customer-directory-card__summary',
    '.customer-profile-kpis',
    '.customer-profile-tabs__rail',
    '@media(max-width:767px)',
    '@media(max-width:390px)',
    'min-height:44px',
    'font-size:16px',
    'var(--border)',
    'var(--surface)',
    'var(--primary)',
    'var(--danger)',
  ]) assert.ok(css.includes(fragment), fragment);
  assert.doesNotMatch(css, /\.app-sidebar\s*\{/);
});
