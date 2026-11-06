import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildStaffWhatsAppUrl, copyManualStaffInvite } from '../src/utils/staffManualInvite.js';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const editor = read('src/components/staff-management/StaffProfileEditSheet.jsx');
const add = read('src/pages/staff-management/StaffAddPage.jsx');
const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');

test('manual WhatsApp URL preserves actual E.164 destination and full 24h message', () => {
  const url = new URL(buildStaffWhatsAppUrl({
    phone: '+91 98765 43210',
    workshopName: 'Garage One',
    staffName: 'New Mechanic',
    setupLink: 'https://workshop.example/set-password/one-use-token',
  }));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/919876543210');
  const message = url.searchParams.get('text');
  assert.match(message, /Workshop: Garage One/);
  assert.match(message, /Name: New Mechanic/);
  assert.match(message, /Login Mobile: \+919876543210/);
  assert.match(message, /24 hours/);
  assert.match(message, /https:\/\/workshop\.example\/set-password\/one-use-token/);
  assert.doesNotMatch(message, /OTP|default password|Email/);
});

test('manual copy returns metadata only, never exposes setup bearer capability in response', async () => {
  const original = globalThis.navigator;
  let copied = '';
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async (text) => { copied = text; } } },
  });
  try {
    const result = await copyManualStaffInvite(
      async () => ({ whatsappInviteStatus: 'manual', setupLink: 'https://workshop.example/set-password/token123', expiresAt: 'tomorrow' }),
      { phone: '+919876543210', staffName: 'Staff', workshopName: 'Garage One' },
    );
    assert.equal(result.status, 'copied');
    assert.equal(result.expiresAt, 'tomorrow');
    assert.equal(JSON.stringify(result).includes('token123'), false);
    assert.match(copied, /set-password\/token123/);
  } finally {
    if (original === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, 'navigator', { configurable: true, value: original });
  }
});

test('refuse to copy when provider says invitation was auto-sent, not manual', async () => {
  await assert.rejects(
    () => copyManualStaffInvite(
      async () => ({ whatsappInviteStatus: 'queued', setupLink: 'https://workshop.example/set-password/token123' }),
      { phone: '+919876543210' },
    ),
    /not ready/,
  );
});

test('Edit Staff hides legacy contact fields without patching them to empty strings', () => {
  assert.doesNotMatch(editor, /<label>Emergency Contact|<label className="is-wide">Address|<label className="is-wide">Notes/);
  assert.match(editor, /!\['email', 'designation', 'emergencyContact', 'address', 'notes'\]\.includes\(key\)/);
  assert.match(editor, /showFormFieldError\(formRef\.current, 'phone'/);
  assert.match(editor, /showFormFieldError\(formRef\.current, 'role'/);
});

test('Share and Resend allow authorized copy fallback and preserve manual send semantics', () => {
  assert.match(add, /copyManualStaffInvite/);
  assert.match(add, /Copy Setup Message/);
  assert.match(profile, /copyManualStaffInvite/);
  assert.match(profile, /Resend via WhatsApp/);
  assert.match(profile, /Copy Setup Message/);
  assert.match(add, /Paste it only into the registered staff WhatsApp chat and press Send manually/);
});
