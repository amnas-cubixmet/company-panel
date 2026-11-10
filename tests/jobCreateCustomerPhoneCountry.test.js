import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  JOB_PHONE_COUNTRIES, splitInternationalPhone, joinInternationalPhone, validInternationalPhone,
} from '../src/utils/jobCreateAdapters.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const job = read('src/pages/jobs/JobCreatePage.jsx');
const customer = read('src/components/jobs/JobCustomerPicker.jsx');
const component = read('src/components/ui/PhoneInput.jsx');
const styles = read('src/styles/job-create-professional.css');

test('the job card and Add Customer use the same code dropdown with an above-field label', () => {
  for (const screen of [job, customer]) {
    assert.match(screen, /<PhoneInput label="Phone Number" labelPosition="above"/);
    assert.match(screen, /countries={JOB_PHONE_COUNTRIES}/);
    assert.match(screen, /onCountryCodeChange/);
    assert.match(screen, /joinInternationalPhone\(/);
  }
  assert.match(customer, /name="newCustomerPhone" required/);
  assert.match(job, /name="customerPhone" required/);
  assert.match(component, /labelAbove && <Label htmlFor={inputId}/);
  assert.match(component, /label && !labelAbove && <Label htmlFor={inputId}/);
  assert.match(styles, /\.job-create-phone \.ui-phone__label/);
  assert.match(styles, /position: static !important/);
});

test('country picker uses distinct country labels and preserves country on empty input', () => {
  assert.ok(JOB_PHONE_COUNTRIES.some(c => c.code === '+91' && c.label === 'India' && c.flag === '🇮🇳'));
  assert.ok(JOB_PHONE_COUNTRIES.some(c => c.code === '+971' && c.label === 'UAE' && c.flag === '🇦🇪'));
  assert.ok(JOB_PHONE_COUNTRIES.some(c => c.code === '+974' && c.label === 'Qatar'));
  assert.equal(splitInternationalPhone('', '+971').country, '+971');
  assert.equal(joinInternationalPhone('+971', ''), '');
  assert.equal(joinInternationalPhone('+971', '501234567'), '+971501234567');
  assert.deepEqual(splitInternationalPhone('+971501234567'), {country: '+971', national: '501234567'});
  assert.equal(validInternationalPhone('+971501234567'), true);
  assert.equal(validInternationalPhone('501234567'), false);
});

test('the inline Add Customer checks duplicate and saves the international number', () => {
  assert.match(customer, /validInternationalPhone\(phone\)/);
  assert.match(customer, /checkDuplicateCustomer\(\{ phone \}\)/);
  assert.match(customer, /name, phone, email:/);
  assert.match(customer, /phoneCountryCode, setPhoneCountryCode/);
  assert.match(job, /splitInternationalPhone\(form.customerPhone, phoneCountryCode\)/);
});
