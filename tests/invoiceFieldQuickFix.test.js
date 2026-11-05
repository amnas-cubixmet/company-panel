import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { invoiceFieldLabel, invoiceFieldNextStep } from '../src/utils/invoiceFieldHelp.js';
import { validateInvoiceDraft, extractInvoiceFieldErrors } from '../src/utils/invoicePayload.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('invoice error labels use actionable names and one-based item numbers', () => {
  assert.equal(invoiceFieldLabel('customer.placeOfSupply'), 'Place of Supply');
  assert.equal(invoiceFieldLabel('seller.gstin'), 'Workshop GSTIN / State');
  assert.equal(invoiceFieldLabel('items.0.hsnCode'), 'Item 1 — HSN / SAC');
  assert.equal(invoiceFieldLabel('items.2.qty'), 'Item 3 — Quantity');
  assert.equal(invoiceFieldLabel('paid'), 'Received Amount');
  assert.match(invoiceFieldNextStep('seller.gstin'), /Company Settings/);
  assert.match(invoiceFieldNextStep('customer.placeOfSupply'), /32-Kerala/);
});

test('invalid invoice fields remain keyed to the exact editable input', () => {
  const errors = validateInvoiceDraft({
    date: '', invoiceType: 'gst',
    seller: { gstin: '32ABCDE1234F1Z5', stateCode: '32' },
    customer: { name: '', placeOfSupply: '' }, items: [{
      type: '', description: '', hsnCode: '', qty: '', unit: '', rate: '12.345',
      purchasePrice: '', discount: '', taxRate: '',
    }],
    paid: '', discount: '', adjustment: '',
  });
  for (const path of ['date', 'customer.name', 'customer.placeOfSupply', 'items.0.type',
    'items.0.hsnCode', 'items.0.qty', 'items.0.unit', 'items.0.rate', 'items.0.taxRate']) {
    assert.ok(errors[path], path);
  }
  const apiErrors = extractInvoiceFieldErrors({
    data: { items: [{qty: ['Quantity cannot be zero.']}], paid: ['Amount is invalid.'] },
  });
  assert.equal(apiErrors['items.0.qty'], 'Quantity cannot be zero.');
  assert.equal(apiErrors.paid, 'Amount is invalid.');
});

test('invoice editor gives every visible validation field inline help and a direct jump target', () => {
  const source = read('src/pages/invoices/InvoiceRoutePage.jsx');
  assert.match(source, /invoice-error-checklist/);
  assert.match(source, /invoiceFieldLabel\(field\)/);
  assert.match(source, /invoiceFieldNextStep\(field\)/);
  assert.match(source, /jumpToInvoiceField\(field\)/);
  assert.match(source, /scrollIntoView\(\{ behavior: 'smooth', block: 'center'/);
  for (const field of ['customer.name', 'customer.placeOfSupply', 'date', 'seller.gstin', 'paid', 'discount', 'adjustment']) {
    assert.ok(source.includes('data-invoice-field="' + field + '"'), field);
  }
  for (const field of ['type', 'inventoryId', 'description', 'hsnCode', 'qty', 'unit', 'rate', 'taxRate']) {
    assert.ok(source.includes('data-invoice-field={`items.${index}.' + field + '`}'), field);
  }
  for (const field of ['type', 'inventoryId', 'description', 'hsnCode', 'qty', 'unit']) {
    assert.ok(source.includes('fieldErrors[`items.${index}.' + field + '`] && <small className="invoice-input-error"'), field);
  }
  assert.match(source, /mode === 'create' \? applyWorkshopTaxProfile\(form, workshopTaxProfile\) : form/);
  assert.match(source, /billingService.saveDraft\(draft\)/);
  assert.match(source, /billingService.finalize\(current.id\)/);
});
