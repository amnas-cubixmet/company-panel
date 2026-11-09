import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('attendance rules read workshop punch location from owner onboarding without a second editor', () => {
  const rules = read('src/pages/attendance-manager/RulesSettings.jsx');
  for (const field of ['punchLocationMode', 'workshopLatitude', 'workshopLongitude', 'punchRadiusMeters']) {
    assert.ok(rules.includes(field), field);
  }
  assert.match(rules, /Onboarding → Main branch &amp; location/);
  assert.match(rules, /Workshop radius active/);
  assert.match(rules, /Allowed radius:/);
  assert.match(rules, /href="\/onboarding"/);
  assert.doesNotMatch(rules, /<WorkshopPlaceSearch/);
  assert.doesNotMatch(rules, /navigator\.geolocation\.getCurrentPosition/);
  assert.doesNotMatch(rules, /onChange=\{\(event\) => change\('punchRadiusMeters'/);
  assert.match(rules, /attendanceManagerService\.saveRules\(rules\)/);
});

test('employee punch follows backend location-required policy without touching timing', () => {
  const service = read('src/services/attendance.service.js');
  const punch = read('src/components/my-attendance/AttendancePunchPanel.jsx');
  assert.match(service, /punchLocationMode === 'workshop'/);
  assert.match(service, /getBrowserLocation\(locationMandatory\)/);
  assert.match(service, /if \(locationMandatory\) throw error/);
  assert.match(service, /apiClient\.post\('\/attendance\/toggle'/);
  assert.match(punch, /punchLocationMode: state\?\.rule\?\.punchLocationMode/);
  assert.match(punch, /locationRequired: Boolean\(state\?\.rule\?\.locationRequired\)/);
});

test('onboarding geofence summary has readable mobile links and no editable GPS fields', () => {
  const css = read('src/styles/attendance-manager-pages.css');
  assert.match(css, /\.attendance-location-from-onboarding/);
  assert.match(css, /\.attendance-location-readonly/);
  assert.match(css, /\.attendance-location-setup-link/);
  assert.match(css, /min-height: 44px/);
  const rule = read('src/pages/attendance-manager/RulesSettings.jsx');
  assert.match(rule, /Workshop GPS not configured/);
  assert.doesNotMatch(rule, /Advanced coordinates/);
});
