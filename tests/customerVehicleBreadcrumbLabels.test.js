import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isRecordPath, recordBreadcrumbFallback, recordBreadcrumbLabel,
} from '../src/components/layout/breadcrumbRecordLabels.js';

const breadcrumb = readFileSync(new URL('../src/components/layout/AppBreadcrumbs.jsx', import.meta.url), 'utf8');
const customerPage = readFileSync(new URL('../src/pages/customers/CustomerDetails.jsx', import.meta.url), 'utf8');
const vehiclePage = readFileSync(new URL('../src/pages/vehicles/VehicleDetails.jsx', import.meta.url), 'utf8');

const customerId = 'd3a8fc98-8f97-4908-b188-88f6081fff28';
const vehicleId = '6a1cf0c7-75d1-41c3-a5d3-ffbe1fe3808b';

test('Customer breadcrumb displays a customer name and never the UUID', () => {
  assert.equal(isRecordPath('customers', customerId), true);
  assert.equal(recordBreadcrumbLabel('customers', { id: customerId, name: 'Tyrone Reyes' }), 'Tyrone Reyes');
  assert.equal(recordBreadcrumbLabel('customers', { id: customerId }), 'Customer Profile');
  assert.equal(recordBreadcrumbFallback('customers'), 'Customer Profile');
});

test('Vehicle breadcrumb displays the real registration and never the UUID', () => {
  assert.equal(isRecordPath('vehicles', vehicleId), true);
  assert.equal(recordBreadcrumbLabel('vehicles', { id: vehicleId, registration: 'KL-10-AB-1234' }), 'KL-10-AB-1234');
  assert.equal(recordBreadcrumbLabel('vehicles', { id: vehicleId, regNo: 'KL-11-XY-5010' }), 'KL-11-XY-5010');
  assert.equal(recordBreadcrumbLabel('vehicles', { id: vehicleId }), 'Vehicle Profile');
  assert.equal(recordBreadcrumbFallback('vehicles'), 'Vehicle Profile');
});

test('New and legacy static routes keep their normal labels and never fetch an ID', () => {
  for (const kind of ['customers', 'vehicles']) {
    assert.equal(isRecordPath(kind, 'new'), false);
    assert.equal(isRecordPath(kind, 'add'), false);
    assert.equal(isRecordPath(kind, ''), false);
  }
  for (const item of ['overview', 'all', 'vehicles', 'service-history', 'outstanding', 'reminders', 'reports', 'edit']) {
    assert.equal(isRecordPath('customers', item), false, item);
  }
});

test('Global breadcrumb resolves entity record name safely from live services', () => {
  assert.match(breadcrumb, /customerService\.getCustomerById\(identifier\)/);
  assert.match(breadcrumb, /vehicleService\.getVehicleById\(identifier\)/);
  assert.match(breadcrumb, /recordBreadcrumbLabel\(kind, record\)/);
  assert.match(breadcrumb, /recordBreadcrumbFallback\(segments\[0\]\)/);
  assert.match(breadcrumb, /recordLabel\?\.identifier === decodeURIComponent\(segment\)/);
  assert.match(breadcrumb, /if \(!alive\) return;/);
  assert.doesNotMatch(breadcrumb, /label:\s*prettify\(segment\),/);
});

test('Customer detail has one global navigation breadcrumb, without duplicate Back button', () => {
  assert.doesNotMatch(customerPage, /customer-profile-breadcrumb/);
  assert.doesNotMatch(customerPage, /<ArrowLeft/);
  assert.match(customerPage, /<h1>\{customer\.name \|\| 'Customer'\}<\/h1>/);
  assert.match(customerPage, /customer-profile-hero/);
});

test('Vehicle profile continues to display registration prominently and no customer ID as contact', () => {
  assert.match(vehiclePage, /<h1>\{vehicle\.registration\}<\/h1>/);
  assert.match(vehiclePage, /\{customer\?\.phone \|\| vehicle\.customerPhone \|\| 'No contact number'\}/);
  assert.doesNotMatch(vehiclePage, /customer\?\.phone \|\| vehicle\.customerId/);
});
