import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStaffWhatsAppUrl, shareManualStaffInvite } from '../src/utils/staffManualInvite.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('manual WhatsApp reset message uses server-issued one-time reset link', () => {
  const share = buildStaffWhatsAppUrl({
    phone: '+919876543210',
    staffName: 'Mechanic A',
    workshopName: 'Workshop A',
    purpose: 'reset',
    setupLink: 'https://panel.example.test/set-password/secure.reset',
  });
  const parsed = new URL(share);
  const message = parsed.searchParams.get('text');
  assert.equal(parsed.hostname, 'wa.me');
  assert.match(message, /cubixgear · Staff Password Reset/);
  assert.match(message, /Reset your password/);
  assert.match(message, /secure\.reset/);
  assert.match(message, /valid for up to 24 hours/);
  assert.doesNotMatch(message, /Your staff account has been created/);
});

test('only manual delivery opens WhatsApp; Cloud API queue does not', async () => {
  const prev = globalThis.window;
  const calls = [];
  const popup = {
    closed: false, close() { this.closed = true; },
    location: { replace(url) { calls.push(url); } },
    opener: {},
  };
  globalThis.window = { open() { return popup; } };
  try {
    const manual = await shareManualStaffInvite(
      async () => ({
        whatsappInviteStatus: 'manual',
        purpose: 'reset',
        setupLink: 'https://panel.example.test/set-password/x.y',
      }),
      { phone: '+919876543210', staffName: 'Staff A' },
    );
    assert.equal(manual.status, 'manual_prepared');
    assert.equal(calls.length, 1);
    assert.match(decodeURIComponent(calls[0]), /Staff Password Reset/);
    calls.length = 0;
    const queued = await shareManualStaffInvite(
      async () => ({ whatsappInviteStatus: 'queued' }),
      { phone: '+919876543210' },
    );
    assert.equal(queued.status, 'queued');
    assert.equal(calls.length, 0);
    assert.equal(popup.closed, true);
  } finally {
    globalThis.window = prev;
  }
});

test('staff profile explicitly requests manual-only WhatsApp reset with role checks', () => {
  const profile = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const service = read('src/services/staff.service.js');
  assert.match(profile, /Send Reset Link via WhatsApp/);
  assert.match(profile, /Send password reset link manually via WhatsApp/);
  assert.match(profile, /manualOnly: true/);
  assert.match(profile, /replace: staff\.loginStatus === 'Active'/);
  assert.match(profile, /canManageLogin && !isOwnProfile/);
  assert.match(profile, /staff\.whatsappConsent/);
  assert.match(profile, /Account Security/);
  assert.match(service, /sendLoginInvite: async \(id, options = \{\}\)/);
  assert.match(service, /apiClient\.post\(\`\/employees\/\$\{id\}\/invite\`, options\)/);
});
