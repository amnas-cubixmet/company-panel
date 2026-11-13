import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOB_PHONE_COUNTRIES,
  jobPhoneLength,
  jobPhoneHint,
  sanitizeJobNationalPhone,
  pasteJobNationalPhone,
  splitInternationalPhone,
  joinInternationalPhone,
  validInternationalPhone,
} from '../src/utils/jobCreateAdapters.js';

const examples = [
  ['+91', '9876543210'],
  ['+971', '501234567'],
  ['+966', '501234567'],
  ['+974', '55123456'],
  ['+965', '55123456'],
  ['+968', '92123456'],
  ['+973', '33123456'],
  ['+1', '2025550198'],
  ['+44', '7123456789'],
  ['+61', '412345678'],
];

test('every country in the Job Create selector has an exact national digit limit', () => {
  assert.equal(JOB_PHONE_COUNTRIES.length, examples.length);
  for (const [country, national] of examples) {
    assert.equal(jobPhoneLength(country), national.length, country);
    assert.equal(validInternationalPhone(joinInternationalPhone(country, national)), true, country);
    assert.equal(validInternationalPhone(joinInternationalPhone(country, national.slice(0, -1))), false, country + ' too short');
    assert.equal(validInternationalPhone(joinInternationalPhone(country, national + '7')), false, country + ' too long');
  }
});

test('India +91 requires exactly ten numeric digits, ignoring its calling code', () => {
  assert.equal(jobPhoneLength('+91'), 10);
  assert.equal(validInternationalPhone('+919876543210'), true);
  assert.equal(validInternationalPhone('+91987654321'), false);
  assert.equal(validInternationalPhone('+9198765432107'), false);
  assert.equal(validInternationalPhone('+91abc9876543210'), false);
  assert.equal(jobPhoneHint('+91', '9876'), '4/10 digits · +91');
});

test('paste cleans separators, full country prefix and extra digits', () => {
  assert.equal(sanitizeJobNationalPhone('+91', '+91 98765 43210'), '9876543210');
  assert.equal(sanitizeJobNationalPhone('+91', '0091-98765 43210'), '9876543210');
  assert.equal(sanitizeJobNationalPhone('+91', '987654321099'), '9876543210');
  assert.equal(sanitizeJobNationalPhone('+971', '+971 50 123 4567'), '501234567');
  assert.equal(sanitizeJobNationalPhone('+974', '+974 55123456'), '55123456');
});

test('national trunk zero is removed only for supported destinations', () => {
  assert.equal(sanitizeJobNationalPhone('+971', '0501234567'), '501234567');
  assert.equal(sanitizeJobNationalPhone('+966', '0501234567'), '501234567');
  assert.equal(sanitizeJobNationalPhone('+44', '07123456789'), '7123456789');
  assert.equal(sanitizeJobNationalPhone('+61', '0412345678'), '412345678');
});

test('full paste is handled before browser maxLength, and partial paste preserves selection', () => {
  assert.equal(pasteJobNationalPhone('+91', '', '+91 98765 43210', 0, 0), '9876543210');
  assert.equal(pasteJobNationalPhone('+91', '9876500000', '4321', 5, 9), '9876543210');
  assert.equal(splitInternationalPhone('+919876543210').national, '9876543210');
  assert.equal(joinInternationalPhone('+91', '9876543210'), '+919876543210');
});
