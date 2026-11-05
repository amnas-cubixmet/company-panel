import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Estimate remains a separate skipped state and is never labelled approved', () => {
  const workspace = read('src/pages/jobs/JobCardWorkspace.jsx');
  assert.match(workspace, /workflow\?\.estimateDecision\?\.status === 'Skipped'/);
  assert.match(workspace, /workflow\?\.skipped\?\.includes\('estimate'\)/);
  assert.match(workspace, /key === 'estimate' && estimateWasSkipped/);
  assert.match(workspace, /skipped \? label \+ ' skipped \(not approved or completed\)'/);
  assert.match(workspace, /job-workflow-tab-skipped/);
});

test('Only jobs.edit may display editable estimate, approval and Skip Estimate controls', () => {
  const workspace = read('src/pages/jobs/JobCardWorkspace.jsx');
  const estimate = read('src/components/jobs/QuickEstimatePanel.jsx');
  assert.match(workspace, /canEdit=\{can\('jobs\.edit'\) && currentStage === 'estimate' && !activeTabLocked\}/);
  assert.match(estimate, /\{canEdit &&/);
  assert.match(estimate, /disabled=\{busy \|\| skipBusy\}/);
  assert.match(estimate, /onSkip=|await onSkip\(/);
  assert.match(estimate, /Skip Estimate/);
});

test('Backend-oriented service does not mock customer consent or estimate skips', () => {
  const service = read('src/services/job.service.js');
  assert.match(service, /Skip Estimate requires the live backend audit workflow/);
  assert.match(service, /estimate\/skip/);
});
