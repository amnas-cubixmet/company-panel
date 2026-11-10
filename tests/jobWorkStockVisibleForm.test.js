import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const workspace = read('src/pages/jobs/JobCardWorkspace.jsx');
const stockPanel = read('src/components/jobs/JobWorkStockPanel.jsx');
const jobService = read('src/services/job.service.js');

test('Stock & Parts Used add form is always mounted and visible on Work page', () => {
  assert.match(workspace, /<div id="work-quick-stock">/);
  assert.doesNotMatch(workspace, /id="work-quick-stock" hidden=/);
  assert.match(workspace, /<JobWorkStockPanel/);
  assert.match(stockPanel, /Stock & Parts Used/);
  assert.match(stockPanel, /<form className="job-work-stock-form" onSubmit=\{issue\}>/);
  assert.match(stockPanel, /Add Part to Job/);
  assert.match(stockPanel, /Find Stock Item/);
  assert.match(stockPanel, /Issue Quantity/);
  assert.match(stockPanel, /Issued Parts/);
});

test('Add Spare Part action scrolls to the always-visible form and focuses search', () => {
  assert.match(workspace, /if \(key === 'stock'\) \{/);
  assert.match(workspace, /getElementById\('work-quick-stock'\)\?\.scrollIntoView/);
  assert.match(workspace, /setStockQuickToken\(\(value\) => value \+ 1\)/);
  assert.match(stockPanel, /searchInputRef\.current\?\.focus\(\)/);
});

test('Add Part uses existing atomic stock issue and never decrements on selection', () => {
  assert.match(stockPanel, /appConfirm\(/);
  assert.match(stockPanel, /await jobService\.issueJobStockPart\(jobId, selected\.id, requested\)/);
  assert.match(jobService, /issue-part/);
  assert.match(stockPanel, /requested <= stockQty/);
  assert.match(stockPanel, /Stock is deducted only after confirming Issue Stock/);
  assert.match(stockPanel, /Promise\.allSettled/);
  assert.doesNotMatch(stockPanel, /stockService\.issueStock\(/);
  assert.match(workspace, /setTimerRefreshVersion\(\(version\) => version \+ 1\)/);
});

test('Only authorized staff in active Work stage can add; everyone else sees explanation', () => {
  assert.match(workspace, /canEdit=\{can\('jobs\.edit'\) && currentStage === 'work' && !activeTabLocked\}/);
  assert.match(stockPanel, /canEdit && hasPermission\(user, 'stock\.edit'\) && hasPermission\(user, 'jobs\.edit'\)/);
  assert.match(stockPanel, /!canIssue && \(/);
  assert.match(stockPanel, /role="status"/);
  assert.match(stockPanel, /read-only after the Work stage/);
  assert.match(stockPanel, /canIssue && \(/);
  assert.match(stockPanel, /if \(!canView\) return null/);
});

test('Add form lets user pick from available inventory before searching', () => {
  assert.match(stockPanel, /const list = inventory\.filter\(item => !term \|\|/);
  assert.match(stockPanel, /!selected && !loading/);
  assert.match(stockPanel, /aria-label="Matching stock items"/);
  assert.match(stockPanel, /No stock items available/);
  assert.match(stockPanel, /available quantity is checked/i);
});
