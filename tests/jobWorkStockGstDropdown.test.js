import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  invoiceLineTaxChoices, invoiceTotalRateFromChoice,
} from '../src/utils/invoiceTaxUi.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const panel = read('src/components/jobs/JobWorkStockPanel.jsx');
const css = read('src/styles/job-work-stock-panel.css');

test('Job Work Add New Part uses the same GST dropdown as the stock form', () => {
  assert.match(panel, /invoiceLineTaxChoices\('unknown'\)/);
  assert.match(panel, /invoiceTotalRateFromChoice\(choice\)/);
  assert.match(panel, /<label>GST Rate \(%\) \*\s*<select required/);
  assert.match(panel, /aria-label="GST Rate \(%\)"/);
  assert.match(panel, /newPartGstChoice/);
  assert.match(panel, /0% — Select Tax Classification/);
  assert.match(panel, /gstChoices\.map\(choice =>/);
  assert.match(panel, /Saved\/Other HSN-Specific Rate \(custom %\)/);
  assert.doesNotMatch(panel, /<label>GST Rate \(%\) \*<input/);
  assert.deepEqual(invoiceLineTaxChoices('unknown').map(x => x.label), [
    'CGST 2.5%', 'CGST 5%', 'CGST 9%', 'CGST 18%',
    'SGST 2.5%', 'SGST 5%', 'SGST 9%', 'SGST 18%',
    'IGST 5%', 'IGST 18%',
  ]);
});

test('selection stores the matching TOTAL GST rate; no double charging a component', () => {
  assert.equal(invoiceTotalRateFromChoice('cgst:9'), '18');
  assert.equal(invoiceTotalRateFromChoice('sgst:9'), '18');
  assert.equal(invoiceTotalRateFromChoice('igst:18'), '18');
  assert.equal(invoiceTotalRateFromChoice('igst:5'), '5');
  assert.match(panel, /choice === 'none' \? '0' : choice === 'custom' \? ''/);
  assert.match(panel, /tax: total, zeroTaxClassification: ''/);
  assert.match(panel, /Total GST saved for this item/);
  assert.match(panel, /tax,\s*minimumStock: Number\(newPart\.minimumStock\)/);
});

test('saved/custom GST and zero-rate categories still require explicit validation', () => {
  assert.match(panel, /newPartGstChoice === 'custom'/);
  assert.match(panel, /Custom GST Rate \(%\) \*/);
  assert.match(panel, /type="number" inputMode="decimal" min="0" max="100" step="0\.01" required/);
  assert.match(panel, /0% GST Classification \*/);
  assert.match(panel, /newPartGstChoice \|\| !newPart\.tax\.trim\(\)/);
  assert.match(panel, /\(tax === 0 && !newPart\.zeroTaxClassification\)/);
  assert.match(panel, /setNewPartGstChoice\(''\)/);
  assert.match(panel, /stockQuantity: 0/);
  assert.match(panel, /stockCatalogService\.createItem\(/);
  assert.doesNotMatch(panel, /supplierFinanceService\.createBill/);
});

test('GST dropdown is readable on narrow screens and keyboard accessible', () => {
  assert.match(css, /\.job-work-new-part-gst-note/);
  assert.match(css, /grid-column:1\/-1/);
  assert.match(css, /select:focus-visible/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /font-size:16px!important/);
});
