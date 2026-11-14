import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPLIER_GST_STATE_CODES,
  normalizeSupplierGstin,
  supplierGstinError,
  supplierGstinStateCode,
} from '../src/utils/supplierGstin.js';

test('valid GSTIN is normalized and state code is extracted', () => {
  assert.equal(normalizeSupplierGstin(' 32abcde1234f1z5 '), '32ABCDE1234F1Z5');
  assert.equal(supplierGstinError('32ABCDE1234F1Z5'), '');
  assert.equal(supplierGstinStateCode('32ABCDE1234F1Z5'), '32');
  assert.ok(SUPPLIER_GST_STATE_CODES.has('32'));
  assert.ok(SUPPLIER_GST_STATE_CODES.has('29'));
});

test('unregistered supplier may leave GSTIN empty', () => {
  assert.equal(supplierGstinError(''), '');
  assert.equal(supplierGstinError('  '), '');
  assert.equal(supplierGstinStateCode(''), '');
});

test('GSTIN cannot contain an invalid state, non-digits or missing digits', () => {
  const invalid = [
    'KERALA', 'ABABCDE1234F1Z5', '00ABCDE1234F1Z5',
    '32ABCDE1234F1Z', '32ABCDE1234F1Z50',
    '32ABCDE1234F1Y5', '32ABCDE1234FZ15',
    '99ABCDE1234F1Z5',
  ];
  for (const gstin of invalid) {
    assert.ok(supplierGstinError(gstin), gstin);
    assert.equal(supplierGstinStateCode(gstin), '', gstin);
  }
});

test('Indian state code determines same-state vs interstate GST', () => {
  assert.equal(supplierGstinStateCode('32ABCDE1234F1Z5'), '32');
  assert.equal(supplierGstinStateCode('29ABCDE1234F1Z5'), '29');
  assert.notEqual(supplierGstinStateCode('29ABCDE1234F1Z5'), '32');
});

test('GSTIN format is checked without pretending to verify active registration', () => {
  assert.ok(supplierGstinError('32ABCDE1234F1Y5').includes('format'));
  assert.ok(supplierGstinError('12ABCDE1234F1Z5') === '');
  // A structurally valid identifier may still be inactive or fictitious.
});
