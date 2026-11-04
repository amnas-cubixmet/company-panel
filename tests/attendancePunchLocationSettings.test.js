import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('attendance rules have configurable workshop punch location and radius', () => {
  const rules = read('src/pages/attendance-manager/RulesSettings.jsx');
  for (const field of ['punchLocationMode', 'workshopLatitude', 'workshopLongitude', 'punchRadiusMeters']) {
    assert.ok(rules.includes(field), field);
  }
  assert.match(rules, /<option value="anywhere">Allow Punch Anywhere<\/option>/);
  assert.match(rules, /<option value="workshop">Only Within Workshop Radius<\/option>/);
  assert.match(rules, /Use Current Location/);
  assert.match(rules, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(rules, /min="50" max="5000"/);
  assert.match(rules, /setRules\(\(current\) =>/);
  assert.match(rules, /attendanceManagerService\.saveRules\(rules\)/);
  assert.match(rules, /locationRequired: mode === 'workshop'/);
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

test('new geofence controls have consistent mobile accessibility styling', () => {
  const css = read('src/styles/attendance-manager-pages.css');
  assert.match(css, /\.attendance-punch-location-settings/);
  assert.match(css, /min-height:44px/);
  const rule = read('src/pages/attendance-manager/RulesSettings.jsx');
  assert.match(rule, /disabled=\{rules\.punchLocationMode === 'workshop'\}/);
  assert.match(rule, /disabled=\{!rules\.locationTrackingEnabled \|\| rules\.punchLocationMode === 'workshop'\}/);
});
