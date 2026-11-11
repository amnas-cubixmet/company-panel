import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findPostedSupplierBillReplay } from '../src/utils/supplierPurchaseReplay.js';

const requested = {
  supplierId: 'supplier-1', invoiceNumber: 'INV-001', invoiceDate: '2026-11-11',
  placeOfSupply: '32', total: 1180, paidNow: 800,
  items: [{
    itemId: 'part-1', description: 'Brake pad', quantity: '2.00',
    purchaseRate: '500.00', gstRate: '18', gstTreatment: 'taxable',
  }],
};
const bill = {
  postingStatus: 'Posted', supplierId: 'supplier-1',
  invoiceNumber: 'inv-001', invoiceDate: '2026-11-11',
  total: '1180.00', paid: '800.00',
  items: [{
    itemId: 'part-1', description: 'Brake pad', quantity: '2',
    purchaseRate: '500', gstRate: '18.00',
    gstTreatment: 'taxable', placeOfSupply: '32',
  }],
};

test('network retry recognizes exactly one already posted supplier bill', () => {
  assert.equal(findPostedSupplierBillReplay([bill], requested), bill);
});

test('never considers a draft, different supplier, altered GST, price or payment to be posted', () => {
  const variants = [
    { ...bill, postingStatus: 'Draft' },
    { ...bill, supplierId: 'another-workshop-supplier' },
    { ...bill, invoiceNumber: 'INV-002' },
    { ...bill, invoiceDate: '2026-11-10' },
    { ...bill, paid: '0.00' },
    { ...bill, total: '1280.00' },
    { ...bill, items: [{ ...bill.items[0], gstRate: '5' }] },
    { ...bill, items: [{ ...bill.items[0], purchaseRate: '400' }] },
    { ...bill, items: [{ ...bill.items[0], placeOfSupply: '33' }] },
    { ...bill, items: [] },
  ];
  for (const value of variants) {
    assert.equal(findPostedSupplierBillReplay([value], requested), null);
  }
  assert.equal(findPostedSupplierBillReplay([], requested), null);
});

test('only reconciles uncertain HTTP failures; purchase submission still uses one atomic POST', () => {
  const src = readFileSync(new URL('../src/components/suppliers/SupplierPurchaseFlow.jsx', import.meta.url), 'utf8');
  assert.match(src, /supplierFinanceService\.createBill\(purchasePayload\)/);
  assert.match(src, /supplierFinanceService\.getBills\(supplier\.id\)/);
  assert.match(src, /findPostedSupplierBillReplay/);
  assert.match(src, /receiveIntoStock: true, postNow: true/);
  assert.match(src, /idempotencyKey: row\.id/);
});
