import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStaffWhatsAppUrl } from '../src/utils/staffManualInvite.js';

const valid = {
  phone: '+91 98765 43210', staffName: 'Saifudheen', workshopName: 'Turbo Cars',
  setupLink: 'https://panel.cubixgear.example/set-password/secure.sample'
};

test('manual WhatsApp draft has international digits and encoded private setup URL', () => {
  const url = new URL(buildStaffWhatsAppUrl(valid));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/919876543210');
  assert.match(url.searchParams.get('text'), /Saifudheen/);
  assert.match(url.searchParams.get('text'), /Turbo Cars/);
  assert.match(url.searchParams.get('text'), /https:\/\/panel.cubixgear.example\/set-password/);
});

test('rejects invalid phone and missing private setup link', () => {
  assert.throws(() => buildStaffWhatsAppUrl({...valid, phone: '9876543210'}));
  assert.throws(() => buildStaffWhatsAppUrl({...valid, setupLink: ''}));
  assert.throws(() => buildStaffWhatsAppUrl({...valid, setupLink: 'http://example.com/set-password/token'}));
  assert.throws(() => buildStaffWhatsAppUrl({...valid, setupLink: 'https://evil.test/path'}));
});
