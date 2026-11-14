import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  customerFormDefaults, toCustomerFormPayload, toCustomerFormValues,
  normalizeCustomerPhone, normalizeCustomerType, validateCustomerContact,
} from '../src/utils/customerFormModel.js';

test('new and edit customer forms use the same defaults and optional address fields', () => {
  assert.deepEqual(customerFormDefaults(), {
    name: '', phone: '', email: '', customerType: 'Individual',
    companyName: '', gstNo: '', branch: '', address: '',
    city: '', state: '', pincode: '', notes: '',
  });
  assert.deepEqual(toCustomerFormValues({
    name: 'Workshop Client', phone: '9876543210', customerType: 'business',
    gstin: '32ABCXY1234Z1Z2', branchId: 'branch-1',
  }), {
    ...customerFormDefaults(), name: 'Workshop Client', phone: '+919876543210',
    customerType: 'Business / Company', gstNo: '32ABCXY1234Z1Z2', branch: 'branch-1',
  });
});

test('phone is the only contact number entered and legacy Indian numbers normalize', () => {
  assert.equal(normalizeCustomerPhone('9876543210'), '+919876543210');
  assert.equal(normalizeCustomerPhone('+971501234567'), '+971501234567');
  const valid = validateCustomerContact({ name: 'Test', phone: '9876543210' });
  assert.deepEqual(valid, {});
  assert.ok(validateCustomerContact({ name: '', phone: '123' }).phone);
  assert.ok(validateCustomerContact({ name: '', phone: '123' }).name);
});

test('one normalized customer payload supports backend customer and manual WhatsApp sharing', () => {
  const payload = toCustomerFormPayload({
    name: '  Test Person ', phone: '9876543210', email: '  test@example.com ',
    customerType: 'Business / Company', companyName: ' Fleet Co ',
    gstNo: ' 32abcxy1234z1z2 ', city: 'Kochi', branch: 'branch-1',
  });
  assert.equal(payload.phone, '+919876543210');
  assert.equal(payload.customerType, 'business');
  assert.equal(payload.gstin, '32ABCXY1234Z1Z2');
  assert.equal(payload.branch, 'branch-1');
  assert.equal(payload.name, 'Test Person');
  assert.equal(Object.hasOwn(payload, 'whatsapp'), false);
  const individual = toCustomerFormPayload({
    ...payload, customerType: 'individual', companyName: 'Old Co', gstNo: '32TEST',
  });
  assert.equal(individual.companyName, '');
  assert.equal(individual.gstin, '');
  assert.equal(Object.hasOwn(toCustomerFormPayload({
    name: 'Client', phone: '+919876543210',
  }), 'branch'), false);
});

test('types stay consistent across legacy individual, fleet and company labels', () => {
  assert.equal(normalizeCustomerType('individual'), 'Individual');
  assert.equal(normalizeCustomerType('Company/Fleet'), 'Business / Company');
  assert.equal(normalizeCustomerType('business'), 'Business / Company');
});

test('all four workshop customer editors share one form; no duplicate WhatsApp inputs', () => {
  const files = [
    '../src/pages/customers/CustomerList.jsx',
    '../src/pages/customers/AddCustomer.jsx',
    '../src/pages/customers/EditCustomer.jsx',
    '../src/pages/customers/CustomerDetails.jsx',
  ];
  for (const file of files) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(src, /<CustomerFormFields /, file);
    assert.doesNotMatch(src, /label="WhatsApp Number"/, file);
  }
  const fields = readFileSync(new URL(
    '../src/components/customers/CustomerFormFields.jsx', import.meta.url), 'utf8');
  assert.match(fields, /<CountryPhoneField label="Phone Number"/);
  assert.doesNotMatch(fields, /WhatsApp Number"/);
});

test('job quick-add shares the phone field and handles matching customers safely', () => {
  const src = readFileSync(new URL(
    '../src/components/jobs/JobCustomerPicker.jsx', import.meta.url), 'utf8');
  assert.match(src, /<CountryPhoneField label="Phone Number"/);
  assert.match(src, /if \(dupe\?\.id\)/);
  assert.doesNotMatch(src, /<PhoneInput/);
});

test('single saved phone number is authoritative for calls and manual WhatsApp', async () => {
  const { customerContactLinks } = await import('../src/components/jobs/customerContact.utils.js');
  const links = customerContactLinks({
    customerPhone: '+919876543210',
    customerWhatsapp: '+919000000000',
  });
  assert.equal(links.callUrl, 'tel:+919876543210');
  assert.equal(links.whatsappUrl, 'https://wa.me/919876543210');
  // A historical WhatsApp contact is only a fallback when no phone exists.
  assert.equal(customerContactLinks({
    customerWhatsapp: '+919000000000',
  }).whatsappUrl, 'https://wa.me/919000000000');
});

