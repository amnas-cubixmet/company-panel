import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/styles/form-controls-unified.css');
const app = read('../src/App.jsx');
const search = read('../src/components/jobs/OutsideLabourPanel.jsx');

test('final global styles load after legacy modules and typography', () => {
  const imported = [...app.matchAll(/import ['"]\.\/styles\/([^'"]+\.css)['"];/g)]
    .map((match) => match[1]);
  assert.deepEqual(imported.slice(-5), [
    'form-typography.css', 'form-controls-unified.css', 'form-errors-unified.css',
    'desktop-typography.css', 'floating-fields.css'
  ]);
});

test('Outside Labour search retains icon, editable search and accessible clear action', () => {
  assert.match(search, /className="outside-labour-search"/);
  assert.match(search, /placeholder="Search worker, Job Card or work"/);
  assert.match(search, /onChange=\{\(event\) => setSearch\(event\.target\.value\)\}/);
  assert.match(search, /aria-label="Clear outside labour search"/);
  assert.match(css, /\.outside-labour-search:focus-within/);
  assert.match(css, /\.outside-labour-search input\s*\{/);
});

test('search shells use one border and transparent nested inputs on all modules', () => {
  const wrappers = [
    '.outside-labour-search', '.global-search-field', '.crud-search',
    '.customer-lookup-input', '.customer-dashboard-search',
    '.job-customer-search', '.job-quick-catalog-field', '.cg-inspection-search',
    '.stock-search', '.service-search', '.service-dashboard-search',
    '.vehicle-search', '.vehicle-dashboard-search', '.staff-directory-search',
    '.expense-search', '.expense-dashboard-search', '.payments-dashboard-search',
    '.am-search-field', '.payroll-all-staff__search', '.ui-input-shell'
  ];
  for (const selector of wrappers) assert.ok(css.includes(selector), selector);
  assert.match(css, /border:\s*0\s*!important/);
  assert.match(css, /border-radius:\s*0\s*!important/);
  assert.match(css, /background:\s*transparent\s*!important/);
  assert.match(css, /background-color:\s*transparent\s*!important/);
  assert.match(css, /box-shadow:\s*none\s*!important/);
  assert.match(css, /min-height:\s*0\s*!important/);
});

test('standalone inputs and select keep standard regular type while special controls are excluded', () => {
  for (const type of ['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'reset']) {
    assert.ok(css.includes(`:not([type="${type}"])`));
  }
  assert.match(css, /font-weight:\s*400/);
  assert.match(css, /border-radius:\s*var\(--cg-field-radius\)/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /font-size:\s*16px !important/);
});

test('wrapper keeps focus ring without a second input outline', () => {
  assert.match(css, /\.outside-labour-search:focus-within\s*\{/);
  assert.match(css, /box-shadow:\s*var\(--cg-field-focus-ring\)/);
  assert.match(css, /input:not\(\[type="checkbox"\]\):focus-visible\s*\{/);
  assert.match(css, /outline:\s*0\s*!important/);
});
