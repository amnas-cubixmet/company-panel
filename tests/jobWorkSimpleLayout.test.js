import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const workspace = read('../src/pages/jobs/JobCardWorkspace.jsx');
const css = read('../src/styles/job-workspace-dashboard.css');

const workStart = workspace.indexOf("{activeTab === 'work' && (");
const partsStart = workspace.indexOf("activeTab === 'parts' && (", workStart);
const work = workspace.slice(workStart, partsStart);

test('Work retains outside staff and advanced timers while surfacing Added Services', () => {
  assert.ok(workStart !== -1 && partsStart > workStart);
  const outside = work.indexOf('<JobOutsideStaffSection');
  const internal = work.indexOf('<JobWorkerAssignments');
  const timers = work.indexOf('<JobWorkTimerPanel');
  const items = work.indexOf('<JobWorkSavedServices');
  assert.ok(outside >= 0 && internal > outside && timers > internal && items > timers);
});

test('No duplicate Add Labour form or legacy Labour & Work Items bar', () => {
  assert.doesNotMatch(workspace, /const addLabour\s*=/);
  assert.doesNotMatch(workspace, /const blankLabour\s*=/);
  assert.doesNotMatch(workspace, /\[labour, setLabour\]/);
  assert.doesNotMatch(work, /<form onSubmit=\{addLabour\}/);
  assert.doesNotMatch(work, />Add Labour</);
  assert.doesNotMatch(work, /Labour & Work Items/);
  assert.match(work, /<JobWorkSavedServices/);
});

test('Work timer still allows recording internal mechanics without duplicate form', () => {
  assert.match(work, /<JobWorkTimerPanel/);
  assert.match(work, /jobStatus=\{normalizeJobStatus\(job\.status\)\}/);
  assert.match(work, /labourRecords=\{labourRecords\}/);
});

test('Added Services has a separate responsive list with safe delete controls', () => {
  const component = read('../src/components/jobs/JobWorkSavedServices.jsx');
  const styles = read('../src/styles/job-work-saved-services.css');
  assert.match(work, /<JobWorkSavedServices/);
  assert.match(component, /Added Services/);
  assert.match(component, /removeJobService\(job\.id, item\.id\)/);
  assert.match(component, /totalCustomerServiceCharges\(job\)/);
  assert.match(styles, /\.job-work-saved-row/);
  assert.match(styles, /@media\(max-width:600px\)/);
});
