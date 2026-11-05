import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/form-typography.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('../src/styles/desktop-typography.css', import.meta.url), 'utf8');
const input = readFileSync(new URL('../src/components/ui/Input.jsx', import.meta.url), 'utf8');
const select = readFileSync(new URL('../src/components/ui/Select.jsx', import.meta.url), 'utf8');

test('global typography CSS is imported after legacy page styles', () => {
  const importedStyles = [...app.matchAll(/import ['"]\.\/styles\/([^'"]+\.css)['"];/g)]
    .map((match) => match[1]);
  assert.deepEqual(importedStyles.slice(-5), [
    'form-typography.css', 'form-controls-unified.css', 'form-errors-unified.css',
    'desktop-typography.css', 'floating-fields.css'
  ]);
});

test('editable inputs, native selects and textareas use regular weight', () => {
  assert.match(css, /:is\(body, #root\)/);
  assert.match(css, /input:not\(\[type="checkbox"\]\)/);
  assert.match(css, /textarea,/);
  assert.match(css, /select,/);
  assert.match(css, /option,/);
  assert.match(css, /font-weight:\s*400\s*!important/);
});

test('form text reset excludes action buttons and checkbox or radio controls', () => {
  for (const type of ['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image']) {
    assert.ok(css.includes(`:not([type="${type}"])`), `input type ${type} must be excluded`);
  }
  assert.ok(!/\n\s*button[,\s{]/.test(css), 'Do not restyle all buttons');
});

test('input and textarea placeholders and custom dropdowns are regular', () => {
  assert.match(css, /input[^\n]*::placeholder/);
  assert.match(css, /textarea::placeholder/);
  assert.match(css, /\[role="combobox"\]/);
  assert.match(css, /\[role="option"\]/);
  assert.match(css, /\.searchable-select-wrapper \.form-control > span:first-child/);
});

test('shared Input/Select components do not introduce font-medium', () => {
  assert.match(input, /cg-floating-control[^\n]*font-normal text-content/);
  assert.match(select, /cg-floating-control[^\n]*font-normal text-content/);
});

test('screen typography uses a readable hierarchy without forced 16px metadata', () => {
  assert.match(desktop, /@media screen/);
  assert.match(desktop, /--cg-text-body: 14px/);
  assert.match(desktop, /--cg-text-small: 12px/);
  assert.match(desktop, /--cg-text-title: 24px/);
  assert.match(desktop, /font-weight: 400 !important/);
  assert.match(desktop, /font-size: 16px !important/);
  assert.ok(desktop.includes('.invoice-print-sheet *'));
  assert.doesNotMatch(desktop, /\bzoom\s*:/);
  assert.doesNotMatch(desktop, /\btransform\s*:\s*scale\(/);
});

test('desktop typography includes owner, staff, and small data text', () => {
  for (const selector of [
    '.saas-owner-sidebar-group > a',
    '.sidebar-nav a',
    'table th',
    'table td',
    '.ui-label',
    '.login-field-label',
    '.cg-credit-note',
    '.ui-page-header h1',
  ]) {
    assert.ok(desktop.includes(selector), selector);
  }
});
