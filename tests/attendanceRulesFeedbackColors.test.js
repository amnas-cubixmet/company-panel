import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('attendance rules error state is red and success state remains green', () => {
  const page = read('src/pages/attendance-manager/RulesSettings.jsx');
  const css = read('src/styles/attendance-manager-pages.css');
  assert.match(page, /const \[messageType, setMessageType\] = useState\(''\)/);
  assert.match(page, /setMessageType\('error'\)/);
  assert.match(page, /setMessageType\('success'\)/);
  assert.match(page, /attendance-rules-message is-\$\{messageType/);
  assert.match(page, /role=\{messageType === 'success' \? 'status' : 'alert'\}/);
  assert.match(css, /\.attendance-rules-message\.is-error\{border-color:var\(--danger\);background:var\(--danger-soft\);color:var\(--danger\)/);
  assert.match(css, /\.attendance-rules-message\{[^\n]*var\(--success\)/);
});

test('GPS and place-search errors use red alerts while successful selection remains green', () => {
  const page = read('src/pages/attendance-manager/RulesSettings.jsx');
  const place = read('src/components/attendance-manager/WorkshopPlaceSearch.jsx');
  const css = read('src/styles/attendance-manager-pages.css');
  assert.match(page, /setLocationStatusType\('error'\)/);
  assert.match(page, /setLocationStatusType\('success'\)/);
  assert.match(page, /attendance-location-feedback is-\$\{locationStatusType/);
  assert.match(page, /role=\{locationStatusType === 'success' \? 'status' : 'alert'\}/);
  assert.match(place, /attendance-location-feedback is-error" role="alert"/);
  assert.match(css, /\.attendance-rules-page \.attendance-location-feedback\.is-error/);
  assert.match(css, /\.attendance-rules-page \.attendance-location-feedback\.is-success/);
});
