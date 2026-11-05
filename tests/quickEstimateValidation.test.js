import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimateLineErrors, estimateFormValidation } from '../src/components/jobs/quickEstimateValidation.js';

const source = readFileSync(new URL('../src/components/jobs/QuickEstimatePanel.jsx', import.meta.url), 'utf8');
const picker = readFileSync(new URL('../src/components/jobs/EstimateCatalogPicker.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/job-estimate-quick.css', import.meta.url), 'utf8');

const line = (overrides = {}) => ({
  description: 'Engine Oil', type: 'Part', quantity: '2', unitPrice: '450', ...overrides,
});

test('missing description highlights the actual row', () => {
  const errors = estimateLineErrors(line({ description: '   ' }));
  assert.match(errors.description, /description or part name/);
  const text = estimateFormValidation([line(), line({ description: '' })], '0', '0');
  assert.match(text, /Spare Part 2: Enter a work description or part name/);
});

test('quantity must be positive and allow at most two decimals', () => {
  for (const qty of ['', '0', '-1', '10000.01', '1.234', 'not a number', 'Infinity']) {
    assert.ok(estimateLineErrors(line({ quantity: qty })).quantity, qty);
  }
  for (const qty of ['0.01', '1', '1.5', '10000']) {
    assert.equal(estimateLineErrors(line({ quantity: qty })).quantity, undefined, qty);
  }
});

test('zero price is allowed when explicitly entered, but missing price is invalid', () => {
  for (const price of ['', '-1', '10000001', '4.555', 'NaN', 'Infinity']) {
    assert.ok(estimateLineErrors(line({ unitPrice: price })).unitPrice, price);
  }
  for (const price of ['0', '0.00', '9.50', '10000000']) {
    assert.equal(estimateLineErrors(line({ unitPrice: price })).unitPrice, undefined, price);
  }
});

test('description length is bounded by backend limit', () => {
  assert.match(estimateLineErrors(line({ description: 'x'.repeat(251) })).description, /250/);
  assert.equal(estimateLineErrors(line({ description: 'x'.repeat(250) })).description, undefined);
});

test('valid amounts, taxes and discounts produce no validation error', () => {
  assert.equal(estimateFormValidation([line(), line({ description: 'Oil Change', type: 'Labour', unitPrice: '0' })], '0', '18'), '');
  assert.match(estimateFormValidation([], '0', '0'), /Add at least one/);
  assert.match(estimateFormValidation([line()], '1000', '18'), /Discount/);
  assert.match(estimateFormValidation([line()], '0', '101'), /tax/);
  assert.match(estimateFormValidation(Array.from({ length: 76 }, () => line()), '0', '0'), /75/);
});

test('UI flags invalid rows and focuses the first invalid field on Approve & Continue', () => {
  assert.match(source, /const errors = showValidation \? estimateLineErrors\(line\) : \{\}/);
  assert.match(source, /setShowValidation\(true\)/);
  assert.match(source, /querySelector\('\[aria-invalid="true"\]'\)/);
  assert.match(source, /aria-invalid=\{Boolean\(errors\.quantity\)\}/);
  assert.match(source, /aria-invalid=\{Boolean\(errors\.unitPrice\)\}/);
  assert.match(source, /onClick=\{approve\}/);
  assert.match(source, /disabled=\{busy \|\| skipBusy\} onClick=\{approve\}/);
  assert.match(picker, /aria-invalid=\{invalid\}/);
  assert.match(css, /job-quick-line\.is-invalid/);
});
