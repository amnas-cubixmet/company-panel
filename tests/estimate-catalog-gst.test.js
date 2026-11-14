import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultEstimateCatalogGst,
  normalizeEstimateTaxRate,
  validateEstimateCatalogDraft,
  buildEstimateCatalogSelection,
} from '../src/components/jobs/estimateNewCatalog.js';
import { calculateEstimateIndiaGst } from '../src/utils/indiaGst.js';

const draft = (kind, overrides = {}) => ({
  kind,
  name: kind === 'part' ? 'Air Filter' : 'Wheel Alignment',
  sku: 'FLT-100',
  brand: 'Local',
  price: '1000',
  costPrice: '500',
  workType: 'Labour',
  ...defaultEstimateCatalogGst(true, 'cgst_sgst'),
  hsnSac: kind === 'part' ? '8421' : '998714',
  ...overrides,
});

test('registered workshop gets an editable 18% total starting GST preset', () => {
  const local = defaultEstimateCatalogGst(true, 'cgst_sgst');
  const interstate = defaultEstimateCatalogGst(true, 'igst');
  assert.equal(local.taxRate, '18');
  assert.equal(interstate.taxRate, '18');
  assert.equal(local.taxChoice, 'cgst:9');
  assert.equal(interstate.taxChoice, 'igst:18');
  assert.equal(defaultEstimateCatalogGst(false).taxRate, '0');
});

test('both new Stock Parts and Work services validate the same GST rate', () => {
  assert.deepEqual(validateEstimateCatalogDraft(draft('part'), { registered: true }), {});
  assert.deepEqual(validateEstimateCatalogDraft(draft('service'), { registered: true }), {});
  for (const kind of ['part', 'service']) {
    const bad = validateEstimateCatalogDraft(draft(kind, { taxRate: '', taxChoice: '' }), {
      registered: true,
    });
    assert.ok(bad.taxChoice, kind);
    assert.deepEqual(validateEstimateCatalogDraft(draft(kind), { registered: false }), {});
  }
});

test('no GST needs HSN/SAC, legal classification and explicit confirmation', () => {
  const none = draft('part', {
    taxRate: '0', taxChoice: 'none', taxTreatment: '', taxTreatmentConfirmed: false,
    hsnSac: '',
  });
  const errors = validateEstimateCatalogDraft(none, { registered: true });
  assert.ok(errors.taxTreatment);
  assert.ok(errors.hsnSac);
  assert.ok(errors.taxTreatmentConfirmed);
  assert.deepEqual(validateEstimateCatalogDraft({
    ...none,
    taxTreatment: 'nil_rated',
    taxTreatmentConfirmed: true,
    hsnSac: '1234',
  }, { registered: true }), {});
  assert.ok(validateEstimateCatalogDraft({
    ...none, taxTreatment: 'out_of_scope', taxTreatmentConfirmed: true,
    hsnSac: '1234',
  }, { registered: true }).taxTreatment);
});

test('saved catalog tax and HSN/SAC are retained in the estimate item', () => {
  const savedPart = buildEstimateCatalogSelection(draft('part'), {
    id: 'stock-1', partName: 'Air Filter', sellingPrice: 1000,
    sku: 'FLT-100', tax: '18.00', hsnCode: '8421',
  });
  assert.equal(savedPart.taxRate, '18');
  assert.equal(savedPart.hsnSac, '8421');
  assert.equal(savedPart.taxChoice, 'cgst:9');
  const savedWork = buildEstimateCatalogSelection(draft('service'), {
    id: 'service-1', name: 'Wheel Alignment', price: 1000,
    taxRate: '18.00', hsnSac: '998714',
  });
  assert.equal(savedWork.taxRate, '18');
  assert.equal(savedWork.hsnSac, '998714');
  assert.equal(normalizeEstimateTaxRate('0.00'), '0');
  assert.equal(normalizeEstimateTaxRate('5.50'), '5.5');
});

test('the existing India estimate GST calculator adds tax exactly once', () => {
  const lines = [
    { type: 'Part', quantity: '1', unitPrice: '1000', taxRate: '18' },
    { type: 'Labour', quantity: '1', unitPrice: '500', taxRate: '18' },
  ];
  const result = calculateEstimateIndiaGst({
    lines, registered: true, supplierState: '32', placeOfSupply: '32',
  });
  assert.equal(result.subtotal, 1500);
  assert.equal(result.cgst, 135);
  assert.equal(result.sgst, 135);
  assert.equal(result.igst, 0);
  assert.equal(result.tax, 270);
  assert.equal(result.total, 1770);
});

test('zero-tax classifications normalize and remain confirmed only when explicitly chosen', () => {
  const selection = buildEstimateCatalogSelection(
    draft('part', {
      taxRate: '0', taxChoice: 'none', taxTreatment: 'exempt',
      taxTreatmentConfirmed: true,
    }),
    { id: 'part-2', partName: 'Exempt Part', tax: '0.00' },
  );
  assert.equal(selection.taxRate, '0');
  assert.equal(selection.taxChoice, 'none');
  assert.equal(selection.taxTreatment, 'exempt');
  assert.equal(selection.taxTreatmentConfirmed, true);
});
