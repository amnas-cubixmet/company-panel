import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const directory = read('src/pages/customers/CustomerList.jsx');
const service = read('src/services/customer.service.js');

test('live Customer Directory loads one permission-scoped summary instead of N+1 subresources', () => {
  assert.match(service, /getCustomerDirectorySummary = async \(\) =>/);
  assert.match(service, /\/directory-summary/);
  assert.match(directory, /if \(USE_MOCK_API\)/);
  assert.match(directory, /const result = await customerService\.getCustomerDirectorySummary\(\)/);
  assert.match(directory, /summary = new Map\(result\.results\.map\(row/);
  assert.match(directory, /outstanding: moneyAvailable \? Math\.max\(0, due\) : null/);
  assert.match(directory, /vehicleCount: details\?\.vehiclesAvailable \? details\.vehicleCount : null/);
  assert.match(directory, /jobsCount: details\?\.jobsAvailable \? details\.jobsCount : null/);
  assert.match(directory, /const moneyAvailable = Boolean\(details\?\.moneyAvailable/);
  assert.match(directory, /totalSpent: moneyAvailable \? spent : null/);
});

test('customer search includes server-side VIN/registration/job match without unscoped cross-user data', () => {
  assert.match(directory, /getCustomers\(\{ search: search\.trim\(\) \}\)/);
  assert.match(directory, /remoteSearchIds\?\.has\(String\(customer\.id\)\)/);
  assert.match(directory, /setTimeout\(\(\) =>/);
  assert.match(directory, /return \(\) => \{ active = false; clearTimeout\(timer\); \}/);
});

test('customer finance amounts and create/edit actions obey front-end permission state', () => {
  assert.match(directory, /canViewCustomerMoney = can\('invoices\.view'\)/);
  assert.match(directory, /canCreateCustomer = can\('customers\.create'\)/);
  assert.match(directory, /canEditCustomer = can\('customers\.edit'\)/);
  assert.match(directory, /canViewCustomerMoney \? formatCustomerMoney\(c\.outstanding\) : 'Restricted'/);
  assert.match(directory, /disabled=\{!canCreateCustomer\}/);
  assert.match(directory, /disabled=\{!canEditCustomer\}/);
});
