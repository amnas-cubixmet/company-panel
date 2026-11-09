import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('panel favicon links to the owner-provided PNG', () => {
  const html = read('index.html');
  assert.match(html, /rel="icon" type="image\/png" href="\/favicon\.png"/);
  assert.match(html, /rel="apple-touch-icon" href="\/favicon\.png"/);
  assert.doesNotMatch(html, /href="\/favicon\.svg"/);
});

test('desktop, mobile, account and login shell use image instead of CG logo text', () => {
  const image = read('src/components/branding/CubixgearLogo.jsx');
  assert.match(image, /src="\/favicon\.png"/);
  for (const [file, old] of [
    ['src/components/layout/Sidebar.jsx', /className="sidebar-logo">CG/],
    ['src/components/layout/MobileSlideSidebar.jsx', /className="mobile-drawer-logo">CG/],
    ['src/components/layout/Header.jsx', /<span>CG<\/span>/],
    ['src/pages/auth/Login.jsx', /className="login-brand-mark">CG/],
    ['src/components/layout/SaaSAccountLayout.jsx', /<Wallet size=\{21\}/],
  ]) {
    const source = read(file);
    assert.match(source, /<CubixgearLogo \/>/, file);
    assert.doesNotMatch(source, old, file);
  }
  assert.match(read('src/App.jsx'), /cubixgear-branding\.css/);
});
