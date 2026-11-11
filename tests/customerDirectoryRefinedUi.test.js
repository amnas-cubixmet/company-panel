import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const list = read('src/pages/customers/CustomerList.jsx');
const css = read('src/styles/customer-directory-refined.css');

test('customer directory uses one white primary-branded header, search and responsive listing', () => {
  assert.match(list, /className="customer-directory-page cg-customers cg-directory-refined"/);
  assert.match(list, /<header className="cg-directory-header">/);
  assert.match(list, /<h1>Customers<\/h1>/);
  assert.match(list, /onClick=\{openAddModal\} disabled=\{!canCreateCustomer\}/);
  assert.match(list, /className="customer-directory-toolbar"/);
  assert.match(list, /aria-label="Search customers"/);
  assert.match(list, /className="desktop-customers-table"/);
  assert.match(list, /className="mobile-customers-cards"/);
  assert.match(list, /visibleCustomers\.map\(\(c\) => \(/);
  assert.match(list, /import '..\/..\/styles\/customer-directory-refined\.css'/);
  assert.match(css, /\.cg-customers\.cg-directory-refined/);
  assert.match(css, /var\(--primary\)/);
  assert.match(css, /var\(--surface\)/);
  assert.doesNotMatch(css, /#f57645|#d9582e|orange|rose/i);
});

test('URL query filters have removable active chips and reset behavior', () => {
  assert.match(list, /const hasActiveFilters = Boolean\(search\.trim\(\)/);
  assert.match(list, /const activeFilterCount = \[statusFilter !== 'All', branchFilter !== 'All', typeFilter !== 'All'\]/);
  assert.match(list, /setSearchParams\(next, \{ replace: name === 'q' \}\)/);
  assert.match(list, /className="cg-directory-active-filters"/);
  for (const action of [
    "setSearch('')", "setStatusFilter('All')",
    "setTypeFilter('All')", "setBranchFilter('All')", "resetFilters",
  ]) assert.ok(list.includes(action), action);
  assert.match(list, /hasActiveFilters \? \(/);
  assert.match(list, /Clear filters/);
  assert.match(list, /Add First Customer/);
  assert.match(css, /\.cg-directory-active-filters/);
});

test('customer name is a real profile link and mobile card preserves call, WhatsApp and edit', () => {
  assert.match(list, /<Link to=\{\x60\/customers\/\$\{c\.id\}\x60\} className="cg-directory-name">\{c\.name\}<\/Link>/);
  assert.match(list, /className="cg-directory-avatar"/);
  assert.match(list, /className="cg-directory-status/);
  assert.match(list, /className="customer-directory-card"/);
  assert.equal((list.match(/<CustomerContactActions customer=\{c\}/g) || []).length,2);
  assert.match(list, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); openEditModal\(c\); \}\}/);
  assert.match(list, /canViewCustomerMoney \? formatCustomerMoney\(c\.outstanding\) : 'Restricted'/);
  assert.doesNotMatch(list, /<ChevronRight|<CustomerManagementTabs/);
});

test('customer list remains touch-friendly with table scrolling and small phone cards', () => {
  for (const fragment of [
    '.cg-directory-header', '.cg-directory-search', '.cg-directory-person',
    '.cg-directory-mobile-view', '.cg-directory-status',
    '@media(max-width:1150px)', '@media(max-width:767px)',
    '@media(max-width:390px)', 'overflow-x:auto!important',
    'min-height:46px', ':focus-visible', 'font-size:16px',
  ]) assert.ok(css.includes(fragment), fragment);
  assert.doesNotMatch(css,/\.app-sidebar\s*\{/);
});

test('customer create, edit, duplicate checks and directory permissions stay unchanged', () => {
  assert.match(list, /customerService\.getCustomerDirectorySummary\(\)/);
  assert.match(list, /customerService\.checkDuplicateCustomer\(payload\)/);
  assert.match(list, /customerService\.createCustomer\(payload\)/);
  assert.match(list, /customerService\.updateCustomer\(editingCustomerId, payload\)/);
  assert.match(list, /can\('customers\.create'\)/);
  assert.match(list, /can\('customers\.edit'\)/);
  assert.match(list, /can\('invoices\.view'\)/);
  assert.match(list, /<ResponsiveModalSheet/);
});
