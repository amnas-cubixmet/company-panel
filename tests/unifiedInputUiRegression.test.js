import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('all ordinary fields have a consistent mobile-safe baseline', () => {
  const css = read('src/styles/form-controls-unified.css');
  assert.match(css, /--cg-field-height:\s*44px/);
  assert.match(css, /--cg-field-radius:\s*10px/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /--cg-field-border:\s*var\(--border\)/);
  assert.match(css, /background-color:\s*var\(--surface-2\)/);
  assert.match(css, /:disabled\s*\{/);
  assert.match(css, /\[type="checkbox"\]/);
  assert.match(css, /\[type="radio"\]/);
  assert.match(css, /\[type="file"\]/);
  assert.match(css, /\[type="range"\]/);
  assert.match(css, /\[type="color"\]/);
});

test('bordered shell owns focus, nested icon/search inputs remain transparent and borderless', () => {
  const css = read('src/styles/desktop-typography.css');
  assert.match(css, /\.attendance-month-select-field select/);
  assert.match(css, /\.attendance-history-search/);
  assert.match(css, /\.global-search-field/);
  assert.match(css, /\.dashboard-search/);
  assert.match(css, /\.ui-input-shell/);
  assert.match(css, /\[data-cg-input-shell="true"\]/);
  assert.match(css, /border:\s*0\s*!important/);
  assert.match(css, /border-radius:\s*0\s*!important/);
  assert.match(css, /outline:\s*0\s*!important/);
  assert.match(css, /box-shadow:\s*none\s*!important/);
  assert.match(css, /background:\s*transparent\s*!important/);
  assert.match(css, /:focus-within\s*\{[\s\S]*?border-color:\s*var\(--primary\)/);
});

test('global field polish loads after page-specific styles and retains validation and custom form overrides', () => {
  const app = read('src/App.jsx');
  const typography = read('src/styles/desktop-typography.css');
  const customer = read('src/styles/customer-workshop-form.css');
  const stock = read('src/styles/stock-form-polish.css');
  const validation = read('src/styles/form-errors-unified.css');
  assert.ok(app.lastIndexOf("import './styles/desktop-typography.css'") > app.lastIndexOf("import './styles/form-controls-unified.css'"));
  assert.ok(app.lastIndexOf("import './styles/form-errors-unified.css'") > app.lastIndexOf("import './styles/form-controls-unified.css'"));
  assert.match(validation, /\[aria-invalid="true"\]/);
  assert.match(customer, /\.customer-directory-form \[data-cg-input-shell="true"\]/);
  assert.match(stock, /\.cg-easy-stock \.cg-easy-form \.cg-easy-picker-search/);
  assert.match(typography, /preserve borderless Stock\/Customer styling/);
});
