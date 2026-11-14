import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/services/ServiceList.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/service-editor-refined.css', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/service.service.js', import.meta.url), 'utf8');

test('add and edit service use the same clear, accessible grouped fields', () => {
  for (const title of ['Basic Details', 'Pricing & Duration', 'GST & Classification', 'Description & Technician Checklist']) {
    assert.ok(page.includes(title), title);
  }
  assert.match(page, /<Field label="Service Name" wide required>/);
  assert.match(page, /<Field label="Service Code" required/);
  assert.match(page, /<Field label="Category" required>/);
  assert.match(page, /<input type="text" required maxLength=\{50\}/);
  assert.match(page, /<select required value=\{values\.categoryId\}/);
  assert.match(page, /className="service-add-category-inline"/);
  assert.match(page, /onClick=\{onAddCategory\}/);
  assert.match(page, /className="service-form-actions cg-service-editor-actions"/);
  assert.match(page, /disabled=\{submitting \|\| !ready\}/);
});

test('service editor retains API validation, save semantics and all GST treatment options', () => {
  assert.match(page, /onSubmit=\{saveService\}/);
  assert.match(page, /onCancel=\{closeServiceModal\}/);
  assert.match(page, /Number\.isFinite\(payload\.price\)/);
  assert.match(page, /serviceService\.createService\(payload\)/);
  assert.match(page, /serviceService\.updateService\(id, payload\)/);
  for (const value of ['taxable', 'exempt', 'nil_rated', 'non_gst', 'out_of_scope']) {
    assert.ok(page.includes('value="' + value + '"'), value);
  }
  assert.match(page, /<GstRateDropdown/);
  assert.match(page, /taxRate: rate/);
  assert.match(service, /price: data\.price \?\? 0/);
  assert.match(service, /taxTreatment: data\.taxTreatment/);
});

test('service editor preview never rounds a fraction of a rupee to a whole rupee', () => {
  assert.match(page, /minimumFractionDigits: 2, maximumFractionDigits: 2/);
  assert.match(page, /serviceRateMoney\.format\(Number\(price\)\)/);
  assert.match(page, /className="cg-service-editor-summary"/);
});

test('responsive service sheet uses existing theme tokens and touch-friendly field controls', () => {
  assert.match(page, /service-editor-refined\.css/);
  assert.match(css, /\.responsive-modal-body \.cg-service-editor/);
  assert.match(css, /min-height:50px!important/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /cg-service-editor-actions/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /env\(safe-area-inset-bottom,0px\)/);
});
