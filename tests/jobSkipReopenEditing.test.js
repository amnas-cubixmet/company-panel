import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const panel = read('src/components/jobs/JobInspectionPanel.jsx');
const estimate = read('src/components/jobs/QuickEstimatePanel.jsx');
const workspace = read('src/pages/jobs/JobCardWorkspace.jsx');
const inspectionService = read('src/services/jobInspection.service.js');
const jobService = read('src/services/job.service.js');
const estimateStyles = read('src/styles/job-estimate-quick.css');

test('skipped inspection offers an audited reopen action before corrections', () => {
  assert.match(panel, /isSkipped && canEdit && \(/);
  assert.match(panel, /Edit Skipped Inspection/);
  assert.match(panel, /disabled={!canReopen \|\| !!busy}/);
  assert.match(panel, /perform\('reopen', \(\) => jobInspectionService\.reopenInspection\(job\.id\)\)/);
  assert.match(inspectionService, /inspection\/reopen/);
  assert.match(inspectionService, /requires the live Django backend/);
});

test('estimate header offers Edit Skipped Estimate and explains a blocked reopen', () => {
  assert.match(estimate, /Edit Skipped Estimate/);
  assert.match(estimate, /wasSkipped && \(/);
  assert.match(estimate, /reopenSkippedEstimate/);
  assert.match(estimate, /await onReopen\(\)/);
  assert.match(estimate, /disabled={!canReopen \|\| busy \|\| reopenBusy}/);
  assert.match(estimate, /Later work or billing prevents reopening/);
  assert.match(jobService, /estimate\/reopen/);
  assert.match(estimateStyles, /\.job-quick-header-actions/);
});

test('workspace gates both reopen paths by jobs.edit and current workflow stage', () => {
  assert.match(workspace, /canReopen={can\('jobs.edit'\) && inspectionWasSkipped && currentStage === 'estimate' && !activeTabLocked}/);
  assert.match(workspace, /canReopen={can\('jobs.edit'\) && estimateWasSkipped && currentStage === 'work' && !activeTabLocked}/);
  assert.match(workspace, /await jobService\.reopenJobEstimate\(job\.id\)/);
  assert.match(workspace, /navigate\('\/jobs\/' \+ job\.id \+ '\/estimate', \{ replace: true \}\)/);
  assert.match(workspace, /refreshJobWorkflow\(\)/);
});
