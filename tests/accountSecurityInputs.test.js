import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const page = read('src/pages/account/AccountSecurity.jsx');
const styles = read('src/styles/account-security-inputs.css');
const old = read('src/styles/account-security.css');
const smoke = read('scripts/ui-smoke.mjs');

test('Change Password uses one borderless shell instead of nested colored input', () => {
  assert.match(page,/import '..\/..\/styles\/account-security\.css';\s*import '..\/..\/styles\/account-security-inputs\.css';/);
  assert.match(page,/account-security-input-row/g);
  assert.match(page,/account-security-password-input/g);
  assert.match(page,/account-security-field-icon/g);
  assert.match(page,/account-security-visibility-toggle/g);
  assert.match(styles,/\.account-security-input-row \{/);
  assert.match(styles,/border: 0 !important/);
  assert.match(styles,/background: var\(--surface-2\) !important/);
  assert.match(styles,/background: transparent !important/);
  assert.match(styles,/box-shadow: none !important/);
  assert.match(styles,/-webkit-autofill/);
  assert.match(old,/\.account-security-form/);
});
test('3 password fields have aligned 16px text, accessible visibility buttons and 50px tap targets', () => {
  for (const label of ['Current Password','New Password','Confirm New Password']) {
    assert.ok(page.includes(label),label);
  }
  assert.match(page,/const \[showConfirm, setShowConfirm\] = useState\(false\)/);
  assert.match(page,/aria-label=\{showConfirm \? "Hide confirmed password" : "Show confirmed password"\}/);
  assert.match(page,/aria-pressed=\{showConfirm\}/);
  assert.match(page,/autoComplete="current-password"/);
  assert.match(page,/autoComplete="new-password"/);
  assert.match(styles,/font-size: 16px !important/);
  assert.match(styles,/font-size: 14px !important/);
  assert.match(styles,/height: 52px !important/);
  assert.match(styles,/min-height: 44px !important/);
  assert.match(styles,/:focus-within/);
  assert.match(styles,/outline: 2px solid var\(--primary\) !important/);
  assert.match(styles,/@media \(max-width: 600px\)/);
  assert.match(smoke,/Account Security password input layout mismatch/);
});
test('Password API call and mismatch validation remain unchanged', () => {
  assert.match(page,/if \(newPassword !== confirm\) return setMessage\('New passwords do not match\.'\)/);
  assert.match(page,/await authRecoveryService\.changePassword\(\{ currentPassword, newPassword \}\)/);
  assert.match(page,/await authRecoveryService\.requestMagicLink\(user\.email\)/);
  assert.match(page,/disabled=\{loading\}/);
});
