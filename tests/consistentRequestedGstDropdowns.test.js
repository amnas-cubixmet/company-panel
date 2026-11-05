import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  GST_CGST_SGST_COMPONENT_RATES, GST_IGST_RATES,
  GST_INTRA_TOTAL_RATES, GST_UNKNOWN_TOTAL_RATES,
  gstRateChoices, gstPresetLabel,
} from '../src/utils/gstRatePresets.js';
import { invoiceLineTaxChoices } from '../src/utils/invoiceTaxUi.js';
import { eWayGstChoices, eWaySetGstRate } from '../src/utils/eWayGst.js';
import { estimateGstChoices, estimateGstOptions } from '../src/components/jobs/estimateGstRates.js';
import { calculateEstimateIndiaGst } from '../src/utils/indiaGst.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const expected = [
  'CGST 2.5%', 'CGST 5%', 'CGST 9%', 'CGST 18%',
  'SGST 2.5%', 'SGST 5%', 'SGST 9%', 'SGST 18%',
  'IGST 5%', 'IGST 18%',
];
const codes = [
  'cgst:2.5', 'cgst:5', 'cgst:9', 'cgst:18',
  'sgst:2.5', 'sgst:5', 'sgst:9', 'sgst:18',
  'igst:5', 'igst:18',
];

test('ten unique and separately named GST options, same across tax modes', () => {
  assert.deepEqual(GST_CGST_SGST_COMPONENT_RATES, ['2.5','5','9','18']);
  assert.deepEqual(GST_IGST_RATES, ['5','18']);
  assert.deepEqual(GST_INTRA_TOTAL_RATES, ['5','10','18','36']);
  assert.deepEqual(GST_UNKNOWN_TOTAL_RATES, ['5','10','18','36']);
  assert.equal(gstPresetLabel('igst','18'), 'IGST 18%');
  for (const mode of ['unknown', 'igst', 'cgst_sgst']) {
    assert.deepEqual(gstRateChoices(mode).map(row => row.label), expected);
    assert.deepEqual(gstRateChoices(mode).map(row => row.value), codes);
    assert.deepEqual(invoiceLineTaxChoices(mode).map(row => row.value), codes);
    assert.deepEqual(eWayGstChoices(mode, '').map(row => row.value), codes);
    assert.deepEqual(estimateGstChoices('', mode), codes);
    assert.equal(estimateGstOptions('', mode)[0].value, 'none');
    assert.deepEqual(estimateGstOptions('', mode).slice(1).map(row => row.label), expected);
  }
});

test('all GST module forms use one exact ten-option choice list', () => {
  const invoice=read('src/pages/invoices/InvoiceRoutePage.jsx');
  const eway=read('src/pages/invoices/EWayBillPage.jsx');
  const estimate=read('src/components/jobs/QuickEstimatePanel.jsx');
  const legacy=read('src/pages/invoices/BillingWorkspace.jsx');
  assert.match(invoice,/invoiceLineTaxChoices\(appliedTaxMode/);
  assert.match(eway,/invoiceLineTaxChoices\(gstMode/);
  assert.match(estimate,/estimateGstOptions\(line\.taxRate, taxMode/);
  assert.match(legacy,/invoiceLineTaxChoices\(gstMode/);
});

test('historical classified rates still load without changing the ten presets', () => {
  assert.equal(gstRateChoices('igst', '12').length, 11);
  assert.ok(estimateGstChoices('12', 'igst').includes('saved:12'));
  assert.equal(invoiceLineTaxChoices('unknown').length, 10);
  assert.equal(gstRateChoices('igst', 'invalid').length, 10);
});

test('CGST and SGST component picks map to correct paired total; IGST stays whole', () => {
  const line=[{type:'Service',quantity:1,unitPrice:100,taxRate:18}];
  const intra=calculateEstimateIndiaGst({lines:line,registered:true,supplierState:'32',placeOfSupply:'32'});
  assert.equal(intra.cgst,9);
  assert.equal(intra.sgst,9);
  assert.equal(intra.igst,0);
  assert.equal(intra.total,118);
  const inter=calculateEstimateIndiaGst({lines:line,registered:true,supplierState:'32',placeOfSupply:'33'});
  assert.equal(inter.cgst,0);
  assert.equal(inter.sgst,0);
  assert.equal(inter.igst,18);
  assert.equal(inter.total,118);
  const eway=eWaySetGstRate({gstRate:'',cgstRate:'',sgstRate:'',igstRate:''},18,'cgst_sgst');
  assert.equal(eway.cgstRate,9);
  assert.equal(eway.sgstRate,9);
  assert.equal(eway.igstRate,'');
});
