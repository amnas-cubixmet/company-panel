import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const auth = read('../src/context/AuthContext.jsx');
const login = read('../src/pages/auth/Login.jsx');
const forgot = read('../src/pages/auth/ForgotPassword.jsx');
const recovery = read('../src/services/authRecovery.service.js');

test('login always checks Django and does not accept mock user or hardcoded tokens', () => {
  assert.match(auth, /apiClient\.post\('\/auth\/login', credentials\)/);
  assert.match(auth, /apiClient\.get\('\/auth\/me'\)/);
  assert.doesNotMatch(auth, /MOCK_USER|mock_jwt_token_2026|if \(USE_MOCK_API\)/);
  assert.match(auth, /isMockMode: false/);
});

test('forgot, magic, reset and password setup only use real Django endpoints', () => {
  for (const endpoint of [
    '/auth/forgot-password', '/auth/magic-link',
    '/auth/setup-password', '/auth/reset-password',
    '/auth/magic-link/verify', '/auth/change-password'
  ]) assert.ok(recovery.includes(endpoint), endpoint);
  assert.doesNotMatch(recovery, /USE_MOCK_API|mock-password|mock-magic|previewUrl/);
});

test('recovery validates WhatsApp mobile and workshop inline without disclosing accounts', () => {
  assert.match(forgot, /mobile: backend\.mobile/);
  assert.match(forgot, /workshop: backend\.workshop/);
  assert.match(forgot, /aria-invalid=\{Boolean\(fieldErrors\.mobile\)\}/);
  assert.match(forgot, /aria-invalid=\{Boolean\(fieldErrors\.workshop\)\}/);
  assert.match(forgot, /auth-field-error.*role="alert"/);
  assert.doesNotMatch(forgot, /same confirmation whether an email is registered or not/);
});

test('failed login never redirects and includes inline mobile-or-email/password errors', () => {
  assert.match(login, /await login\(\{ identifier: identity/);
  assert.match(login, /catch \(error\)/);
  assert.match(login, /setFieldErrors\(/);
  assert.match(login, /aria-invalid=\{Boolean\(fieldErrors\.identifier\)\}/);
  assert.match(login, /aria-invalid=\{Boolean\(fieldErrors\.password\)\}/);
});
