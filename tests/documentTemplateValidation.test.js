import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateDocumentTemplateSettings,
  templateApiFieldErrors,
  templateErrorSummary,
} from '../src/utils/documentTemplateValidation.js';
import { optimizeDocumentLogo, MAX_SOURCE_LOGO_BYTES } from '../src/utils/optimizeDocumentLogo.js';

const source = readFileSync(new URL('../src/pages/saas/DocumentTemplates.jsx', import.meta.url), 'utf8');

test('template form highlights errors and shows exact backend field messages', () => {
  assert.match(source, /setFieldErrors\(problems\)/);
  assert.match(source, /aria-invalid=\{Boolean\(fieldErrors\.businessEmail\)\}/);
  assert.match(source, /aria-invalid=\{Boolean\(fieldErrors\.bankAccountNumber\)\}/);
  assert.match(source, /aria-invalid=\{Boolean\(fieldErrors\.customHeader\)\}/);
  assert.match(source, /template-input-error/);
  assert.match(source, /templateApiFieldErrors\(error\)/);
});

test('long template text reports precise field error', () => {
  const errors = validateDocumentTemplateSettings({
    businessName: 'X'.repeat(256),
    customFooter: 'X'.repeat(2001),
    businessAddress: 'X'.repeat(2000),
    bankAccountNumber: '0012345000',
  });
  assert.match(errors.businessName, /255/);
  assert.match(errors.customFooter, /2000/);
  assert.equal(errors.businessAddress, undefined);
  assert.equal(errors.bankAccountNumber, undefined);
});

test('invalid logo and template selection identify their own fields', () => {
  const errors = validateDocumentTemplateSettings({
    businessLogo: 'https://invalid.example/logo.png',
    invoiceTemplate: 'does-not-exist',
    accent: 'not-supported',
  });
  assert.match(errors.businessLogo, /Upload a PNG/);
  assert.match(errors.invoiceTemplate, /valid invoice template/);
  assert.match(errors.accent, /valid accent/);
});

test('Django validation messages are mapped and readable', () => {
  const errors = templateApiFieldErrors({
    data: { businessLogo: ['Logo dimensions must be at most 2048 × 2048.'], businessEmail: ['Invalid email.'] }
  });
  assert.match(errors.businessLogo, /2048/);
  assert.match(templateErrorSummary(errors), /Business Logo/);
  assert.match(templateErrorSummary(errors), /Email: Invalid email/);
});


test('new template fields stay blank and users see the logo source-size limit', () => {
  const service = readFileSync(new URL('../src/services/documentTemplates.service.js', import.meta.url), 'utf8');
  for (const key of ['businessName','businessState','businessStateCode','customName','customHeader','customFooter','termsText']) {
    assert.match(service, new RegExp(key + ": ''"));
  }
  assert.doesNotMatch(source, /PNG, JPG or WEBP, up to 250 KB/);
  assert.match(source, /under 10 MB/);
  assert.match(source, /resized and compressed before saving/);
  assert.match(source, /aria-invalid=\{Boolean\(fieldErrors\.businessLogo\)\}/);
  assert.ok(source.includes('optimizeDocumentLogo(file)'));
  assert.match(source, /preparingLogo/);
});

test('invalid template fields are focused and scrolled into view', () => {
  assert.match(source, /focusFirstTemplateError\(\)/);
  assert.match(source, /field\.scrollIntoView\(/);
  assert.match(source, /block: 'center'/);
  assert.match(source, /focusFirstTemplateError\(\);/);
});

test('oversized and non-image logos are rejected before browser decoding', async () => {
  await assert.rejects(
    optimizeDocumentLogo({ size: MAX_SOURCE_LOGO_BYTES + 1, type: 'image/jpeg' }),
    /larger than 10 MB/,
  );
  await assert.rejects(
    optimizeDocumentLogo({ size: 10, type: 'application/pdf' }),
    /Choose an image file/,
  );
});

test('document templates inherit onboarding logo and bank from backend and offer refresh', () => {
  const service = readFileSync(new URL('../src/services/documentTemplates.service.js', import.meta.url), 'utf8');
  assert.match(service, /loadDocumentTemplateSettings = async/);
  assert.match(service, /workshop_defaults: '1'/);
  for (const key of [
    'businessLogo', 'businessLegalName', 'businessGstin',
    'bankName', 'bankAccountNumber', 'bankIfsc',
  ]) {
    assert.match(service, new RegExp("'" + key + "'"));
  }
  assert.match(source, /loadDocumentTemplateSettings\(\)\.then/);
  assert.doesNotMatch(source, /settingsService\.getSettings\('company'\)/);
  assert.match(source, /loadWorkshopTemplateDetails\(\)/);
  assert.match(source, /Use latest workshop details/);
  assert.match(source, /WORKSHOP_TEMPLATE_FIELDS\.map/);
  assert.match(source, /Save Templates to keep these values/);
  assert.match(source, /showBusinessLogo: false/);
  assert.match(source, /businessLogo: value, showBusinessLogo: true/);
});
