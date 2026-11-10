import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { staffLoginStatusLabel, staffInviteDeliveryMessage } from '../src/utils/staffInviteDelivery.js';
import { buildStaffWhatsAppUrl, shareManualStaffInvite } from '../src/utils/staffManualInvite.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const add = read('src/pages/staff-management/StaffAddPage.jsx');
const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
const profileEdit = read('src/components/staff-management/StaffProfileEditSheet.jsx');
const service = read('src/services/staff.service.js');
const setup = read('src/pages/auth/StaffSetPasswordPage.jsx');
const login = read('src/pages/auth/Login.jsx');
const forgot = read('src/pages/auth/ForgotPassword.jsx');
const roleForm = read('src/components/staff-management/RoleEditorForm.jsx');
const team = read('src/components/staff-management/StaffTeamsSection.jsx');
const shift = read('src/pages/staff-management/StaffShiftCrud.jsx');
const validation = read('src/utils/formValidation.js');

test('Add Staff defaults WhatsApp consent on and selects In person for new staff', () => {
  assert.match(add, /DEFAULT_WHATSAPP_CONSENT_SOURCE = 'Staff consented in person during onboarding'/);
  assert.match(add, /whatsappConsent: true, whatsappConsentSource: DEFAULT_WHATSAPP_CONSENT_SOURCE/);
  assert.match(add, /whatsappConsent: event\.target\.checked/);
  assert.match(add, /current\.whatsappConsentSource \|\| DEFAULT_WHATSAPP_CONSENT_SOURCE/);
  assert.match(add, /setForm\(emptyStaff\(canManageLogins\)\)/);
});

test('Add Staff has only essential workshop fields and a compact consent control', () => {
  assert.match(add, /Full Name \*/);
  assert.match(add, /Mobile Number with Country Code \*/);
  assert.match(add, /Company Role \*/);
  assert.match(add, /Employment Status/);
  assert.match(add, /name="branchId"/);
  assert.match(add, /Manual WhatsApp Consent/);
  assert.doesNotMatch(add, /name="designation"|name="email"|type="email"|name="password"/);
  assert.doesNotMatch(add, /queued automatically|staff-add-summary|Send WhatsApp Invitation/);
  assert.match(add, /roleId: '', role: ''/);
  assert.match(add, /Choose role/);
  assert.match(add, /No roles available/);
  assert.match(add, /roleService\.getAssignableRoles\(\)/);
});

