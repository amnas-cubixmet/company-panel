import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stockGstReview, stockSupplierFinanceTotals } from '../src/utils/stockFinanceOverview.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('GST review distinguishes HSN gaps and legal zero-rate classification gaps', () => {
  const report = stockGstReview([
    { id: 'a', partName: 'Brake pad', tax: 18, hsnCode: '8708' },
    { id: 'b', partName: 'Service part', tax: 18, hsnCode: '' },
    { id: 'c', partName: 'Exempt item', tax: 0, zeroTaxClassification: 'exempt' },
    { id: 'd', partName: 'Undocumented nil-rate part', tax: 0 },
    { id: 'e', partName: 'IGST classified part', tax: 5, hsnCode: '8708' },
  ]);
  assert.equal(report.total, 5);
  assert.equal(report.missingHsn, 1);
  assert.equal(report.missingZeroClassification, 1);
  assert.equal(report.needsReview, 2);
  assert.deepEqual(report.examples.map(row => row.id), ['b', 'd']);
  assert.equal(stockGstReview([]).needsReview, 0);
});

test('stock supplier finance summary reflects posted backend payable data, not catalog price', () => {
  const summary = stockSupplierFinanceTotals([
    { outstanding: '600.00', overdue: '200.00', availableAdvance: '75.00',
      availableDebitCredit: '25.00', netExposureAfterAvailableCredits: '500.00' },
    { outstanding: '0.00', overdue: '0.00', availableAdvance: '50.00',
      availableDebitCredit: '0.00', netExposureAfterAvailableCredits: '-50.00' },
  ]);
  assert.equal(summary.outstanding, 600);
  assert.equal(summary.overdue, 200);
  assert.equal(summary.availableCredits, 150);
  assert.equal(summary.netExposure, 450);
  assert.equal(summary.suppliersWithDue, 1);
  assert.equal(stockSupplierFinanceTotals([]).outstanding, 0);
});

test('Stock Finance panel is read only and has canonical links to GST, Finance and Supplier ledger', () => {
  const panel = read('src/components/stock/StockFinanceConnections.jsx');
  const page = read('src/pages/stock/StockEasyPage.jsx');
  const service = read('src/services/supplierFinance.service.js');
  assert.match(service, /getSupplierBalances: \(\) => live\('get', '\/suppliers\/balances'\)/);
  assert.match(page, /supplierFinanceService\.getSupplierBalances\(\)/);
  assert.match(page, /can\('stock\.view'\) && can\('payments\.view'\) && !USE_MOCK_API/);
  assert.match(panel, /to="\/suppliers"/);
  assert.match(panel, /to="\/finance\/accounts"/);
  assert.match(panel, /to="\/finance\/transactions"/);
  assert.match(panel, /to="\/gstr\?tab=gstr2b"/);
  assert.match(panel, /No automatic posting/);
  assert.match(panel, /not a cash refund or settled bill yet/i);
});

test('Stock page restricts purchase cost visibility and item movements', () => {
  const page = read('src/pages/stock/StockEasyPage.jsx');
  assert.match(page, /canManageStock = can\('stock\.edit'\)/);
  assert.match(page, /canCreateStock = can\('stock\.create'\)/);
  assert.match(page, /canManageStock \? cash\(item\.costPrice\) : 'Restricted'/);
  assert.match(page, /canManageStock \? cash\(totalValue\) : 'Restricted'/);
  assert.match(page, /canCreateStock && <button type="button" className="cg-easy-primary"/);
  assert.match(page, /canManageStock && <button type="button" onClick=\{\(\) => beginMove\('out'\)\}/);
  assert.match(page, /data-label="GST \/ HSN"/);
  assert.match(page, /item\.hsnCode/);
  assert.match(page, /item\.zeroTaxClassification/);
});
