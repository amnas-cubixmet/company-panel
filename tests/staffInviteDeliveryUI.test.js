import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { staffInviteDeliveryMessage } from '../src/utils/staffInviteDelivery.js';

const add = readFileSync(new URL('../src/pages/staff-management/StaffAddPage.jsx', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/pages/staff-management/staff/StaffProfile.jsx', import.meta.url), 'utf8');
const forgot = readFileSync(new URL('../src/pages/auth/ForgotPassword.jsx', import.meta.url), 'utf8');

test('staff creation has confirmed green success and no bearer token kept in state', () => {
  assert.match(add, /Staff Created Successfully/);
  assert.match(add, /unusedBearerLink/);
  assert.match(add, /createdStaff\.whatsappInviteStatus/);
});

test('staff profile retains manual WhatsApp resend without the verbose setup panel', () => {
  assert.match(profile, /shareManualStaffInvite\(/);
  assert.match(profile, /staffService\.sendLoginInvite\(staff\.id\)/);
  assert.match(profile, /Resend via WhatsApp/);
  assert.doesNotMatch(profile, /Copy Secure Setup Link|Staff mobile login invitation|Mobile \+ Password Login/);
  assert.doesNotMatch(profile, /showToast\('Login invite sent by email\.'\)/);
});

test('WhatsApp provider acceptance is distinct from delivery and failed messages allow recovery', () => {
  assert.match(staffInviteDeliveryMessage('sent'), /not yet confirmed/);
  assert.match(staffInviteDeliveryMessage('delivered'), /delivered/);
  assert.match(staffInviteDeliveryMessage('failed'), /Do not create the staff again/);
  assert.equal(staffInviteDeliveryMessage(undefined), '');
});

test('recovery page avoids account enumeration but still shows format errors inline', () => {
  assert.match(forgot, /For a staff account, ask your workshop administrator/);
  assert.match(forgot, /mobile: backend\.mobile/);
  assert.match(forgot, /workshop: backend\.workshop/);
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
