import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const panel = read('src/components/jobs/JobWorkStockPanel.jsx');
const css = read('src/styles/job-work-stock-panel.css');
const catalogue = read('src/services/stockCatalog.service.js');

test('Stock & Parts Used includes a real Add New Part action and accessible form', () => {
  assert.match(panel, /Add New Part/);
  assert.match(panel, /aria-expanded=\{showCreate\} aria-controls="job-work-new-part-form"/);
  assert.match(panel, /id="job-work-new-part-form"/);
  assert.match(panel, /onSubmit=\{createPart\}/);
  for (const field of ['Part Name', 'Part Number', 'Brand', 'Unit', 'Category', 'HSN / SAC',
    'Purchase Price', 'Selling Price', 'GST Rate', 'Minimum Stock', 'Rack / Location']) {
    assert.ok(panel.includes(field), field + ' should be in Add New Part');
  }
  assert.match(css, /job-work-new-part-fields/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /font-size:16px!important/);
});

test('Creates catalogue item at zero stock; does not invent supplier receipt or job issue', () => {
  const start = panel.indexOf('const createPart =');
  const end = panel.indexOf('if (!canView) return null;', start);
  const create = panel.slice(start, end);
  assert.match(create, /stockCatalogService\.createItem\(/);
  assert.match(create, /stockQuantity: 0/);
  assert.match(create, /setInventory\(previous =>/);
  assert.match(create, /setSelectedId\(String\(created\.id\)\)/);
  assert.doesNotMatch(create, /issueJobStockPart/);
  assert.doesNotMatch(create, /stockService\.receiveStock/);
  assert.match(panel, /Receive Stock/);
  assert.match(catalogue, /createItem: async \(payload\)/);
});

test('New inventory creation has permissions, GST classification and busy safeguards', () => {
  assert.match(panel, /canIssue && \(/);
  assert.match(panel, /canEdit && hasPermission\(user, 'stock\.edit'\) && hasPermission\(user, 'jobs\.edit'\)/);
  assert.match(panel, /if \(!canIssue \|\| creating \|\| busy\) return/);
  assert.match(panel, /Number\(newPart\.tax\) === 0/);
  assert.match(panel, /zeroTaxClassification/);
  assert.match(panel, /setCreateError\(/);
  assert.match(panel, /disabled=\{creating \|\| busy\}/);
});

test('New Part and existing stock issue remain separate audited workflows', () => {
  assert.match(panel, /<form className="job-work-stock-form" onSubmit=\{issue\}>/);
  assert.match(panel, /await jobService\.issueJobStockPart\(jobId, selected\.id, requested\)/);
  assert.match(panel, /appConfirm\(/);
  assert.match(panel, /only after confirming Issue Stock/);
});
