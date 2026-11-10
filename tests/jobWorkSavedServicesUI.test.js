import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  savedJobServices, serviceLineCharge, totalCustomerServiceCharges,
} from '../src/utils/jobWorkServiceCharges.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/jobs/JobCardWorkspace.jsx');
const summary = read('src/components/jobs/JobTotalCostPanel.jsx');
const added = read('src/components/jobs/JobWorkSavedServices.jsx');
const service = read('src/services/job.service.js');

test('customer selling rates are distinct from mechanic and stock costs', () => {
  const job = { work: [
    { id: 'a', serviceId: 'svc-a', billable: true, customerCharge: '666.00', quantity: '1', customerRate: '666.00' },
    { id: 'b', serviceId: 'svc-b', billable: true, quantity: '2', customerRate: '100.00' },
    { id: 'timer', service: 'Mechanic session', hours: '2', rate: '20' },
  ] };
  assert.equal(savedJobServices(job).length, 2);
  assert.equal(totalCustomerServiceCharges(job), 866);
  assert.equal(serviceLineCharge(job.work[0]), 666);
  assert.equal(totalCustomerServiceCharges({ work: [] }), 0);
  assert.equal(totalCustomerServiceCharges({}), 0);
});

test('Total Cost area shows customer service charges separately without adding to direct costs', () => {
  assert.match(page, /customerServiceCharges={customerServiceCharges}/);
  assert.match(page, /totalCustomerServiceCharges\(job\)/);
  assert.match(summary, /Customer Service Charges/);
  assert.match(summary, /not included in Total Cost/);
  assert.match(summary, /value: summary\?\.totalCost/);
  assert.doesNotMatch(summary, /totalCost\s*\+\s*customerServiceCharges/);
});

test('Added Services replaces old collapsible Labour bar and offers audited removal', () => {
  assert.match(page, /<JobWorkSavedServices/);
  assert.doesNotMatch(page, /<summary>Labour & Work Items/);
  assert.match(added, /appConfirm\(/);
  assert.match(added, /await jobService\.removeJobService\(job\.id, item\.id\)/);
  assert.match(added, /await onChanged\?\.\(result\?\.job\)/);
  assert.match(added, /canEdit &&/);
  assert.match(added, /aria-label=\{\x60Remove /);
  assert.match(service, /work\/services\/\$\{encodeURIComponent\(workId\)\}/);
  assert.match(page, /setTimerRefreshVersion\(\(version\) => version \+ 1\)/);
});

test('saved services preserve all mechanic records and never convert unpaid charge into cost', () => {
  assert.match(added, /agreedWorkerCharge/);
  assert.match(added, /not yet paid/);
  assert.match(page, /<JobWorkTimerPanel/);
  assert.match(page, /labourRecords={labourRecords}/);
  assert.match(added, /Quantity|Qty /);
});
