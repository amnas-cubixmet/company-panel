import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const list = read('src/pages/jobs/JobList.jsx');
const toolbar = read('src/components/jobs/JobsToolbar.jsx');
const header = read('src/components/jobs/JobsHeader.jsx');
const records = read('src/components/jobs/JobRecordsPanel.jsx');
const stats = read('src/components/jobs/JobsStats.jsx');
const create = read('src/pages/jobs/JobCreatePage.jsx');
const detail = read('src/pages/jobs/JobCardWorkspace.jsx');
const vehicleLookup = read('src/components/jobs/VehicleLookupPanel.jsx');
const css = read('src/styles/jobs-unified-ui.css');

test('job list keeps existing server fetch, filters and URL-backed pagination', () => {
  assert.match(list, /jobService\.getJobs\(\)/);
  assert.match(list, /new URLSearchParams\(searchParams\)/);
  assert.match(list, /changeFilter\('status', value\)/);
  assert.match(list, /const pageSize = 15/);
  assert.match(list, /from <= to/);
  assert.match(list, /job\.branchId/);
  assert.match(list, /job\.assignedEmployeeId/);
  assert.match(list, /job\.priority/);
  assert.match(list, /job\.vehicleReg/);
  assert.match(list, /<JobsToolbar/);
  assert.match(list, /<JobRecordsPanel/);
});

test('failed jobs API clears stale jobs and never shows false empty or zero records', () => {
  assert.match(list, /setJobs\(\[\]\);\s*setLoadError\(/);
  assert.match(list, /!loadError && <JobsStats/);
  assert.match(list, /hasError=\{Boolean\(loadError\)\}/);
  assert.match(records, /hasError \? \(/);
  assert.match(records, /Job Cards are unavailable/);
  assert.match(list, /setReloadKey\(\(value\) => value \+ 1\)/);
});

test('unavailable invoice API does not misreport a job as unpaid, paid or uninvoiced', () => {
  assert.match(list, /canViewInvoices = can\('invoices\.view'\)/);
  assert.match(list, /canViewPayments = can\('payments\.view'\)/);
  assert.match(list, /canCollectPayments = can\('payments\.create'\)/);
  assert.match(list, /canViewTotals=\{canViewPayments\}/);
  assert.match(vehicleLookup, /canViewTotals && <LookupStat/);
  assert.match(list, /billingService\.list\(\{ kind: 'invoice' \}\)/);
  assert.match(list, /invoicesError=\{Boolean\(invoicesError\)\}/);
  assert.match(records, /invoicesError \? 'Invoice unavailable' : 'Not invoiced'/);
  assert.match(records, /invoicesError \? 'Unavailable' : !finance\.posted/);
  assert.match(records, /canViewPayments && finance\.posted/);
});

test('advanced job filters are mobile-collapsible but retain active URL values', () => {
  assert.match(toolbar, /const advancedActive = branch !== 'all' \|\| technician !== 'all'/);
  assert.match(toolbar, /useState\(advancedActive\)/);
  assert.match(toolbar, /if \(advancedActive\) setShowAdvanced\(true\)/);
  assert.match(toolbar, /aria-expanded=\{showAdvanced\}/);
  assert.match(toolbar, /aria-controls="jobs-advanced-filters"/);
  assert.match(toolbar, /value=\{branch\}/);
  assert.match(toolbar, /value=\{technician\}/);
  assert.match(toolbar, /value=\{priority\}/);
  assert.match(toolbar, /value=\{from\}/);
  assert.match(toolbar, /value=\{to\}/);
  assert.match(toolbar, /onReset/);
  assert.match(css, /@container \(max-width:670px\)/);
  assert.match(css, /\.jobs-advanced-filters\.is-open/);
  assert.match(css, /display:contents/);
});

test('job directory, create and detail views omit help panels while retaining accessible actions', () => {
  assert.doesNotMatch(list, /<JobCardsGuide\/>/);
  assert.doesNotMatch(list, /import \{ JobCardsGuide \}/);
  assert.doesNotMatch(create, /<JobCreateGuide/);
  assert.doesNotMatch(detail, /<JobDetailGuide/);
  assert.match(header, /Create Job Card/);
  assert.match(css, /^\/\*[\s\S]*?@media screen \{/);
  assert.doesNotMatch(css, /@media print/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(records, /aria-label="Job Card directory"/);
  assert.match(records, /View Job Card/);
  assert.match(stats, /aria-pressed=\{selectedStatus === filter\}/);
});

test('original workshop workflows, photos, financial access and status actions remain connected', () => {
  assert.match(create, /jobService\.createJob/);
  assert.match(create, /createRequestId/);
  assert.match(create, /JobCustomerPicker/);
  assert.match(create, /JobComplaintEntries/);
  assert.match(detail, /jobService\.updateJob/);
  assert.match(detail, /jobService\.getJobWorkflow/);
  assert.match(detail, /<JobPartsWorkflow/);
  assert.match(detail, /<QuickEstimatePanel/);
  assert.match(detail, /hasInvoiceAccess = can\('invoices\.view'\)/);
  assert.match(detail, /canCreatePayment = can\('payments\.create'\)/);
});
