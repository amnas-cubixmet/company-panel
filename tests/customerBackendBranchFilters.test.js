import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('customer branch dropdown reads real per-company API choices, even without existing customers', () => {
  const service = read('src/services/customer.service.js');
  const page = read('src/pages/customers/CustomerList.jsx');
  assert.match(service, /getCustomerBranches/);
  assert.match(service, /branch-options/);
  assert.match(page, /customerService\.getCustomerBranches\(\)/);
  assert.match(page, /branchChoices\.map\(\(item\) =>/);
  assert.match(page, /value=\{item\.id\}/);
  assert.doesNotMatch(page, /<option value="Kochi South Branch">/);
  assert.doesNotMatch(page, /<option value="Main Garage Branch">/);
});

test('customer create and duplicate-check payloads normalize business type and only send valid selected branches', () => {
  const page = read('src/pages/customers/CustomerList.jsx');
  assert.match(page, /backendCustomerType\(customerType\)/);
  assert.match(page, /branch \? \{ branch \} : \{\}/);
  assert.match(page, /setBranch\(c\.branchId/);
  assert.match(page, /normalizeCustomerType\(customer\.customerType\)/);
});

test('duplicate-check maps Django envelope to actual customer or null before showing warning', () => {
  const service = read('src/services/customer.service.js');
  const page = read('src/pages/customers/CustomerList.jsx');
  assert.match(service, /result\?\.duplicate === true && result\?\.customer\?\.id/);
  assert.match(service, /\? result\.customer : null/);
  assert.match(page, /if \(match\) \{/);
  assert.match(page, /setDuplicateFound\(match\)/);
});
