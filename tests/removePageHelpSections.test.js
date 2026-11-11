import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('Invoice, Estimate and E-Way Bill routes do not render page-level help sections', () => {
  const invoice = read('pages/invoices/InvoiceRoutePage.jsx');
  const eway = read('pages/invoices/EWayBillPage.jsx');
  assert.doesNotMatch(invoice, /InvoiceHelpGuide|invoice-reading-guide/);
  assert.doesNotMatch(eway, /InvoiceHelpGuide|invoice-reading-guide/);
  assert.match(invoice, /<InvoiceOverviewStats/);
  assert.match(eway, /<InvoiceTabs/);
  assert.match(invoice, /<InvoicePrint doc=\{form\}/);
  assert.match(eway, /not official GST portal E-Way Bills/);
});

test('Job Card creation and work detail no longer show the guide bar', () => {
  const create = read('pages/jobs/JobCreatePage.jsx');
  const detail = read('pages/jobs/JobCardWorkspace.jsx');
  assert.doesNotMatch(create, /JobCreateGuide|job-create-guide/);
  assert.doesNotMatch(detail, /JobDetailGuide|job-detail-guide/);
  assert.match(create, /onSubmit/);
  assert.match(detail, /JobWorkStockPanel/);
});

test('Supplier directory and purchase history no longer show standalone help but retain summary and purchase form', () => {
  const page = read('pages/suppliers/SuppliersPage.jsx');
  assert.doesNotMatch(page, /<SupplierWorkspaceGuide|SupplierWorkspaceGuide purchaseView/);
  assert.match(page, /<SupplierOverviewCards/);
  assert.match(page, /<SupplierPurchaseFlow/);
  assert.match(page, /<SupplierReturnsPanel/);
});

test('GSTR removes guide and tab help text while retaining preparation warnings and filings controls', () => {
  const page = read('pages/gstr/GSTRDashboard.jsx');
  assert.doesNotMatch(page, /<GSTRGuide|TAB_HELP|gstr-tab-help/);
  assert.match(page, /Preparation only/);
  assert.match(page, /Portal unverified/);
  assert.match(page, /access\.can\('gstr\.export'\)/);
  assert.match(page, /GSTR-2B Reconciliation/);
});

test('Reports no longer render instructional panels but retain print/export and data integrity warnings', () => {
  const page = read('pages/reports/Reports.jsx');
  assert.doesNotMatch(page, /<ReportHelpGuide|report-pdf-guide/);
  assert.match(page, /onPrint=\{\(\) => window\.print\(\)\}/);
  assert.match(page, /onCsv=\{exportCsv\}/);
  assert.match(page, /Reports are incomplete/);
});
