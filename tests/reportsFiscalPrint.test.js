import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/reports/Reports.jsx');
const cover = read('src/components/reports/ReportFiscalPrint.jsx');
const printCss = read('src/styles/reports-print.css');
const actions = read('src/components/reports/ReportsHeader.jsx');

test('print cover compares complete fiscal years from real backend totals', () => {
  assert.match(page, /apiClient\.get\('\/reports\/workspace'/);
  assert.match(page, /fiscalYear: fiscalYearStart/);
  assert.match(page, /setFiscalComparison\(payload\.fiscalComparison/);
  assert.match(page, /<ReportFiscalPrint/);
  assert.match(cover, /quarters\.map/);
  assert.match(cover, /Quarterly Sales Performance in Comparison with Revenue Analysis/);
  assert.match(cover, /Collections by payment channel/);
  assert.match(cover, /data\?\.totals\?\.invoices/);
  assert.match(cover, /data\?\.totals\?\.payments/);
  assert.match(cover, /data\?\.totals\?\.expenses/);
  assert.doesNotMatch(cover, /2,186|2,177|2019|2020/);
});

test('full-year comparison explicitly identifies company-wide April-March scope', () => {
  assert.match(page, /referenceMonth < 4 \? 1 : 0/);
  assert.match(cover, /Q1 Apr–Jun/);
  assert.match(cover, /Comparison above is company-wide/);
  assert.match(cover, /permission is required/);
  assert.match(cover, /not zero/);
});

test('print and save PDF share one clean portrait cover plus detail pages', () => {
  assert.match(actions, /<Printer size=\{16\}\/> Print/);
  assert.match(actions, /Save as PDF/);
  assert.match(actions, /onClick=\{onPrint\}/);
  assert.match(printCss, /@page\{size:A4 portrait/);
  assert.match(printCss, /\.report-fiscal-print\{\s*display:block!important/);
  assert.match(printCss, /break-after:page/);
  assert.match(printCss, /\.fiscal-bar-prior\{background:#08a8dc/);
  assert.match(printCss, /\.fiscal-bar-current\{background:#06327b/);
  assert.match(printCss, /fiscal-table-prior/);
  assert.match(printCss, /fiscal-table-current/);
  assert.match(cover, /className="report-fiscal-table"/);
  assert.match(page, /report-print-footer/);
});
