import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isHtmlResponse, safeApiErrorMessage } from '../src/utils/safeApiErrorMessage.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('HTML 500 never reaches the user as markup or server internals', () => {
  const html = '<!DOCTYPE html><html><body><h1>Server Error (500)</h1><pre>Traceback</pre></body></html>';
  assert.equal(isHtmlResponse(html, 'text/html; charset=UTF-8'), true);
  const value = safeApiErrorMessage({ status: 500, payload: html, fallback: html });
  assert.doesNotMatch(value, /<|Server Error \(500\)|Traceback/);
  assert.match(value, /server.*retry/i);
});

test('API errors distinguish access denied, missing profile and expired session', () => {
  assert.match(safeApiErrorMessage({ status: 401 }), /session.*expired/i);
  assert.match(safeApiErrorMessage({ status: 403 }), /permission/i);
  assert.match(safeApiErrorMessage({ status: 404 }), /not found/i);
  assert.equal(safeApiErrorMessage({ status: 400, payload: { message: 'Bad input' } }), 'Bad input');
});

test('staff profile support data matches five data sources and keeps retry', () => {
  const page = read('src/pages/staff-management/staff/StaffProfile.jsx');
  const start = page.indexOf('const loadSupportData = async');
  const end = page.indexOf('const refreshAll = async', start);
  const support = page.slice(start, end);
  assert.ok(start >= 0);
  assert.ok(!support.includes('roleService.getAssignableRoles()'));
  for (const name of ['getTeams()', 'getShifts()', 'getSkills()', 'getDocuments()', 'getActivities(profile.id)']) {
    assert.ok(support.includes(name), name);
  }
  assert.match(page, /Retry Loading Profile/);
  assert.match(page, /setErrorStatus\(requestError\?\.status/);
  assert.match(page, /Promise\.allSettled/);
  assert.match(read('src/api/apiClient.js'), /isHtmlResponse/);
});
