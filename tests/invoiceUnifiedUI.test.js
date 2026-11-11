import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const page = read('src/pages/invoices/InvoiceRoutePage.jsx');
const eway = read('src/pages/invoices/EWayBillPage.jsx');
const table = read('src/components/invoices/InvoiceRecordsPanel.jsx');
const tabs = read('src/components/invoices/InvoiceTabs.jsx');
const stats = read('src/components/invoices/InvoiceOverviewStats.jsx');
const css = read('src/styles/invoice-unified-ui.css');

test('all invoice, estimate and E-Way Bill routes share mobile UI while print stays separate', () => {
  assert.match(page, /import '\.\.\/\.\.\/styles\/invoice-unified-ui\.css'/);
  assert.match(eway, /import '\.\.\/\.\.\/styles\/invoice-unified-ui\.css'/);
  assert.match(page, /billing-page billing-ui-unified billing-list-dashboard/);
  assert.match(eway, /billing-page billing-ui-unified billing-list-dashboard/);
  assert.doesNotMatch(page, /<InvoiceHelpGuide/);
  assert.doesNotMatch(eway, /<InvoiceHelpGuide/);
  assert.match(css, /@media screen \{/);
  assert.doesNotMatch(css, /@media print/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /invoice-dashboard-mobile-card/);
});

test('customer billing actions still use real billing APIs and do not alter GST calculations', () => {
  assert.match(page, /billingService\.list\(\)/);
  assert.match(page, /billingService\.get\(id\)/);
  assert.match(page, /billingService\.previewTotals\(form\)/);
  assert.match(page, /billingService\.convertEstimateToInvoice\(id\)/);
  assert.match(page, /normalizeBackendInvoiceTotals/);
  assert.match(page, /workshopInvoiceType\(context\)/);
  assert.match(page, /invoiceOutstandingAmount\(form, totals\)/);
  assert.match(page, /<InvoicePrint doc=\{form\}/);
});

test('failed invoice API never displays stale documents as no invoices', () => {
  assert.match(page, /setDocuments\(\[\]\);\s*setError\(e\?\.message/);
  assert.match(page, /loadError=\{error\}/);
  assert.match(page, /onRetry=\{\(\) => void loadList\(\)\}/);
  assert.match(table, /role="alert"/);
  assert.match(table, /\) : loadError \? \(/);
  assert.match(table, /Could not load your billing records/);
  assert.match(table, /Try Again/);
});

test('invoice mobile edit is draft-only, same as desktop', () => {
  const occurrences = table.match(/canEdit && document\.status === 'Draft'/g) || [];
  assert.equal(occurrences.length, 2);
  assert.doesNotMatch(table, /canEdit && document\.status !== 'Converted'/);
  assert.match(table, /Still Due/);
  assert.match(stats, /not cash received/);
});

test('transport drafts do not imply official E-Way Bill generation', () => {
  assert.match(eway, /not official GST portal E-Way Bills/);
  assert.match(eway, /row\.status === 'Draft' && <button/);
  assert.match(eway, /disabled=\{saving \|\| form\.status !== 'Draft'\}/);
  assert.match(eway, /error \? null : filteredRows\.length === 0/);
  assert.match(eway, /onClick=\{\(\) => void loadList\(\)\}/);
});

test('invoice/estimate/E-Way Bill navigation stays screen-reader accessible', () => {
  assert.match(tabs, /aria-pressed=\{activeTab === 'invoice'\}/);
  assert.match(tabs, /aria-pressed=\{activeTab === 'estimate'\}/);
  assert.match(tabs, /aria-pressed=\{activeTab === 'eway'\}/);
  assert.match(css, /focus-visible/);
  assert.match(css, /min-height:46px/);
  assert.match(page, /Back to List/);
});
