import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { JOB_SORT_OPTIONS, sortJobsForDisplay } from '../src/components/jobs/jobDirectorySort.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const list = read('src/pages/jobs/JobList.jsx');
const records = read('src/components/jobs/JobRecordsPanel.jsx');
const controls = read('src/components/jobs/JobDirectoryControls.jsx');
const css = read('src/styles/jobs-directory-controls.css');

const sample = [
  { id: 'a', createdDate: '2026-11-08', customerName: 'Zarah', vehicleReg: 'KL10AB9' },
  { id: 'b', createdDate: '2026-11-10', customerName: 'amjad', vehicleReg: 'KL10AB2' },
  { id: 'c', createdDate: '2026-11-09', customerName: 'Biju', vehicleReg: 'KL10AB12' },
];

test('sort orders are stable and never mutate live job rows', () => {
  const original = [...sample];
  assert.deepEqual(sortJobsForDisplay(sample, 'recent').map(x => x.id), ['b','c','a']);
  assert.deepEqual(sortJobsForDisplay(sample, 'oldest').map(x => x.id), ['a','c','b']);
  assert.deepEqual(sortJobsForDisplay(sample, 'customer').map(x => x.id), ['b','c','a']);
  assert.deepEqual(sortJobsForDisplay(sample, 'vehicle').map(x => x.id), ['b','a','c']);
  assert.deepEqual(sample, original);
  assert.equal(JOB_SORT_OPTIONS.length, 4);
});

test('unparseable dates preserve API order, not invented chronology', () => {
  const jobs = [{ id: 'a', createdDate:'unknown' }, { id:'b', createdDate:'2026-11-10' }];
  assert.deepEqual(sortJobsForDisplay(jobs, 'recent').map(x=>x.id), ['a','b']);
  assert.deepEqual(sortJobsForDisplay(jobs, 'oldest').map(x=>x.id), ['a','b']);
  assert.deepEqual(sortJobsForDisplay(null, 'recent'), []);
});

test('Jobs URL controls keep pagination and filter values, clearing page only after sort/filter', () => {
  assert.match(list, /const sortMode = JOB_SORT_OPTIONS\.some/);
  assert.match(list, /searchParams\.get\('layout'\) === 'cards'/);
  assert.match(list, /const setLayout = \(value\) => \{/);
  assert.match(list, /next\.set\('layout', 'cards'\)/);
  assert.match(list, /const setSort = \(value\) => changeFilter\('sort'/);
  assert.match(list, /next\.delete\('page'\)/);
  assert.match(list, /const sortedJobs = useMemo\(\(\) => sortJobsForDisplay/);
  assert.match(list, /sortedJobs\.slice\(\(currentPage - 1\) \* pageSize/);
  assert.match(list, /const pageSize = 15/);
});

test('Table / Cards layout preserves same customer and finance permission gates', () => {
  assert.match(list, /canViewInvoices = can\('invoices.view'\)/);
  assert.match(list, /canViewPayments = can\('payments.view'\)/);
  assert.match(list, /canCollectPayments = can\('payments.create'\)/);
  assert.match(list, /<JobDirectoryControls/);
  assert.match(list, /layout=\{layout\}/);
  assert.match(records, /layout === 'cards' \? ' is-card-layout' : ''/);
  assert.match(records, /<table className="jobs-table" aria-label="Job Card directory"/);
  assert.match(records, /<div className="jobs-mobile-list">/);
  assert.match(records, /canViewPayments && finance\.posted/);
  assert.match(records, /canCollectPayments && finance\.paymentUrl/);
});

test('remove individual applied filters while preserving other selections', () => {
  assert.match(controls, /activeFilters\.map\(filter =>/);
  assert.match(controls, /onClearFilter\(filter\.key\)/);
  assert.match(controls, /aria-pressed=\{layout === 'cards'\}/);
  assert.match(controls, /aria-label="Job Card display layout"/);
  assert.match(list, /onClearFilter=\{key => changeFilter\(key, 'all'\)\}/);
  assert.match(list, /onClearAll=\{resetFilters\}/);
  assert.match(list, /sortMode !== 'recent'/);
});

test('touch-friendly card layout does not alter job PDF/print styling', () => {
  assert.match(css, /^\/\* CubixGear Job Cards/);
  assert.match(css, /@media screen \{/);
  assert.match(css, /jobs-records-panel\.is-card-layout \.jobs-mobile-list/);
  assert.match(css, /@media \(max-width:767px\)/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /@media print/);
  assert.match(list, /jobs-directory-controls\.css/);
});
