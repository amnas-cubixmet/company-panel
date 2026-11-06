import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { staffLoginStatusLabel, staffInviteDeliveryMessage } from '../src/utils/staffInviteDelivery.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const add = read('src/pages/staff-management/StaffAddPage.jsx');
const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
const setup = read('src/pages/auth/StaffSetPasswordPage.jsx');
const login = read('src/pages/auth/Login.jsx');
const reset = read('src/pages/auth/ForgotPassword.jsx');

test('add staff stays mobile-only, compact and without a fake invitation success', () => {
  assert.match(add, /Full Name \*/);
  assert.match(add, /Mobile Number with Country Code \*/);
  assert.match(add, /Company Role \*/);
  assert.match(add, /Employment Status/);
  assert.match(add, /Enable Mobile Number \+ Password Login/);
  assert.doesNotMatch(add, /type="email"|name="email"|Email Invitation|Emergency Contact|Separate WhatsApp|Send WhatsApp Invitation/);
  assert.doesNotMatch(add, /staff-add-summary|Pending Password Setup' : 'Disabled'/);
  assert.match(add, /created\?\.whatsappInviteStatus/);
});

test('company role must be explicitly assigned before creating staff login access', () => {
  assert.match(add, /roleId: current\.roleId \|\| ''/);
  assert.match(add, /Choose role/);
  assert.match(add, /if \(!form\.roleId\)/);
  assert.doesNotMatch(add, /roleId: current\.roleId \|\| availableRoles\[0\]/);
});

test('actual backend staff login status is distinct from provider delivery status', () => {
  assert.equal(staffLoginStatusLabel('Active'), 'Login Active');
  assert.equal(staffLoginStatusLabel('Disabled'), 'Login Disabled');
  assert.equal(staffLoginStatusLabel('Pending Password Setup'), 'Pending Password Setup');
  assert.match(profile, /staffLoginStatusLabel\(staff\.loginStatus\)/);
  assert.match(profile, /staffInviteStatusLabel\(staff\.whatsappInviteStatus\)/);
  assert.match(profile, /staff\.whatsappConsentSource/);
  assert.match(staffInviteDeliveryMessage('sent'), /not yet confirmed/);
});

test('password setup is user-chosen and one-time, mobile login retains secure workshop selection', () => {
  assert.match(setup, /confirmPassword: confirm/);
  assert.match(setup, /Set Password/);
  assert.match(setup, /navigate\('\/login\?reset=success'/);
  assert.match(login, /password/i);
  assert.match(login, /workshop/i);
  assert.match(reset, /registered mobile number/i);
});

test('manual fallback stays on authorized details page without add form send button', () => {
  assert.match(add, /manual && created\?\.setupLink/);
  assert.match(profile, /\['manual', 'failed'\]\.includes\(inviteStatus\)/);
  assert.match(profile, /staff\.whatsappConsent && staffManualWhatsAppUrl/);
  assert.match(profile, /Copy Setup Link/);
  assert.match(profile, /Resend Setup Link/);
});
