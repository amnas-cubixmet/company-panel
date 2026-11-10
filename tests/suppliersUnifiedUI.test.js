import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/suppliers/SuppliersPage.jsx');
const routes = read('src/routes/AppRoutes.jsx');
const guide = read('src/components/suppliers/SupplierWorkspaceGuide.jsx');
const styles = read('src/styles/suppliers-unified-ui.css');
const purchase = read('src/components/suppliers/SupplierPurchaseFlow.jsx');
const returns = read('src/components/suppliers/SupplierReturnsPanel.jsx');

test('supplier directory and existing purchase history have distinct accessible routes', () => {
  assert.match(routes, /<Route path="\/suppliers" element=\{<SuppliersPage \/>\} \/>/);
  assert.match(routes, /<Route path="\/suppliers\/purchases" element=\{<SuppliersPage section="purchases" \/>\} \/>/);
  assert.match(routes, /<Route path="\/suppliers\/:id" element=\{<SuppliersPage \/>\} \/>/);
  assert.match(page, /aria-label="Supplier sections"/);
  assert.match(page, /to="\/suppliers\/purchases"/);
  assert.match(page, /<SupplierWorkspaceGuide purchaseView=\{purchaseView\}\/>/);
});

test('finance totals are permission-scoped, derive only from posted bills and fail as unavailable', () => {
  assert.match(page, /access\.can\('payments\.view'\) && access\.can\('stock\.view'\)/);
  assert.match(page, /if \(bill\.postingStatus !== 'Posted'\) continue/);
  assert.match(page, /setCreditBalances\(null\)/);
  assert.match(page, /canViewFinance=\{canViewFinance\}/);
  assert.match(guide, /if \(canViewFinance\)/);
  assert.match(guide, /: 'Unavailable'/);
  assert.match(guide, /posted supplier bills only/i);
  assert.doesNotMatch(guide, /purchaseHistory\.reduce/);
});

test('supplier change, partial settlement, returns and refund still call live services', () => {
  assert.match(page, /supplierService\.create\(payload\)/);
  assert.match(page, /supplierService\.update\(supplier\.id, payload\)/);
  assert.match(page, /supplierService\.remove\(supplier\.id\)/);
  assert.match(page, /supplierFinanceService\.getSupplierSummary\(id\)/);
  assert.match(page, /supplierFinanceService\.getBills\(id\)/);
  assert.match(page, /supplierFinanceService\.getPayments\(id\)/);
  assert.match(page, /<SupplierPurchaseFlow/);
  assert.match(page, /<SupplierReturnsPanel/);
  assert.match(purchase, /How are you paying the supplier\?/);
  assert.match(returns, /Post Return & Debit Note/);
});

test('forms preserve user data when errors occur and warn before discarding changes', () => {
  assert.match(page, /setFormErrors\(normalized\)/);
  assert.match(page, /setDirty\(true\)/);
  assert.match(page, /Discard changes to this supplier\?/);
  assert.match(page, /const tryClose = async \(\) =>/);
  assert.match(page, /<ResponsiveModalSheet isOpen onClose=\{tryClose\}/);
  assert.match(page, /role="alert"/);
  assert.match(page, /setReloadList\(x => x \+ 1\)/);
  assert.match(page, /setReloadPurchaseHistory\(n => n \+ 1\)/);
});

test('supplier detail navigation leads to real sections, and prevents stale balances', () => {
  assert.match(page, /href="#supplier-profile"/);
  assert.match(page, /href="#supplier-purchase-form"/);
  assert.match(page, /href="#supplier-pay-now"/);
  assert.match(page, /href="#supplier-returns"/);
  assert.match(page, /href="#supplier-ledger"/);
  assert.match(page, /id="supplier-profile"/);
  assert.match(page, /id="supplier-returns"/);
  assert.match(page, /id="supplier-ledger"/);
  assert.match(page, /setSupplierFinancials\(null\)/);
  assert.match(page, /setSupplierPayments\(\[\]\)/);
  assert.match(page, /setSupplierBills\(\[\]\)/);
});

test('responsive supplier UI has readable cards and keyboard-accessible actions', () => {
  assert.match(styles, /cg-supplier-overview/);
  assert.match(styles, /cg-supplier-mobile-entry/);
  assert.match(styles, /cg-supplier-purchase-filters/);
  assert.match(styles, /responsive-modal-body \.cg-supplier-form/);
  assert.match(styles, /font-size:16px/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\(max-width:767px\)/);
  assert.match(guide, /സപ്ലയർ/);
});
