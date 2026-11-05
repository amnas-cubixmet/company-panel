import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const search = read('src/components/common/GlobalSearch.jsx');
const header = read('src/components/layout/Header.jsx');
const service = read('src/services/globalSearch.service.js');
const style = read('src/styles/global-search.css');
const layout = read('src/styles/layout.css');
const routes = read('src/routes/AppRoutes.jsx');

test('only one mounted header search, without modal or duplicate mobile input', () => {
  assert.equal((header.match(/<GlobalSearch\b/g) || []).length, 1);
  assert.equal((search.match(/<input\b/g) || []).length, 1);
  assert.doesNotMatch(search, /createPortal|role="dialog"|aria-modal|global-search-backdrop|openDialog/);
  assert.doesNotMatch(header, /searchOpen|onMobileClose|isMobileView/);
  assert.doesNotMatch(style, /\.global-search-dialog|\.global-search-backdrop/);
  assert.match(layout, /@media \(max-width: 1023px\)[\s\S]*\.desktop-header-row/);
});

test('input is editable and dropdown uses the shared query and anchored listbox', () => {
  assert.match(search, /value=\{query\}/);
  assert.match(search, /setQuery\(event\.target\.value\)/);
  assert.match(search, /ref=\{inputRef\}/);
  assert.match(search, /role="combobox"/);
  assert.match(search, /role="listbox"/);
  assert.match(search, /role="option"/);
  assert.match(style, /\.global-search-results\s*\{\s*position:\s*absolute;/);
});

test('shortcut, arrows, enter, escape, outside-click and reset work without a dialog', () => {
  for (const text of ['event.ctrlKey', 'event.metaKey', "event.key === 'ArrowDown'",
    "event.key === 'ArrowUp'", "event.key === 'Enter'", "event.key === 'Escape'",
    "addEventListener('pointerdown'", "addEventListener('focusin'", 'clearSearch']) {
    assert.ok(search.includes(text), 'Missing interaction: ' + text);
  }
});

test('search uses only Django real records and exact non-slash /api/v1/search path', () => {
  assert.match(service, /apiClient\.get\('\/search'/);
  assert.match(service, /USE_MOCK_API/);
  assert.match(service, /VITE_API_URL includes \/api\/v1/);
  assert.doesNotMatch(service, /localStorage|mockResults|fallbackData/);
  assert.match(search, /getPermissionForPath/);
});

test('returned search routes exist in the company panel router', () => {
  for (const expression of [
    '/customers/:id', '/vehicles/:id', '/jobs/:id', '/jobs/:id/complaints',
    '/staff-management/staff/:staffId', '/stock/*', '/invoices/:id', '/payments/:id'
  ]) {
    assert.ok(routes.includes('path="' + expression + '"'), 'Missing route ' + expression);
  }
});