test('confirmed staff creation offers manual sharing but never retains a bearer token', () => {
  assert.match(add, /Staff Created Successfully/);
  assert.match(add, /createdStaff\.whatsappInviteStatus/);
  assert.match(add, /unusedBearerLink/);
  assert.match(add, /Share on WhatsApp/);
  assert.match(add, /shareManualStaffInvite\(/);
  assert.match(add, /staffService\.sendLoginInvite\(createdStaff\.id\)/);
  assert.match(add, /createdStaff\.whatsappConsent/);
  assert.match(service, /\/employees/);
  assert.doesNotMatch(add, /localStorage\.|sessionStorage\./);
});

test('manual WhatsApp message uses actual E.164 phone, workshop, staff name and one-use link', () => {
  const url = buildStaffWhatsAppUrl({
    phone: '+91 98765 43210',
    workshopName: 'Alpha Garage',
    staffName: 'Test Mechanic',
    setupLink: 'https://panel.example.com/set-password/abc.123',
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://wa.me');
  assert.equal(parsed.pathname, '/919876543210');
  const draft = parsed.searchParams.get('text');
  assert.match(draft, /Welcome to cubixgear!/);
  assert.match(draft, /Workshop: Alpha Garage/);
  assert.match(draft, /Name: Test Mechanic/);
  assert.match(draft, /Login Mobile: \+919876543210/);
  assert.match(draft, /https:\/\/panel\.example\.com\/set-password\/abc\.123/);
  assert.match(draft, /24 hours/);
  assert.doesNotMatch(draft, /default password|OTP|email/i);
  assert.throws(() => buildStaffWhatsAppUrl({
    phone: '9876543210', setupLink: 'https://panel.example.com/set-password/abc',
  }), /international/i);
  assert.throws(() => buildStaffWhatsAppUrl({
    phone: '+919876543210', setupLink: 'http://evil.example/set-password/abc',
  }), /secure/i);
});

test('only an explicit click opens WhatsApp; opening is not delivery confirmation', async () => {
  let opened = '';
  let closed = false;
  const popup = { closed: false, opener: {}, close() { closed = true; }, location: {
    replace(url) { opened = url; },
  } };
  const prior = globalThis.window;
  globalThis.window = { open() { return popup; }, location: { assign() { throw Error('unexpected fallback'); } } };
  try {
    const result = await shareManualStaffInvite(async () => ({
      whatsappInviteStatus: 'manual',
      setupLink: 'https://panel.example.com/set-password/a.b',
      expiresAt: '2026-11-07T10:00:00+05:30',
    }), { phone: '+919876543210', staffName: 'Staff', workshopName: 'Garage' });
    assert.match(opened, /^https:\/\/wa\.me\/919876543210\?/);
    assert.equal(result.status, 'manual_prepared');
    assert.equal(result.localOnlyLink, false);
    const local = await shareManualStaffInvite(async () => ({
      whatsappInviteStatus: 'manual',
      setupLink: 'http://localhost:5173/set-password/local.token',
    }), { phone: '+919876543210', staffName: 'Staff', workshopName: 'Garage' });
    assert.equal(local.localOnlyLink, true);
    assert.equal(popup.opener, null);
    assert.equal(closed, false);
    const cloud = await shareManualStaffInvite(async () => ({ whatsappInviteStatus: 'queued' }), {
      phone: '+919876543210',
    });
    assert.equal(cloud.status, 'queued');
    assert.equal(closed, true);
    // Queue acknowledgement is not delivery confirmation or a manual send.
    assert.equal(cloud.localOnlyLink, false);
  } finally {
    if (prior === undefined) delete globalThis.window;
    else globalThis.window = prior;
  }
});

test('profile manual resend retains permission checks without a visible setup panel', () => {
  assert.match(profile, /canManageLogin/);
  assert.match(profile, /staff\.whatsappConsent/);
  assert.match(profile, /shareManualStaffInvite\(/);
  assert.match(profile, /Resend via WhatsApp/);
  assert.doesNotMatch(profile, /Copy Secure Setup Link|staff-setup-link-panel|Mobile \+ Password Login/);
  assert.doesNotMatch(profile, /staffManualWhatsAppUrl|setSetupLink\(|staff-setup-url/);
  assert.match(staffInviteDeliveryMessage('manual'), /No message was sent automatically/);
});

test('WhatsApp consent remains editable without the removed information panel', () => {
  assert.match(service, /'whatsappConsent'/);
  assert.match(service, /'whatsappConsentSource'/);
  assert.match(profileEdit, /WhatsApp Consent/);
  assert.match(profileEdit, /Consent Source \*/);
  assert.match(profileEdit, /whatsappConsentSource: staff\.whatsappConsentSource/);
  assert.match(profileEdit, /showFormFieldError\(formRef\.current, 'whatsappConsentSource'/);
  assert.match(profile, /staff\.whatsappConsent/);
  assert.match(profile, /staffService\.sendLoginInvite\(staff\.id, \{/);
  assert.doesNotMatch(profile, /staff-setup-link-panel|handleRecordWhatsAppConsent|Copy Secure Setup Link/);
  assert.doesNotMatch(profile, /queue_staff_whatsapp_invitation|send_template_message/);
});

test('login and recovery remain staff mobile-first without OTP and automatic reset claims', () => {
  assert.match(setup, /confirmPassword: confirm/);
  assert.match(setup, /Set Password/);
  assert.match(setup, /navigate\('\/login\?reset=success'/);
  assert.match(login, /password/i);
  assert.match(login, /workshop/i);
  assert.match(forgot, /administrator prepares and shares/);
  assert.doesNotMatch(forgot, /sent through the registered workshop WhatsApp/);
  assert.equal(staffLoginStatusLabel('Active'), 'Login Active');
  assert.equal(staffLoginStatusLabel('Disabled'), 'Login Disabled');
  assert.equal(staffLoginStatusLabel('Pending Password Setup'), 'Pending Password Setup');
});

test('staff forms use focused field validation with accessible errors', () => {
  assert.match(add, /showFormFieldError\(/);
  assert.match(add, /showServerFormErrors\(/);
  assert.match(roleForm, /name="name"/);
  assert.match(team, /showServerFormErrors\(teamFormRef\.current/);
  assert.match(shift, /showServerFormErrors\(formRef\.current/);
  assert.match(validation, /visualFields\.indexOf/);
  assert.match(validation, /scrollIntoView\(/);
});
