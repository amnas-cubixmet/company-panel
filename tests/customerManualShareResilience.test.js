import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('customer stale link allows regeneration without Meta configuration', () => {
  const src = read('src/components/customers/CustomerTrackingLinkPanel.jsx');
  assert.match(src, /cause\?\.status === 409/);
  assert.match(src, /Regenerate Secure Link/);
  assert.match(src, /customer-portal\/links\/\$\{customerId\}/);
  assert.match(src, /Copy Link/);
});

test('manual WhatsApp sharing opens only from a click and supports separate copy', () => {
  const src = read('src/components/common/WhatsAppManualShareButton.jsx');
  assert.match(src, /onClick=\{open\}/);
  assert.match(src, /onClick=\{copyMessage\}/);
  assert.match(src, /navigator\.clipboard\.writeText\(data\.preview\)/);
  assert.match(src, /readOnly/);
  assert.match(src, /\/whatsapp\/manual-share/);
  assert.doesNotMatch(src, /Cloud API|send_template_message|WHATSAPP_META/);
});
