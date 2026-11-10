import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const toolbar = read('src/components/jobs/JobsToolbar.jsx');
const styles = read('src/styles/jobs-dashboard.css');
const jobs = read('src/pages/jobs/JobList.jsx');
const service = read('src/services/job.service.js');
const records = read('src/components/jobs/JobRecordsPanel.jsx');

test('Job Cards toolbar keeps all eight controls and labels above inputs', () => {
  for (const label of ['Search Job Cards', 'Status', 'Branch', 'Technician', 'Priority',
    'From Date', 'To Date', 'Matching Records', 'Reset Filters']) {
    assert.ok(toolbar.includes(label), 'Missing toolbar label: ' + label);
  }
  for (const handler of ['onQueryChange', 'onStatusChange', 'onBranchChange',
    'onTechnicianChange', 'onPriorityChange', 'onFromChange', 'onToChange', 'onReset']) {
    assert.ok(toolbar.includes(handler), 'Missing handler: ' + handler);
  }
  assert.equal((toolbar.match(/type="search"/g) || []).length, 1);
  assert.doesNotMatch(toolbar, /createPortal|role="dialog"/);
});

test('Job Cards grid uses two rows at sufficient width, with responsive tablet and mobile rules', () => {
  assert.match(styles, /@container \(min-width: 920px\)/);
  assert.match(styles, /grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.jobs-filter-search \{ grid-column: span 4; \}/);
  assert.match(styles, /\.jobs-toolbar-actions \{ grid-column: span 6; \}/);
  assert.match(styles, /@container \(max-width: 670px\)/);
  assert.match(styles, /@container \(max-width: 410px\)/);
  assert.match(styles, /font-size: 16px/);
  assert.match(styles, /var\(--surface-2\)/);
  assert.match(styles, /var\(--primary-soft\)/);
  assert.doesNotMatch(styles, /\.jobs-toolbar-combined\s*\{\s*display:flex;flex-wrap:wrap/);
});

test('date range cannot be reversed; date inputs keep native icons and accessible labels', () => {
  assert.match(toolbar, /type="date"/);
  assert.match(toolbar, /max=\{to \|\| undefined\}/);
  assert.match(toolbar, /min=\{from \|\| undefined\}/);
  assert.match(toolbar, /value <= to/);
  assert.match(toolbar, /value >= from/);
  assert.match(styles, /::-webkit-calendar-picker-indicator/);
  assert.match(jobs, /if \(!from \|\| !to \|\| from <= to\) return/);
});

test('filters preserve other URL parameters and reset page; count, pagination and list remain truthful', () => {
  assert.match(jobs, /new URLSearchParams\(searchParams\)/);
  assert.match(jobs, /next\.delete\('page'\)/);
  assert.match(jobs, /setSearchParams\(next\)/);
  assert.match(jobs, /const resetFilters = \(\) => \{/);
  assert.match(jobs, /if \(layout === 'cards'\) next\.set\('layout', 'cards'\)/);
  assert.match(jobs, /const sortedJobs = useMemo\(\(\) => sortJobsForDisplay\(filteredJobs, sortMode\)/);
  assert.match(jobs, /sortedJobs\.slice\(/);
  assert.match(jobs, /resultCount=\{filteredJobs\.length\}/);
  assert.match(jobs, /hasActiveFilters=\{/);
  assert.match(records, /hasActiveFilters \|\| searchTerm/);
  assert.match(service, /apiClient\.get\(API_ENDPOINTS\.JOBS/);
});
