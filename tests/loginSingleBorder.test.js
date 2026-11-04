import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('mobile/email and password each have one shell border, plus optional workshop code', () => {
  const login = read('src/pages/auth/Login.jsx');
  assert.equal((login.match(/className=\{'login-input-shell '/g) || []).length, 3);
  assert.equal((login.match(/className="login-input"/g) || []).length, 2);
  assert.match(login, /aria-invalid=\{Boolean\(fieldErrors\.identifier\)\}/);
  assert.match(login, /aria-invalid=\{Boolean\(fieldErrors\.password\)\}/);
  assert.match(login, /id="login-identifier-error"/);
  assert.match(login, /id="login-password-error"/);
});

test('last shared error stylesheet overrides aria-invalid inner borders at higher specificity', () => {
  const app = read('src/App.jsx');
  const css = read('src/styles/form-errors-unified.css');
  const loginCss = read('src/styles/login-system.css');
  assert.match(app, /import ['"]\.\/styles\/form-errors-unified\.css['"]/);
  assert.match(loginCss, /\.login-input-shell\.is-error\s*\{/);
  assert.match(css, /:is\(body, #root\) \.login-page \.login-input-shell > input\.login-input/);
  assert.match(css, /input\.login-input\[aria-invalid="true"\]/);
  assert.match(css, /input\.login-input:focus-visible/);
  assert.match(css, /border:\s*0 !important/);
  assert.match(css, /border-radius:\s*0 !important/);
  assert.match(css, /outline:\s*0 !important/);
  assert.match(css, /box-shadow:\s*none !important/);
  assert.match(css, /\.login-input-shell\.is-error \{\s*\/\* One red border/);
  assert.match(css, /box-shadow: none !important/);
});
