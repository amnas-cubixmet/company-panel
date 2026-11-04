import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { staffInviteDeliveryMessage } from '../src/utils/staffInviteDelivery.js';

const add = readFileSync(new URL('../src/pages/staff-management/StaffAddPage.jsx', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/pages/staff-management/staff/StaffProfile.jsx', import.meta.url), 'utf8');
const forgot = readFileSync(new URL('../src/pages/auth/ForgotPassword.jsx', import.meta.url), 'utf8');

test('staff creation forwards actual delivery status to staff profile', () => {
  assert.match(add, /created\?\.emailDeliveryStatus/);
  assert.match(profile, /staffInviteDeliveryMessage\(location\.state\?\.emailDeliveryStatus\)/);
});

test('staff profile resend reports server status instead of claiming a sent email', () => {
  assert.match(profile, /const result = await staffService\.sendLoginInvite\(staff\.id\)/);
  assert.match(profile, /result\?\.whatsappInviteStatus/);
  assert.match(profile, /result\?\.setupLink/);
  assert.match(profile, /Copy Setup Link/);
  assert.doesNotMatch(profile, /showToast\('Login invite sent by email\.'\)/);
});

test('console and failed statuses tell admin how to recover without duplicate staff', () => {
  assert.match(staffInviteDeliveryMessage('console_only'), /Django terminal/);
  assert.match(staffInviteDeliveryMessage('failed'), /Do not create the staff again/);
  assert.match(staffInviteDeliveryMessage('submitted'), /email provider/);
  assert.equal(staffInviteDeliveryMessage(undefined), '');
});

test('recovery page avoids account enumeration but still shows format errors inline', () => {
  assert.match(forgot, /If an eligible account exists, password reset instructions will be sent/);
  assert.match(forgot, /setFieldError\(backend\.email \|\| ''\)/);
  assert.match(forgot, /setMessage\(backend\.email \? '' :/);
  assert.match(forgot, /auth-field-error/);
});

test('invite failures show DRF field messages in a persistent dismissible alert', async () => {
  const { staffInviteErrorMessage } = await import('../src/utils/staffInviteDelivery.js');
  assert.equal(staffInviteErrorMessage({ data: { role: ['A valid staff role is required.'] } }), 'A valid staff role is required.');
  assert.equal(staffInviteErrorMessage({ response: { data: { status: ['Activate this employee before sending a login invitation.'] } } }), 'Activate this employee before sending a login invitation.');
  assert.equal(staffInviteErrorMessage({ data: { errors: { email: ['Add an email.'] } } }), 'Add an email.');
  assert.equal(staffInviteErrorMessage(new Error('Network Error')), 'Network Error');
  assert.equal(staffInviteErrorMessage({}), 'Unable to send invite. Please try again.');
  assert.match(profile, /setInviteError\(staffInviteErrorMessage\(requestError\)\)/);
  assert.match(profile, /inviteError &&[\s\S]*?role="alert"/);
  assert.match(profile, /aria-label="Dismiss invite error"/);
});
