import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Add New Part form offers a total GST rate dropdown and custom rate', () => {
  const page = read('src/pages/stock/StockEasyPage.jsx');
  assert.match(page, /label="GST Rate"/);
  assert.match(page, /GST_RATE_PRESETS = \['0', '3', '5', '12', '18', '28', '40'\]/);
  assert.match(page, /<OutlinedSelect label="GST Rate"/);
  assert.match(page, /Other rate \(custom %\)/);
  assert.match(page, /Custom GST Rate \(%\)/);
  assert.match(page, /max="100" step="0\.01" required/);
});

test('GST and optional alphanumeric HSN/SAC are persisted with new stock item', () => {
  const page = read('src/pages/stock/StockEasyPage.jsx');
  const service = read('src/services/stockCatalog.service.js');
  assert.match(page, /tax: '0', hsnCode: ''/);
  assert.match(page, /HSN \/ SAC Code \(optional\)/);
  assert.match(page, /maxLength=\{20\}/);
  assert.match(page, /if \(!validGstRate\(part\.tax\)\)/);
  assert.match(page, /tax: Number\(part\.tax\), hsnCode: part\.hsnCode\.trim\(\)/);
  assert.match(service, /tax: number\(payload\.tax\)/);
  assert.match(service, /hsnCode: payload\.hsnCode \|\| ''/);
  assert.match(service, /apiClient\.post\('\/stock', await productPayload\(payload, \{ creating: true \}\)\)/);
});

test('GST is item metadata, not a change to Receive Stock or Issue Stock behavior', () => {
  const page = read('src/pages/stock/StockEasyPage.jsx');
  const service = read('src/services/stockCatalog.service.js');
  assert.match(page, /stockCatalogService\.stockIn\(payload\)/);
  assert.match(page, /stockCatalogService\.stockOut\(payload\)/);
  assert.match(page, /stockQuantity: openingQuantity/);
  assert.match(page, /beginMove\('in', created\.id, created\)/);
  assert.match(service, /hsnCode: item\.hsnCode \|\| item\.hsn_code \|\| ''/);
});
