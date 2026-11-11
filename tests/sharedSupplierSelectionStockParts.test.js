import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
const select = read('components/common/SupplierSelectField.jsx');
const stock = read('components/jobs/JobWorkStockPanel.jsx');
const job = read('pages/jobs/JobPartsWorkflow.jsx');
const catalogue = read('services/stockCatalog.service.js');
const supplierService = read('services/supplier.service.js');
const stockPage = read('pages/stock/StockEasyPage.jsx');
const css = read('components/common/SupplierSelectField.css');

test('Stock & Parts Add New Part offers the canonical supplier dropdown and inline add option', () => {
  assert.match(stock, /partName: '', partNumber: '', brand: '', unit: 'Piece', category: '', supplier: ''/);
  assert.match(stock, /<SupplierSelectField label="Supplier \(Stock & Parts\)" valueMode="id"/);
  assert.match(stock, /value=\{newPart\.supplier\}/);
  assert.match(stock, /onChange=\{supplier => setNewPart\(v => \(\{ \.\.\.v, supplier \}\)\)\}/);
  assert.match(stock, /stockCatalogService\.createItem\(\{\s*\.\.\.newPart/);
  assert.match(stock, /stockQuantity: 0/);
  assert.match(stock, /setCreatedSupplierId\(newPart\.supplier \|\| ''\)/);
  assert.ok(stock.includes("'/suppliers/'"));
  assert.match(catalogue, /supplier: await resolveSupplierId\(payload\.supplier\)/);
});

test('supplier directory is shared and only active existing suppliers can be selected', () => {
  assert.match(select, /supplierService\.list\(\)/);
  assert.match(select, /supplierService\.create\(\{/);
  assert.match(select, /activeSupplier = supplier =>/);
  assert.match(select, /supplier\?\.is_active !== false/);
  assert.match(select, /supplier\?\.status !== 'Inactive'/);
  assert.match(select, /\.sort\(\(a, b\) => String\(a\.name/);
  assert.match(select, /canCreateSupplier = hasPermission\(user, 'stock\.create'\) && !USE_MOCK_API/);
  assert.match(select, /Add New Supplier/);
  assert.match(select, /Save & Select Supplier/);
  assert.match(select, /No purchase or payment was posted/);
  assert.match(select, /valueMode === 'name' \? created\.name : String\(created\.id\)/);
  assert.match(supplierService, /const base = '\/stock\/suppliers'/);
});

test('inline creation reuses matching supplier instead of duplicating by GSTIN or name and phone', () => {
  assert.match(select, /String\(row\.gstNo \|\| row\.gstin \|\| ''\)\.toUpperCase\(\) === gstNo/);
  assert.match(select, /String\(row\.name \|\| ''\)\.trim\(\)\.toLowerCase\(\) === name\.toLowerCase\(\)/);
  assert.match(select, /String\(row\.phone \|\| ''\)\.trim\(\) === phone/);
  assert.match(select, /if \(existing\) \{/);
  assert.match(select, /Existing supplier selected\. A duplicate was not created/);
  assert.match(select, /Activate it in Suppliers/);
  assert.match(select, /detail.*message|cause\?\.message/);
  assert.doesNotMatch(select, /createBill\(|recordPayment\(|receiveStock\(|issueStock\(/);
});

test('Outside Purchase and Purchase Order reuse same supplier picker without changing vendor TEXT API contract', () => {
  assert.match(job, /<SupplierSelectField fullWidth required label="Shop \/ Supplier Name"/);
  assert.match(job, /<SupplierSelectField fullWidth required label="Supplier \/ Vendor"/);
  assert.equal((job.match(/valueMode="name" allowManual/g) || []).length, 2);
  assert.match(select, /allowManual && <option value="__manual__">Other \/ Outside Shop/);
  assert.match(select, /valueMode === 'name' \? supplier\.name : String\(supplier\.id\)/);
  assert.match(select, /if \(byId\?\.name\) onChange\(byId\.name\)/);
  assert.match(job, /vendor: form\.vendor\.trim\(\)/);
  assert.match(job, /onSave\(\{ \.\.\.form, vendor: form\.vendor\.trim\(\) \}\)/);
  assert.match(job, /jobPartsService\.buyOutsideJobPart\(jobId, payload\)/);
});

test('existing Stock supplier picker, finance and purchase workflows are unchanged', () => {
  assert.match(stockPage, /<OutlinedSelect label="Supplier"/);
  assert.match(stockPage, /supplierService\.create\(\{/);
  assert.match(stockPage, /setPart\(previous => \(\{ \.\.\.previous, supplier: String\(vendor\.id\) \}\)\)/);
  assert.match(stockPage, /stockQuantity: 0/);
  assert.match(css, /\.cg-supplier-select-field/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /grid-column:1\/-1/);
});
