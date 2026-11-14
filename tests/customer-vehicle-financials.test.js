import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildCustomerVehicleFinances, resolveCustomerVehicleId,
  vehicleRegistration, vehicleMakeModel,
} from '../src/pages/customers/customerVehicleFinancials.js';

const vehicles = [
  { id: 'car-a', registration: 'KL 10 AB 1234', make: 'Toyota', model: 'Innova' },
  { id: 'car-b', registration: 'KL-10-CD-4321', make: 'Maruti', model: 'Swift' },
];
const jobs = [
  { id: 'job-a', vehicleId: 'car-a', jobNumber: 'JOB-001' },
  { id: 'job-b', vehicleReg: 'KL10CD4321', jobNumber: 'JOB-002' },
];
const invoices = [
  { id: 'inv-a', vehicleId: 'car-a', kind: 'invoice', status: 'Paid',
    total: '1000.00', paid: '1000.00', balance: '0.00' },
  { id: 'inv-b', jobId: 'job-b', kind: 'invoice', status: 'Partially Paid',
    total: '2000.00', paid: '800.00', balance: '1200.00' },
  { id: 'inv-direct', kind: 'invoice', status: 'Finalized',
    total: '500.00', paid: '0.00', balance: '500.00' },
  { id: 'inv-draft', vehicleId: 'car-a', kind: 'invoice', status: 'Draft',
    total: '9999.00', paid: '0.00', balance: '9999.00' },
  { id: 'inv-estimate', vehicleId: 'car-b', kind: 'estimate', status: 'Finalized',
    total: '7777.00', paid: '0.00', balance: '7777.00' },
  { id: 'inv-cancelled', vehicleId: 'car-a', kind: 'invoice', status: 'Cancelled',
    total: '6666.00', paid: '0.00', balance: '6666.00' },
];

test('vehicle serialization uses real registration, make and model', () => {
  assert.equal(vehicleRegistration(vehicles[0]), 'KL 10 AB 1234');
  assert.equal(vehicleMakeModel(vehicles[0]), 'Toyota Innova');
  assert.equal(vehicleRegistration({ regNo: 'KL10AB1234' }), 'KL10AB1234');
});

test('invoice vehicle link resolves directly, through job ID, or exact normalized registration', () => {
  assert.equal(resolveCustomerVehicleId(invoices[0], vehicles, jobs), 'car-a');
  assert.equal(resolveCustomerVehicleId(invoices[1], vehicles, jobs), 'car-b');
  assert.equal(resolveCustomerVehicleId({ vehicle: 'KL-10-AB-1234' }, vehicles, jobs), 'car-a');
  assert.equal(resolveCustomerVehicleId({ vehicleId: 'foreign-vehicle', vehicleReg: 'KL10AB1234' }, vehicles, jobs), null);
  assert.equal(resolveCustomerVehicleId({ vehicle: 'unknown' }, vehicles, jobs), null);
});

test('vehicle totals sum only finalized issued invoice records and do not double count payments', () => {
  const model = buildCustomerVehicleFinances({ vehicles, jobs, invoices });
  assert.deepEqual(model.overall, { billed: 3500, paid: 1800, outstanding: 1700 });
  assert.deepEqual(model.vehicles[0].financials, { billed: 1000, paid: 1000, outstanding: 0 });
  assert.deepEqual(model.vehicles[1].financials, { billed: 2000, paid: 800, outstanding: 1200 });
  assert.equal(model.unassignedInvoices.length, 1);
  assert.equal(model.unassignedInvoices[0].id, 'inv-direct');
  assert.equal(model.finalizedInvoices.length, 3);
  assert.equal(model.vehicles[0].jobs.length, 1);
  assert.equal(model.vehicles[1].jobs.length, 1);
});

test('unauthorized or unavailable invoice totals stay hidden rather than invented', () => {
  const model = buildCustomerVehicleFinances({
    vehicles, jobs, invoices, invoicesAvailable: false,
  });
  assert.equal(model.overall.billed, null);
  assert.equal(model.vehicles[0].financials.paid, null);
  const partial = buildCustomerVehicleFinances({
    vehicles, jobs, invoices: [{ id: 'incomplete', vehicleId: 'car-a', status: 'Finalized' }],
  });
  assert.equal(partial.overall.paid, null);
  assert.equal(partial.vehicles[0].financials.billed, null);
});

test('financial panel exposes vehicle drill-down, verified values and unassigned notice', () => {
  const panel = readFileSync(new URL('../src/components/customers/CustomerVehicleFinancePanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /Total Invoiced/);
  assert.match(panel, /Payments Received/);
  assert.match(panel, /Total Outstanding/);
  assert.match(panel, /Vehicle Breakdown/);
  assert.match(panel, /Vehicle not linked/);
  assert.match(panel, /not added again/);
  assert.match(panel, /finalized invoice/i);
});

test('customer tabs show no hardcoded demo service charges and persist staff notes', () => {
  const page = readFileSync(new URL('../src/pages/customers/CustomerDetails.jsx', import.meta.url), 'utf8');
  assert.match(page, /id: 'finance'/);
  assert.match(page, /customerProfileFinancials\(filteredInvoices/);
  assert.match(page, /customerService\.updateCustomer\(customer\.id, \{ notes \}\)/);
  assert.doesNotMatch(page, /invoiceTotal \|\| 12500/);
  assert.doesNotMatch(page, /Engine vibration/);
  assert.doesNotMatch(page, /Toyota Innova.*service history/);
  assert.match(page, /Record Payment/);
  assert.match(page, /Save Document Reference/);
});
