import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  invoiceLineTaxChoices, invoiceTotalRateFromChoice,
  invoiceChoiceFromTotalRate,
} from '../src/utils/invoiceTaxUi.js';
import { estimateGstOptions } from '../src/components/jobs/estimateGstRates.js';
import { calculateEstimateIndiaGst } from '../src/utils/indiaGst.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('every GST editor offers ten identical independently labeled rates', () => {
  const expected = [
    'CGST 2.5%', 'CGST 5%', 'CGST 9%', 'CGST 18%',
    'SGST 2.5%', 'SGST 5%', 'SGST 9%', 'SGST 18%',
    'IGST 5%', 'IGST 18%',
  ];
  for (const mode of ['unknown', 'cgst_sgst', 'igst', 'none']) {
    assert.deepEqual(invoiceLineTaxChoices(mode).map(row => row.label), expected);
  }
  assert.equal(estimateGstOptions()[0].value, 'none');
  assert.deepEqual(estimateGstOptions().slice(1).map(row => row.label), expected);
  const invoice = read('src/pages/invoices/InvoiceRoutePage.jsx');
  const eway = read('src/pages/invoices/EWayBillPage.jsx');
  const job = read('src/components/jobs/QuickEstimatePanel.jsx');
  const legacy = read('src/pages/invoices/BillingWorkspace.jsx');
  for (const source of [invoice, eway, job, legacy]) {
    assert.match(source, /invoiceChoiceFromTotalRate/);
  }
  assert.match(invoice, /chooseItemGst\(row\.id, e\.target\.value\)/);
  assert.match(eway, /updateItemGst\(item\.id, e\.target\.value\)/);
  assert.match(job, /chooseGst\(line\.key, event\.target\.value\)/);
});

test('component choices send total GST and selected label persists with decimal formatting', () => {
  assert.equal(invoiceTotalRateFromChoice('cgst:9'), '18');
  assert.equal(invoiceTotalRateFromChoice('sgst:9'), '18');
  assert.equal(invoiceTotalRateFromChoice('igst:18'), '18');
  assert.equal(invoiceTotalRateFromChoice('igst:5'), '5');
  assert.equal(invoiceChoiceFromTotalRate('18.00', 'cgst_sgst', 'sgst:9'), 'sgst:9');
  assert.equal(invoiceChoiceFromTotalRate('18.00', 'igst', 'igst:18'), 'igst:18');
  assert.equal(invoiceChoiceFromTotalRate('18.00', 'cgst_sgst'), 'cgst:9');
});

test('GST ₹100 with 18% rate produces ₹118 for both jurisdictions', () => {
  for (const placeOfSupply of ['32', '33']) {
    const result = calculateEstimateIndiaGst({
      lines: [{ type:'Service', quantity:1, unitPrice:100, taxRate:18 }],
      registered:true, supplierState:'32', placeOfSupply,
    });
    assert.equal(result.total, 118);
    assert.equal(result.tax, 18);
    assert.equal(result.mode, placeOfSupply === '32' ? 'cgst_sgst' : 'igst');
  }
});
