import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reportLoadErrorMessage } from '../src/pages/reports/reportErrorMessage.js';
import { buildReportSummary, reportChartBuckets } from '../src/pages/reports/reportsDashboard.utils.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('missing API and permissions show helpful nontechnical next steps', () => {
  assert.match(reportLoadErrorMessage({ status: 404 }), /update the Django backend and restart/);
  assert.match(reportLoadErrorMessage({ status: 403 }), /workshop owner/);
  assert.match(reportLoadErrorMessage({ status: 503 }), /check the server/);
  assert.equal(reportLoadErrorMessage(new Error('Connection issue')), 'Connection issue');
});

test('simple explanation includes what customer and workshop amounts mean', () => {
  const guide = read('src/components/reports/ReportHelpGuide.jsx');
  const page = read('src/pages/reports/Reports.jsx');
  const stats = read('src/components/reports/ReportStats.jsx');
  assert.match(guide, /Invoice amount/);
  assert.match(guide, /Money received/);
  assert.match(guide, /Customer dues/);
  assert.match(guide, /ബിൽ തുക/);
  assert.match(guide, /not business profit/);
  assert.match(page, /<ReportHelpGuide\/>/);
  assert.match(stats, /Collections After Paid Expenses/);
  assert.match(page, /the following pages show the dates you selected/);
});

test('vehicle registration search includes field used by real Django report API', () => {
  const page = read('src/pages/reports/Reports.jsx');
  assert.match(page, /item\.vehicle\?\.registration, item\.vehicleReg, item\.status/);
  assert.match(page, /Invoice, customer, or vehicle number/);
});

test('reported collections graph subtracts customer refunds as the totals do', () => {
  const summary = buildReportSummary({
    from: '2026-11-01',
    to: '2026-11-30',
    payments: [
      { id: 'received', date: '2026-11-03', amount: '120.00', direction: 'IN', status: 'Completed' },
      { id: 'refund', date: '2026-11-03', amount: '30.00', direction: 'OUT', status: 'Completed' },
      { id: 'reversal', date: '2026-11-03', amount: '900.00', status: 'Reversed' },
    ],
  });
  const bars = reportChartBuckets(summary, '2026-11-01', '2026-11-30');
  assert.equal(summary.collected, 90);
  assert.equal(bars.reduce((sum, row) => sum + row.collected, 0), 90);
});

test('report exports cannot proceed with invalid dates or no authorized data', () => {
  const page = read('src/pages/reports/Reports.jsx');
  assert.match(page, /!Object\.values\(availability\)\.some\(Boolean\)/);
  assert.match(page, /Missing figures are shown as — instead of ₹0/);
});
