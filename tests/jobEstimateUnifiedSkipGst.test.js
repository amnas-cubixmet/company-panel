import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateEstimateIndiaGst } from '../src/utils/indiaGst.js';
import { estimateGstOptions, ESTIMATE_ZERO_TAX_TREATMENTS } from '../src/components/jobs/estimateGstRates.js';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('estimate-specific None is a zero-rate classification, not an invoice preset', () => {
  const choices = estimateGstOptions('0', 'cgst_sgst');
  assert.equal(choices[0].value, 'none');
  assert.equal(choices[0].totalRate, '0');
  assert.ok(choices.some(item => item.value === 'cgst:9'));
  assert.deepEqual(ESTIMATE_ZERO_TAX_TREATMENTS.map(row => row.value),
    ['nil_rated', 'exempt', 'non_gst', 'out_of_scope']);
  const invoice = read('src/utils/invoiceTaxUi.js');
  assert.match(invoice, /INVOICE_IGST_RATES/);
});

test('classified No GST is zero while mixed CGST and IGST are calculated per item', () => {
  const lines = [
    { type:'Service', quantity:'2', unitPrice:'250', taxRate:'0', taxChoice:'none' },
    { type:'Labour', quantity:'1', unitPrice:'1000', taxRate:'18', taxChoice:'cgst:9' },
  ];
  const local = calculateEstimateIndiaGst({
    lines, discount:'150', registered:true, supplierState:'32', placeOfSupply:'32',
  });
  assert.equal(local.subtotal, 1500);
  assert.equal(local.taxable, 1350);
  assert.equal(local.cgst, 81);
  assert.equal(local.sgst, 81);
  assert.equal(local.igst, 0);
  assert.equal(local.total, 1512);
  assert.equal(local.taxRows[0].cgst, 0);
  const interstate = calculateEstimateIndiaGst({
    lines, discount:'150', registered:true, supplierState:'32', placeOfSupply:'33',
  });
  assert.equal(interstate.igst, 162);
  assert.equal(interstate.taxRows[0].igst, 0);
  assert.equal(interstate.total, 1512);
});

test('single header actions create newest-first draft and autofocus catalog search', () => {
  const panel = read('src/components/jobs/QuickEstimatePanel.jsx');
  const picker = read('src/components/jobs/EstimateCatalogPicker.jsx');
  const addActions = panel.slice(panel.indexOf('<section className="job-quick-item-group"'), panel.indexOf('{canEdit && findings.length > 0'));
  assert.equal((addActions.match(/Add Work/g) || []).length >= 1, true);
  assert.equal((addActions.match(/className="job-quick-add-button"/g) || []).length, 2);
  assert.doesNotMatch(addActions, /is-catalog-add|Add New Work|Add New Part/);
  assert.match(panel, /\[row, \.\.\.current\]/);
  assert.match(panel, /setFocusNewLine\(catalogItem \? null : row.key\)/);
  assert.match(picker, /inputRef\.current\?\.focus\(\)/);
  assert.match(picker, /stockService\.getStockItems/);
  assert.match(picker, /serviceService\.getServices/);
  assert.match(picker, /onAddNew\(value\.trim\(\)\)/);
});

test('skip is distinct from approval with a required server confirmation', () => {
  const panel = read('src/components/jobs/QuickEstimatePanel.jsx');
  const workspace = read('src/pages/jobs/JobCardWorkspace.jsx');
  const service = read('src/services/job.service.js');
  assert.match(panel, /Skip Estimate/);
  assert.match(panel, /await onSkip\(\{ reason: skipReason, details: skipDetails\.trim\(\) \}\)/);
  assert.match(panel, /taxTreatmentConfirmed/);
  assert.match(panel, /No GST requires a specific tax treatment/);
  assert.match(service, /estimate\/skip/);
  assert.match(workspace, /onSkip=\{skipEstimate\}/);
  assert.match(workspace, /await jobService\.skipJobEstimate/);
  assert.match(workspace, /navigate\('\/jobs\/' \+ job\.id/);
});
