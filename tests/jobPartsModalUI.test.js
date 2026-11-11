import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/jobs/JobPartsWorkflow.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/job-parts-ui.css', import.meta.url), 'utf8');
const gstDropdown = readFileSync(new URL('../src/components/common/GstRateDropdown.jsx', import.meta.url), 'utf8');

test('Add Required Part, Purchase Order and Inward use the same explicit dialog form grid', () => {
  assert.equal((source.match(/className="job-parts-modal-form"/g) || []).length, 3);
  assert.match(source, /title="Add Required Part"/);
  assert.match(source, /title="Create Purchase Order"/);
  assert.match(source, /title="Inward \/ Goods Receipt"/);
  assert.match(css, /\.job-parts-modal-form\s*\{[\s\S]*?display:grid!important/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});

test('Full-width search, select and notes are not squeezed into half columns', () => {
  assert.match(source, /className="form-label job-parts-modal-full">Find Inventory Part/);
  assert.match(source, /className="form-label job-parts-modal-full">Part/);
  assert.match(source, /className="form-label job-parts-modal-full">Issued To/);
  assert.match(css, /\.job-parts-modal-form > \.job-parts-modal-full\s*\{\s*grid-column:1 \/ -1!important/);
  assert.match(css, /\.job-parts-modal-form > label\s*\{[\s\S]*?flex-direction:column!important/);
});

test('Dialog uses body portal and accessible focus management', () => {
  assert.match(source, /import \{ createPortal \} from 'react-dom'/);
  assert.match(source, /return createPortal\(/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /if \(event\.key === 'Escape'\)/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/);
});

test('Labels, regular field values and clear action buttons have explicit styling', () => {
  assert.match(css, /\.job-parts-modal-form > label > :is\(input,select,textarea\)/);
  assert.match(css, /font-weight:400!important/);
  assert.match(css, /height:44px!important/);
  assert.match(css, /\.job-parts-modal-form > button\.primary-button/);
  assert.match(css, /\.job-parts-modal-form > button\.secondary-button/);
  assert.match(css, /\.job-parts-modal-overlay\s*\{[\s\S]*?position:fixed!important/);
  assert.match(css, /background:rgba\(15,23,42,\.46\)/);
});

test('Narrow mobile devices receive single-column bottom sheet with scrollable content', () => {
  assert.match(css, /@media\(max-width:639px\)/);
  assert.match(css, /align-items:flex-end/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /max-height:92dvh/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /font-size:16px!important/);
});

test('Add Required Part continues using existing backend service and stock selection', () => {
  assert.match(source, /jobPartsService\.addRequiredPart\(jobId, payload\)/);
  assert.match(source, /stock\.find\(\(item\) => String\(item\.id\) === String\(form\.partId\)\)/);
  assert.match(source, /requestedQty: '1'/);
  assert.match(source, /No stock is deducted until Issue/);
});

test('purchase order form guides the receipt workflow and validates numeric fields', () => {
  assert.match(source, /Stock updates after you record the delivery in Inward \/ Goods Receipt/);
  assert.match(source, /name="orderedQty"[^>]*type="number"[^>]*min="0\.01"[^>]*required/);
  assert.match(source, /name="unitCost"[^>]*type="number"[^>]*min="0"[^>]*required/);
  assert.match(source, /<GstRateDropdown name="tax"/);
  assert.match(source, /selectLabel="Purchase Order GST Rate \(%\)"/);
  assert.match(gstDropdown, /min="0" max="100" step="0\.01"/);
  assert.match(source, /Create Purchase Order/);
  assert.match(source, /errorRef\.current\?\.scrollIntoView/);
  assert.match(source, /function OrderPanel\(\{ line, error, onClose, onSave, busy \}\)/);
});
