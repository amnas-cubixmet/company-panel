import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const styles = read('../src/styles/form-errors-unified.css');
const app = read('../src/App.jsx');
const validation = read('../src/utils/formValidation.js');
const global = read('../src/components/common/GlobalFormValidation.jsx');
const jobCreate = read('../src/pages/jobs/JobCreatePage.jsx');

test('red inline errors remain in the validation layer before desktop text-only styling', () => {
  const imports = [...app.matchAll(/import ['"]\.\/styles\/([^'"]+\.css)['"];/g)]
    .map((match) => match[1]);
  assert.deepEqual(imports.slice(-5), [
    'form-typography.css', 'form-controls-unified.css', 'form-errors-unified.css', 'desktop-typography.css', 'floating-fields.css'
  ]);
});

test('input, select, textarea, icon-shell errors are red with no second inner border', () => {
  for (const name of ['input', 'select', 'textarea', '[data-cg-input-shell]', '.ui-input-shell', '.login-input-shell', '.outside-labour-search']) {
    assert.ok(styles.includes(name), name);
  }
  assert.match(styles, /\[aria-invalid="true"\]/);
  assert.match(styles, /\[data-cg-error-active="true"\]/);
  assert.match(styles, /:has\(/);
  assert.match(styles, /border:\s*0\s*!important/);
  assert.match(styles, /--cg-inline-error-border:\s*#dc2626/);
});

test('field-level validation helper focuses a matching input and announces its error', () => {
  assert.match(validation, /getFieldContainer\(field\)/);
  assert.match(validation, /messageElement\.setAttribute\('role', 'alert'\)/);
  assert.match(validation, /field\.setAttribute\('aria-invalid', 'true'\)/);
  assert.match(validation, /'aria-describedby'/);
  assert.match(validation, /focusField\(first\)/);
  assert.match(global, /document\.addEventListener\('invalid', onInvalid, true\)/);
  assert.match(global, /document\.addEventListener\('input', onEdit, true\)/);
  assert.match(global, /clearFieldValidation\(field\)/);
});

test('shared input components render error under its own control and regular text', () => {
  for (const name of ['Input', 'Select', 'Textarea', 'PhoneInput']) {
    const source = read(`../src/components/ui/${name}.jsx`);
    assert.match(source, /aria-invalid=\{Boolean\(error\)\}/, name);
    assert.match(source, /aria-describedby=\{message \?/, name);
    assert.ok(source.includes("id={inputId + '-message'}"), name);
  }
  assert.match(read('../src/components/ui/Select.jsx'), /data-cg-input-shell/);
  assert.match(read('../src/components/ui/Textarea.jsx'), /font-normal leading-5/);
});

test('Job create shows server and required-field errors inline without duplicate banner', () => {
  assert.match(jobCreate, /const shownInline = showFormFieldError\(/);
  assert.match(jobCreate, /const shownInline = showServerFormErrors\(/);
  assert.match(jobCreate, /setError\(shownInline \? '' : message\)/);
  assert.match(jobCreate, /const message = createdId/);
  assert.match(jobCreate, /const shownInline = showServerFormErrors\(/);
});
