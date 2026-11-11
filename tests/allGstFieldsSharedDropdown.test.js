import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GST_TAX_DROPDOWN_CHOICES, gstChoiceForSavedRate, gstTotalFromSelection,
} from '../src/utils/gstRateDropdown.js';

const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');

test('one GST dropdown shares the exact ten component choices used across invoices, stock and supplier purchase', () => {
  assert.deepEqual(GST_TAX_DROPDOWN_CHOICES.map(option => option.label), [
    'CGST 2.5%', 'CGST 5%', 'CGST 9%', 'CGST 18%',
    'SGST 2.5%', 'SGST 5%', 'SGST 9%', 'SGST 18%',
    'IGST 5%', 'IGST 18%',
  ]);
  assert.deepEqual(GST_TAX_DROPDOWN_CHOICES.map(option => option.value), [
    'cgst:2.5', 'cgst:5', 'cgst:9', 'cgst:18',
    'sgst:2.5', 'sgst:5', 'sgst:9', 'sgst:18',
    'igst:5', 'igst:18',
  ]);
});

test('paired CGST/SGST components save one TOTAL GST rate while IGST is the whole rate', () => {
  assert.equal(gstTotalFromSelection('cgst:9'), '18');
  assert.equal(gstTotalFromSelection('sgst:9'), '18');
  assert.equal(gstTotalFromSelection('cgst:2.5'), '5');
  assert.equal(gstTotalFromSelection('sgst:18'), '36');
  assert.equal(gstTotalFromSelection('igst:18'), '18');
  assert.equal(gstTotalFromSelection('igst:5'), '5');
  assert.equal(gstTotalFromSelection('none'), '0');
  assert.equal(gstTotalFromSelection('custom'), '');
  assert.equal(gstTotalFromSelection(''), '');
});

test('saved rates remain editable without coercing historical/custom GST into a preset', () => {
  assert.equal(gstChoiceForSavedRate(''), '');
  assert.equal(gstChoiceForSavedRate(null), '');
  assert.equal(gstChoiceForSavedRate('0'), 'none');
  assert.equal(gstChoiceForSavedRate('0.00'), 'none');
  assert.equal(gstChoiceForSavedRate('18'), 'cgst:9');
  assert.equal(gstChoiceForSavedRate('18.00'), 'cgst:9');
  assert.equal(gstChoiceForSavedRate('5'), 'cgst:2.5');
  assert.equal(gstChoiceForSavedRate('12'), 'custom');
  assert.equal(gstChoiceForSavedRate('1.25'), 'custom');
  assert.equal(gstChoiceForSavedRate('invalid'), 'custom');
});

test('shared dropdown retains custom rate, 0% classification and accessible 16px mobile controls', () => {
  const component = read('components/common/GstRateDropdown.jsx');
  const css = read('components/common/GstRateDropdown.css');
  assert.match(component, /<select[^>]*className=\{className\}/);
  assert.match(component, /<option value="none">0% — Select Tax Classification<\/option>/);
  assert.match(component, /GST_TAX_DROPDOWN_CHOICES/);
  assert.match(component, /Saved\/Other HSN-Specific Rate \(custom %\)/);
  assert.match(component, /selection === 'custom' && <input type="number"/);
  assert.match(component, /onChange\(next\)/);
  assert.match(component, /justEmitted\.current === next/);
  assert.match(component, /Total GST saved/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:600px\)/);
});

test('all direct GST percentage editors now use shared dropdown; existing tax totals are not changed', () => {
  const paths = [
    'pages/services/ServiceList.jsx',
    'pages/jobs/JobPartsWorkflow.jsx',
    'pages/expenses/ExpenseList.jsx',
    'components/settings/SettingsEditor.jsx',
    'pages/saas/OwnerOnboarding.jsx',
  ];
  for (const path of paths) {
    assert.match(read(path), /<GstRateDropdown/, 'Missing shared selector in ' + path);
  }
  const services = read(paths[0]);
  assert.match(services, /taxRate: rate/);
  assert.doesNotMatch(services, /<Field label="GST Rate \(%\)">\s*<input/);
  const jobs = read(paths[1]);
  assert.match(jobs, /onChange=\{rate => set\('purchaseGstRate', rate\)\}/);
  assert.match(jobs, /onChange=\{rate => set\('tax', rate\)\}/);
  assert.match(jobs, /purchaseGstRate: form\.purchaseGstRate/);
  assert.doesNotMatch(jobs, /<label className="form-label">GST Rate \(%\)<input/);
  const expenses = read(paths[2]);
  assert.match(expenses, /expenseIncludedGst\(values\.amount, rate\)/);
  assert.match(expenses, /readOnly=\{values\.gstRate !== ''\}/);
  const settings = read(paths[3]);
  assert.match(settings, /key === 'defaultTaxRate'/);
  assert.match(settings, /rate === '' \? '' : Number\(rate\)/);
  const onboarding = read(paths[4]);
  assert.match(onboarding, /key === 'defaultTaxRate'/);
  assert.match(onboarding, /apiDataFor/);
  // Existing specialized flows retain the shared ten-option engine.
  assert.match(read('pages/stock/StockEasyPage.jsx'), /STOCK_GST_CHOICES = invoiceLineTaxChoices/);
  assert.match(read('components/suppliers/SupplierPurchaseFlow.jsx'), /invoiceLineTaxChoices\('unknown'\)/);
  assert.match(read('components/jobs/JobWorkStockPanel.jsx'), /invoiceLineTaxChoices\('unknown'\)/);
  assert.match(read('pages/invoices/InvoiceRoutePage.jsx'), /invoiceLineTaxChoices\(appliedTaxMode/);
});