test('shared customer forms use one phone field and standard responsive UI', () => {
  const fields = readFileSync(new URL(
    '../src/components/customers/CustomerFormFields.jsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL(
    '../src/styles/customer-unified-fields.css', import.meta.url), 'utf8');
  const directory = readFileSync(new URL(
    '../src/pages/customers/CustomerList.jsx', import.meta.url), 'utf8');
  assert.equal((fields.match(/<CountryPhoneField /g) || []).length, 1);
  assert.doesNotMatch(fields, /label=["']WhatsApp Number["']/);
  assert.match(fields, /One contact number for calls/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(directory, /<CustomerFormFields /);
  assert.doesNotMatch(directory, /Search name, phone, WhatsApp/);
});

test('customer directory keeps Save and Cancel controls in the visible modal footer', () => {
  const directory = readFileSync(new URL(
    '../src/pages/customers/CustomerList.jsx', import.meta.url), 'utf8');
  const modal = readFileSync(new URL(
    '../src/components/common/ResponsiveModalSheet.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL(
    '../src/styles/customer-workshop-form.css', import.meta.url), 'utf8');
  assert.match(directory, /footer=\{/);
  assert.match(directory, /form="cg-workshop-customer-editor"/);
  assert.match(directory, /id="cg-workshop-customer-editor"/);
  assert.match(modal, /responsive-modal-footer/);
  assert.match(css, /\.cg-workshop-customer-modal \.responsive-modal-footer/);
  assert.match(css, /flex:0 0 auto/);
  assert.match(css, /\.cg-workshop-customer-modal \.cg-customer-contact-row/);
});

test('customer create/edit removes City and State controls but preserves PIN and branch', () => {
  const fields = readFileSync(new URL('../src/components/customers/CustomerFormFields.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(fields, /<Input label="City"/);
  assert.doesNotMatch(fields, /<Input label="State"/);
  assert.match(fields, /<Input label="PIN Code"/);
  assert.match(fields, /branches.length === 1/);
  assert.match(fields, /cg-customer-branch-locked/);
  assert.match(fields, /No authorized branch available/);
  assert.doesNotMatch(fields, /Automatic branch assignment/);
});

test('staff branch assignments are explicit and limited to three', () => {
  const staffNew = readFileSync(new URL('../src/pages/staff-management/StaffAddPage.jsx', import.meta.url), 'utf8');
  const staffEditor = readFileSync(new URL('../src/components/staff-management/StaffProfileEditSheet.jsx', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/services/staff.service.js', import.meta.url), 'utf8');
  assert.match(staffNew, /Staff Branch Access \(up to 3 branches\)/);
  assert.match(staffNew, /allowedBranchIds\.length >= 3/);
  assert.match(staffEditor, /Staff Branch Access \(up to 3\)/);
  assert.match(service, /allowedBranchIds/);
});

test('customer fields use aligned accessible labels and compact branch assignment', () => {
  const fields = readFileSync(new URL('../src/components/customers/CustomerFormFields.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/styles/customer-unified-fields.css', import.meta.url), 'utf8');
  for (const component of ['Input', 'Select', 'Textarea']) {
    const source = readFileSync(new URL('../src/components/ui/' + component + '.jsx', import.meta.url), 'utf8');
    assert.match(source, /labelPosition = 'floating'/);
    assert.match(source, /className="cg-stacked-label"/);
    assert.match(source, /htmlFor=\{inputId\}/);
  }
  for (const label of ['Customer Name', 'Email Address', 'Customer Type', 'Assigned Branch']) {
    assert.ok(fields.includes('label="' + label + '" labelPosition={labelLayout}'), label);
  }
  assert.match(fields, /labelLayout = 'floating'/);
  const directory = readFileSync(new URL('../src/pages/customers/CustomerList.jsx', import.meta.url), 'utf8');
  assert.match(directory, /<CustomerFormFields values=\{customerFormValues\} labelLayout="above"/);
  assert.match(fields, /cg-customer-branch-assignment/);
  assert.match(fields, /cg-customer-address-row/);
  assert.match(css, /grid-template-columns:minmax\(0,1\.6fr\)/);
  assert.match(css, /cg-customer-unified-fields \.cg-customer-branch-locked/);
});
