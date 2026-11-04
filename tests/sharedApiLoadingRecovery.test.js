import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Attendance Rules loads independently of optional holidays and never sticks in spinner on API errors', () => {
  const src = read('src/pages/attendance-manager/RulesSettings.jsx');
  assert.match(src, /Promise\.allSettled\(\[/);
  assert.match(src, /attendanceManagerService\.getRules\(\)/);
  assert.match(src, /attendanceManagerService\.getHolidays\(\)/);
  assert.match(src, /ruleResult\.status === 'fulfilled'/);
  assert.match(src, /holidayResult\.status === 'fulfilled'/);
  assert.match(src, /setLoadError\(/);
  assert.match(src, /setHolidayError\(/);
  assert.match(src, /finally \{\s*setLoading\(false\)/);
  assert.match(src, /Retry Loading Rules/);
  assert.match(src, /Retry Holidays/);
  assert.match(src, /role="alert"/);
  assert.match(src, /\{holidayError && \([\s\S]+?\n      \)\}/);
});

test('Dashboard never shows empty invented metrics for a failed API response', () => {
  const src = read('src/pages/dashboard/Dashboard.jsx');
  assert.match(src, /const \[error, setError\] = useState\(''\)/);
  assert.match(src, /catch \(cause\) \{\s*setData\(null\)/);
  assert.match(src, /if \(error \|\| !data\)/);
  assert.match(src, /Retry Dashboard/);
  assert.match(src, /onClick=\{fetchDashboard\}/);
});

test('auth verification distinguishes network failures from invalid credentials', () => {
  const auth = read('src/context/AuthContext.jsx');
  const route = read('src/routes/ProtectedRoute.jsx');
  assert.match(auth, /apiClient\.get\('\/auth\/me'\)/);
  assert.match(auth, /if \(\[401, 403\]\.includes\(error\?\.status\)\)/);
  assert.match(auth, /setSessionError\(/);
  assert.match(auth, /setSessionRetryKey\(/);
  assert.match(auth, /\[sessionRetryKey\]/);
  assert.match(route, /if \(sessionError\)/);
  assert.match(route, /onClick=\{retrySession\}/);
  assert.match(route, /Retry Connection/);
  assert.match(route, /if \(!isAuthenticated\)/);
});

test('temporary API errors cannot force logout after refresh or hide their actual error', () => {
  const api = read('src/api/apiClient.js');
  assert.match(api, /if \(\[400, 401, 403\]\.includes\(refreshError\?\.response\?\.status\)\)/);
  assert.match(api, /return apiClient\.request\(originalRequest\)/);
  assert.match(api, /normalized\.code = error\?\.code/);
  assert.match(api, /Could not connect to CubeGears backend/);
  assert.match(api, /The API request timed out/);
});

test('out-of-order role/entitlement responses cannot overwrite newest access data', () => {
  const src = read('src/context/FeatureAccessContext.jsx');
  assert.match(src, /const latestRequestRef = useRef\(0\)/);
  assert.match(src, /const requestId = \+\+latestRequestRef\.current/);
  assert.match(src, /if \(requestId !== latestRequestRef\.current\) return/);
  assert.match(src, /if \(requestId === latestRequestRef\.current\) setAccess/);
  assert.match(src, /if \(requestId === latestRequestRef\.current\) setLoading\(false\)/);
  assert.match(src, /setAccess\(LOCKED\)/);
});
