import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const panel = read('src/components/jobs/JobInspectionPanel.jsx');
const service = read('src/services/jobInspection.service.js');
const workspace = read('src/pages/jobs/JobCardWorkspace.jsx');
const css = read('src/styles/job-inspection-simple.css');
const records = read('src/components/jobs/JobRecordsPanel.jsx');

test('Skip Inspection posts to dedicated real API and cannot spoof existing Complete Inspection', () => {
  assert.match(service, /export const skipInspection = async \(jobId, reason\)/);
  assert.match(service, /\/inspection\/skip/);
  assert.match(service, /requires the live Django backend/);
  assert.match(service, /export const completeInspection/);
  assert.match(service, /\/inspection\/complete/);
});

test('skip confirmation offers real reason choices including custom Other text', () => {
  for (const reason of ['Quick Service', 'Customer Declined Inspection', 'Inspection Not Required', 'Other']) {
    assert.ok(panel.includes(reason));
  }
  assert.match(panel, /title="Confirm Skip Inspection"/);
  assert.match(panel, /skipChoice === 'Other'/);
  assert.match(panel, /maxLength=\{160\}/);
  assert.match(panel, /jobInspectionService\.skipInspection\(job\.id, skipReason\)/);
  assert.match(panel, /skipInFlight\.current/);
});

test('no item is marked Good by skipping; status Skipped is a separate read-only terminal state', () => {
  assert.match(panel, /const isSkipped = inspection\?\.status === 'Skipped'/);
  assert.match(panel, /isStarted && !isSkipped/);
  assert.match(panel, /skippedAt/);
  assert.match(panel, /skipReason/);
  assert.match(panel, /No unchecked items were marked Good/);
  assert.doesNotMatch(
    service.slice(service.indexOf('export const skipInspection'), service.indexOf('export const completeInspection')),
    /updateChecklistItem|status:\s*['"]Good['"]/
  );
});

test('N/A contributes to reviewed progress but is never counted as a Good check', () => {
  assert.match(panel, /const inspected = \(value\) => \['Good', 'Needs Attention', 'Critical'\]/);
  assert.match(panel, /const reviewed = \(value\) => inspected\(value\) \|\| value === 'Not Applicable'/);
  assert.match(panel, /applicableSkipped/);
  assert.match(panel, /is-na/);
  assert.match(panel, /completed === 0/);
});

test('footer contains paired Skip and Start/Complete actions, disabled by policy and saved status', () => {
  assert.match(panel, /cg-inspection-footer-actions/);
  assert.match(panel, /Skip Inspection/);
  assert.match(panel, /Complete Inspection/);
  assert.match(panel, /Start Inspection/);
  assert.match(panel, /!maySkip \|\| !!busy/);
  assert.match(panel, /inspection\?\.skipAllowed !== false/);
  assert.match(panel, /role="alert"/);
});

test('mobile footer has zero horizontal overflow, two flexible actions and safe-area padding', () => {
  assert.match(css, /\.cg-inspection-footer-actions\s*\{/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /padding-bottom:calc\(112px/);
  assert.match(css, /white-space:normal/);
  assert.match(css, /max-width:100%/);
});

test('workflow only advances after refreshing backend response; skipped indicator differs from completed check', () => {
  assert.match(workspace, /operation === 'complete'|\['complete', 'skip'\]\.includes\(operation\)/);
  assert.match(workspace, /const inspectionWasSkipped =/);
  assert.match(workspace, /job-workflow-tab-skipped/);
  assert.match(workspace, /<SkipForward size=\{14\} className="job-workflow-tab-check" aria-label="Skipped"/);
  assert.match(workspace, /canEdit=\{can\('jobs.edit'\)/);
});

test('job management table and mobile card show separate inspection skipped status', () => {
  assert.match(records, /job\.inspection\?\.status === 'Skipped'/);
  assert.ok((records.match(/jobs-inspection-skip-tag/g) || []).length >= 2);
});
