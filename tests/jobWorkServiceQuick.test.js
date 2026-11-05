import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Work view uses one first-class Add Service with existing advanced timer and staff', () => {
  const source=read('src/pages/jobs/JobCardWorkspace.jsx');
  assert.match(source,/workQuickSection, setWorkQuickSection\] = useState\('service'\)/);
  assert.match(source,/key: 'service', label: 'Add Service'/);
  assert.match(source,/key: 'mechanic', label: 'Advanced Work Tracking'/);
  assert.match(source,/<JobWorkServiceQuickAdd/);
  assert.match(source,/<JobWorkTimerPanel/);
  assert.match(source,/<JobOutsideStaffSection/);
  assert.match(source,/canEdit=\{can\('jobs\.edit'\) && currentStage === 'work'/);
});

test('Add Service reuses catalogue and supports nested category and selling rate search', () => {
  const source=read('src/components/jobs/JobWorkServiceQuickAdd.jsx');
  assert.match(source,/serviceService\.getServices\(\)/);
  assert.match(source,/serviceService\.getServiceCategories\(\)/);
  assert.match(source,/buildCategoryTreeRows\(categories\)/);
  assert.match(source,/categoryIsDescendantOf\(/);
  assert.match(source,/serviceService\.createService\(/);
  assert.match(source,/jobService\.addJobService\(jobId/);
  assert.match(source,/Customer Rate/);
  assert.match(source,/Mechanic \(Optional\)/);
  assert.match(source,/agreed/i);
});

test('Retry stable UUID and ledger separation - no simulated financial posting', () => {
  const source=read('src/components/jobs/JobWorkServiceQuickAdd.jsx');
  const api=read('src/services/job.service.js');
  assert.match(source,/form\.requestId \|\| crypto\.randomUUID\(\)/);
  assert.match(source,/requestId: ''/);
  assert.match(source,/Keep requestId unchanged so retries cannot duplicate/);
  assert.match(api,/work\/services/);
  assert.match(api,/Job service posting requires the live backend workflow/);
  assert.doesNotMatch(source,/issueJobStockPart\(/);
  assert.doesNotMatch(source,/createJobTimerAssignment\(/);
});

test('Mobile forms retain touch friendly inputs and theme tokens', () => {
  const css=read('src/styles/job-work-service-quick.css');
  assert.match(css,/min-height:46px/);
  assert.match(css,/font-size:16px/);
  assert.match(css,/@media\(max-width:767px\)/);
  assert.match(css, /var\(--surface\)/);
  assert.match(css, /var\(--text-primary\)/);
});
