import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page = read('src/pages/customers/CustomerList.jsx');
const css = read('src/styles/customer-workshop-form.css');
const smoke = read('scripts/ui-smoke.mjs');

test('Add Workshop Customer modal uses a scoped form layout, not global field changes', () => {
  assert.match(page,/title=\{editingCustomerId \? "Edit Customer Details" : "Add Workshop Customer"\}/);
  assert.match(page,/import '..\/..\/styles\/customer-workshop-form\.css'/);
  assert.match(page,/<form ref=\{customerFormRef\} className="customer-directory-form" onSubmit=\{handleFormSubmit\}/);
  assert.match(page,/onInvalid=\{\(event\) =>/);
  assert.match(page,/customer-directory-form-grid/);
  assert.match(page,/customer-directory-location-grid/);
  assert.match(page,/customer-directory-form-actions/);
  assert.match(page,/onClick=\{\(\) => setIsAddCustomerOpen\(false\)\}/);
  assert.match(page,/checkDuplicateCustomer\(payload\)/);
  assert.doesNotMatch(css,/\.customer-add-form\s/);
});

test('Input and select are borderless with one accessible focus indicator', () => {
  assert.match(css,/\.customer-directory-form \[data-cg-input-shell="true"\]/);
  assert.match(css,/border: 0 !important/);
  assert.match(css,/background: var\(--surface-2\) !important/);
  assert.match(css,/\.customer-directory-form \[data-cg-input-shell="true"\]:focus-within/);
  assert.match(css,/outline: 2px solid var\(--primary\)/);
  assert.match(css,/\.customer-directory-form textarea/);
  assert.match(css,/font-size: 16px !important/);
  assert.match(css,/min-height: 50px !important/);
  assert.match(css,/\.ui-label/);
  assert.match(css,/font-size: 14px !important/);
});

test('Customer form remains accessible on iPhone and keeps all entered fields', () => {
  for (const field of ['Customer Name', 'Phone Number', 'WhatsApp Number', 'Email Address',
    'Customer Type', 'Assigned Branch', 'Company Name', 'GST Number',
    'Address', 'City', 'State', 'PIN Code', 'Customer Notes & Preferences',
    'Create Customer', 'Save Changes']) {
    assert.ok(page.includes(field), field);
  }
  assert.match(css,/@media \(max-width: 520px\)/);
  assert.match(css,/grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css,/env\(safe-area-inset-bottom, 0px\)/);
  assert.match(page,/inputMode="tel"/);
  assert.match(smoke,/Workshop Customer form style mismatch/);
});
