import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const panel = read('../src/components/jobs/JobTotalCostPanel.jsx');
const workspace = read('../src/pages/jobs/JobCardWorkspace.jsx');
const css = read('../src/styles/job-workspace-dashboard.css');

test('Total Cost has no manual refresh action', () => {
  assert.doesNotMatch(panel, /RefreshCw|setReload|setReload\(/);
  assert.doesNotMatch(panel, /Refresh job total costs|job-total-cost-refresh/);
  assert.doesNotMatch(panel, /Updates automatically|job-total-cost-auto-note/);
});

test('Total Cost immediately loads on Job, stage or successful mutation changes', () => {
  assert.match(panel, /void loadCosts\(\)/);
  assert.match(panel, /\[jobId, refreshVersion, refreshOnTab, permitted\]/);
  assert.match(workspace, /<JobTotalCostPanel[\s\S]*?refreshVersion=\{timerRefreshVersion\}[\s\S]*?refreshOnTab=\{activeTab\}/);
  assert.match(workspace, /<JobOutsideStaffSection[\s\S]*?onChanged=\{\(\) => setTimerRefreshVersion/);
  assert.match(workspace, /<JobPartsWorkflow[\s\S]*?onJobUpdated=\{\(\) => \{\s*setTimerRefreshVersion/);
});

test('Work cost updates every 30 seconds while visible and when focus returns', () => {
  assert.match(panel, /if \(refreshOnTab !== 'work'\)/);
  assert.match(panel, /document\.visibilityState !== 'visible'/);
  assert.match(panel, /window\.setInterval\(syncWhenVisible, 30000\)/);
  assert.match(panel, /window\.addEventListener\('focus', syncWhenVisible\)/);
  assert.match(panel, /document\.addEventListener\('visibilitychange', syncWhenVisible\)/);
  assert.match(panel, /window\.clearInterval\(intervalId\)/);
  assert.match(panel, /window\.removeEventListener\('focus', syncWhenVisible\)/);
  assert.match(panel, /document\.removeEventListener\('visibilitychange', syncWhenVisible\)/);
});

test('Auto-update prevents concurrent loads and stale Job Card data or requests', () => {
  assert.match(panel, /if \(!active \|\| inFlight\) return/);
  assert.match(panel, /if \(Date\.now\(\) - lastRequestAt < 3000\) return/);
  assert.match(panel, /const summary = costState\.jobId === jobId \? costState\.data : null/);
  assert.match(panel, /if \(active\) setCostState\(\{ jobId, data \}\)/);
  assert.match(panel, /active = false/);
  assert.doesNotMatch(panel, /setSummary\(null\)/);
});

test('Total Cost keeps readable 4-column summary and auto-update styling', () => {
  assert.match(panel, /summary\?\.totalCost/);
  assert.match(panel, /summary\?\.outsideStaffCost/);
  assert.match(panel, /summary\?\.partsCost/);
  assert.doesNotMatch(css, /\.job-total-cost-auto-note/);
  assert.doesNotMatch(css, /job-total-cost-refresh/);
});
