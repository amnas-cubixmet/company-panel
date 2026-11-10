import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const list = read('src/pages/jobs/JobList.jsx');
const guide = read('src/components/jobs/JobCardsGuide.jsx');
const compact = read('src/styles/jobs-list-compact.css');

test('/jobs removes the entire workflow help section instead of just hiding it with CSS', () => {
  assert.doesNotMatch(list, /<JobCardsGuide\s*\/>/);
  assert.doesNotMatch(list, /import\s+\{\s*JobCardsGuide\s*\}/);
  assert.doesNotMatch(guide, /Add the customer and vehicle|Inspect, estimate and complete work/);
  assert.doesNotMatch(guide, /How do Job Cards work|ജോബ് കാർഡ് സഹായം/);
  assert.doesNotMatch(guide, /Use search or filters to find a job/);
  assert.doesNotMatch(guide, /New \/ Check-in|Work & Quality Check/);
});

test('job KPI summary and search are directly below header in correct order', () => {
  const header = list.indexOf('<JobsHeader');
  const summary = list.indexOf('<JobsStats');
  const filters = list.indexOf('<JobsToolbar');
  const controls = list.indexOf('<JobDirectoryControls');
  const records = list.indexOf('<JobRecordsPanel');
  const relatedFinance = list.indexOf('aria-label="Job GST and finance links"');
  assert.ok(header > 0 && summary > header, 'Status cards should follow heading');
  assert.ok(filters > summary, 'Search should follow status summary');
  assert.ok(controls > filters, 'Sort and layout controls should follow search');
  assert.ok(records > controls, 'Job records should follow filters');
  assert.ok(relatedFinance > records, 'Secondary finance links stay after the job records');
});

test('create/details workflows and permissions remain intact', () => {
  assert.match(guide, /export function JobCreateGuide/);
  assert.match(guide, /export function JobDetailGuide/);
  assert.match(list, /<JobRecordsPanel/);
  assert.match(list, /<JobsStats/);
  assert.match(list, /<JobDirectoryControls/);
  assert.match(list, /canViewPayments = can\('payments.view'\)/);
  assert.match(list, /canViewGST = can\('gstr.view'\)/);
  assert.match(list, /canCollectPayments = can\('payments.create'\)/);
  assert.match(list, /jobService\.getJobs\(\)/);
});

test('compact mobile style applies only to job directory, not print or create/details', () => {
  assert.match(list, /jobs-dashboard jobs-unified-ui jobs-list-compact/);
  assert.match(list, /styles\/jobs-list-compact\.css/);
  assert.match(compact, /@media screen \{/);
  assert.match(compact, /jobs-list-compact \.jobs-kpi-card/);
  assert.match(compact, /@media\(max-width:767px\)/);
  assert.doesNotMatch(compact, /@media print/);
});
