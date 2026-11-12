import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuthErrorMessage, getAuthFieldErrors, getCredentialError } from '../src/utils/authErrors.js';
import { isHtmlResponse, safeApiErrorMessage } from '../src/utils/safeApiErrorMessage.js';

test('Django HTML and stack traces are never shown as API error messages', () => {
  assert.equal(isHtmlResponse('<html><body>django traceback</body></html>'), true);
  assert.equal(
    safeApiErrorMessage({
      status: 500, payload: '<html><body>django traceback</body></html>',
      responseType: 'text/html',
    }),
    'The server could not complete this request. Please retry or contact support.',
  );
});

test('network failures receive a human-readable message', () => {
  const message = safeApiErrorMessage({ code: 'ERR_NETWORK', fallback: 'Network Error' });
  assert.match(message, /Cannot connect/);
  assert.ok(!message.includes('Axios'));
});

test('password validation errors from DRF arrays are mapped safely', () => {
  const error = { data: { password: ['Password is too common.'] } };
  assert.deepEqual(getAuthFieldErrors(error), { password: 'Password is too common.' });
  assert.equal(getAuthErrorMessage(error), 'Password is too common.');
});

test('unknown login and incorrect password use indistinguishable error text', () => {
  const missing = { data: { non_field_errors: ['Invalid credentials or workshop selection.'] } };
  const wrong = { data: { non_field_errors: ['Invalid credentials or workshop selection.'] } };
  assert.equal(getCredentialError(missing), getCredentialError(wrong));
});

test('invalid or expired reset link responses are understandable', () => {
  const error = { data: { code: 'INVALID_RESET_LINK', message: 'This link is invalid or expired.' } };
  assert.equal(getAuthErrorMessage(error), 'This link is invalid or expired.');
});

test('unknown network failure never exposes raw markup', () => {
  assert.equal(
    safeApiErrorMessage({ payload: '<!doctype html><html>secret</html>', status: 502 }),
    'The server could not complete this request. Please retry or contact support.',
  );
});
