import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8');
const tabs = readFileSync(new URL('../src/components/customers/CustomerManagementTabs.jsx', import.meta.url), 'utf8');
const directory = readFileSync(new URL('../src/pages/customers/CustomerList.jsx', import.meta.url), 'utf8');

test('customers entry route renders one summary and directory page', () => {
  assert.match(routes, /path="\/customers" element={<CustomerList \/>}/);
  assert.match(routes, /path="\/customers\/overview" element={<Navigate to="\/customers" replace \/>}/);
  assert.match(routes, /path="\/customers\/all" element={<Navigate to="\/customers" replace \/>}/);
  assert.match(routes, /path="\/customers\/:id" element={<CustomerDetails \/>}/);
});

test('Customers page removes the purple All Customers tab and all four metric cards', () => {
  assert.doesNotMatch(directory, /<CustomerManagementTabs \/>/);
  assert.doesNotMatch(directory, /customers-summary-grid/);
  assert.doesNotMatch(directory, /Total Customers/);
  assert.doesNotMatch(directory, /Active Customers/);
  assert.doesNotMatch(directory, /New This Month/);
  assert.match(directory, /All Customers/); // the list heading remains
  assert.match(directory, /customer-directory-list-heading/);
  assert.match(directory, /desktop-customers-table/);
  assert.match(directory, /mobile-customers-cards/);
  assert.equal((directory.match(/visibleCustomers\.map\(\(c\) => \(/g) || []).length, 2);
  assert.match(tabs, /All Customers/); // standalone legacy component still exists
});

test('Customer financial values come from recorded invoice balances, not zero placeholders', () => {
  assert.match(directory, /Promise\.allSettled/);
  assert.match(directory, /customerInvoiceMoney\(invoiceRows\)/);
  assert.match(directory, /formatCustomerMoney\(c\.outstanding\)/);
  assert.match(directory, /moneyAvailable/);
});


test('customer search and status filters do not re-fetch all linked resources on each keystroke', () => {
  assert.match(directory, /useMemo\(\(\) =>/);
  assert.match(directory, /customer\.__vehicles\?\.some/);
  assert.match(directory, /customer\.__jobs\?\.some/);
  assert.match(directory, /\[customers, search, statusFilter, branchFilter, typeFilter\]/);
  assert.match(directory, /useEffect\(\(\) => \{\s*fetchCustomers\(\);/);
  assert.match(directory, /customerService\.getCustomerBranches\(\)/);
  assert.match(directory, /return \(\) => \{ active = false; \};\s*}, \[\]\);/);
});

test('Add Customer on directory opens modal instead of separate route', () => {
  assert.match(directory, /onClick={openAddModal}/);
  assert.match(directory, /isOpen={isAddCustomerOpen}/);
  assert.match(directory, /checkDuplicateCustomer\(payload\)/);
  assert.doesNotMatch(directory, /navigate\('\/customers\/new'\)/);
});
