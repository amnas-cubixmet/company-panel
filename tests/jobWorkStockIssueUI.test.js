import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const panel = read('src/components/jobs/JobWorkStockPanel.jsx');
const service = read('src/services/job.service.js');
const parent = read('src/pages/jobs/JobCardWorkspace.jsx');
const css = read('src/styles/job-work-stock-panel.css');

test('Job Card Work includes Search Stock, Issue and issued-parts list', () => {
  assert.match(parent, /import \{ JobWorkStockPanel \} from/);
  assert.match(parent, /activeTab === 'work'/);
  assert.match(parent, /<JobWorkStockPanel/);
  assert.match(parent, /issuedParts=\{job\.parts \|\| \[\]\}/);
  assert.match(parent, /import '..\/..\/styles\/job-work-stock-panel\.css'/);
  assert.match(panel, /Find Stock Item/);
  assert.match(panel, /Search part name, SKU, barcode or brand/);
  assert.match(panel, /Issue Quantity/);
  assert.match(panel, /Issue Stock to Job/);
  assert.match(panel, /Issued Parts/);
  assert.match(panel, /No parts issued\./);
});

test('Stock issue uses atomic Job issue-part API and is never triggered on selection', () => {
  assert.match(service, /export const issueJobStockPart/);
  assert.match(service, /\x60\$\{API_ENDPOINTS\.JOBS\}\/\$\{jobId\}\/issue-part\x60/);
  assert.match(service, /apiClient\.post/);
  assert.match(panel, /appConfirm\(/);
  assert.match(panel, /await jobService\.issueJobStockPart\(jobId, selected\.id, requested\)/);
  assert.doesNotMatch(panel, /stockService\.issueStock\(/);
  assert.match(panel, /hasPermission\(user, 'stock\.edit'\)/);
  assert.match(panel, /hasPermission\(user, 'jobs\.edit'\)/);
  assert.match(panel, /requested <= stockQty/);
  assert.match(panel, /Promise\.allSettled/);
  assert.match(panel, /A refresh failure must not make it appear/);
});

test('Stock Work UI has responsive form, grid, search results and accessible controls', () => {
  assert.match(css, /\.job-work-stock-panel/);
  assert.match(css, /\.job-work-stock-results/);
  assert.match(css, /\.job-work-stock-bottom/);
  assert.match(css, /\.job-work-stock-history-list/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /font-size:16px!important/);
  assert.match(panel, /aria-label="Matching stock items"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /role="status"/);
});
