import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Quick Actions show five primary actions and preserve the rest behind a functional toggle', () => {
  const text = source('src/components/dashboard/QuickActionsPanel.jsx');
  for (const label of ['New Customer','New Job Card','Create Invoice','Record Payment','Add Expense']) {
    assert.ok(text.includes(label), 'Missing '+label);
  }
  assert.match(text, /secondaryActions\s*=\s*visibleActions\.filter/);
  assert.match(text, /aria-expanded=\{showMore\}/);
  assert.match(text, /aria-controls="dashboard-more-actions"/);
  assert.match(text, /onClick=\{\(\) => setShowMore\(value => !value\)\}/);
  assert.match(text, /secondaryActions\.map\(renderAction\)/);
  assert.match(text, /hidden=\{!showMore\}/);
});

test('dashboard overview is concise without removing actual statistic values', () => {
  const stats = source('src/components/dashboard/DashboardStats.jsx');
  assert.match(stats, /data\?\.stats\?\.todaysVehicles/);
  assert.match(stats, /data\?\.stats\?\.ongoingJobs/);
  assert.match(stats, /data\?\.stats\?\.readyForDelivery/);
  assert.match(stats, /data\?\.stats\?\.outstandingBalance/);
  assert.doesNotMatch(stats, /Live check-ins|Workshop active|Ready today|Needs follow-up/);
  assert.doesNotMatch(stats, /<span className="stat-meta">/);
});

test('service section uses compact booking, selected job and useful optional details', () => {
  const ops = source('src/components/dashboard/ServiceOperations.jsx');
  const details = source('src/components/dashboard/JobDetailPanel.jsx');
  const recent = source('src/components/dashboard/ActiveRepairPanel.jsx');
  assert.doesNotMatch(ops, /Track today's bookings and repair progress/);
  assert.doesNotMatch(ops, /New Job Card/);
  assert.match(ops, /filterPeriod/);
  assert.match(ops, /filterBranch/);
  assert.match(ops, /<BookingList/);
  assert.match(ops, /<JobDetailPanel/);
  assert.match(details, /<details className="dashboard-stages-disclosure">/);
  assert.match(details, /jobProgress\?\.\[stage\.key\] \?\? 0/);
  assert.doesNotMatch(details, /Assigned Team|Workshop A|Repair Details/);
  assert.match(recent, /jobWorkflowProgress\(activeRepair\)/);
  assert.match(recent, /canViewStock && \(stockAlerts \|\| \[\]\)\.length > 0/);
});

test('dashboard simple styles make the summary compact and mobile responsive', () => {
  const page = source('src/pages/dashboard/Dashboard.jsx');
  const css = source('src/styles/dashboard-simple.css');
  assert.match(page, /dashboard-simple\.css/);
  assert.match(css, /\.dashboard-extra-actions\[hidden\] \{ display:none !important; \}/);
  assert.match(css, /\.dashboard-stages-disclosure/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
