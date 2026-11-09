import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Attendance location no longer duplicates the workshop place picker', () => {
  const page = read('src/pages/attendance-manager/RulesSettings.jsx');
  assert.match(page, /Onboarding → Main branch &amp; location/);
  assert.match(page, /href="\/onboarding"/);
  assert.doesNotMatch(page, /<WorkshopPlaceSearch/);
  assert.doesNotMatch(page, /Workshop Location \/ Place/);
});

test('Place geocoding is explicitly initiated and not a request-per-keystroke autocomplete', () => {
  const search = read('src/components/attendance-manager/WorkshopPlaceSearch.jsx');
  assert.match(search, /onSubmit=\{search\}/);
  assert.match(search, /const search = async \(event\)/);
  assert.match(search, /event\.preventDefault\(\)/);
  assert.match(search, /lastSearchRef\.current < 1100/);
  assert.match(search, /const CACHE_MS = 10 \* 60 \* 1000/);
  assert.match(search, /credentials: 'omit'/);
  assert.match(search, /new AbortController\(\)/);
  assert.match(search, /VITE_PLACE_SEARCH_API_URL/);
  assert.match(search, /OpenStreetMap contributors/);
  assert.match(search, /setResults\(\[\]\)/);
});

test('Self attendance still sends GPS for the server-enforced onboarding radius', () => {
  const service = read('src/services/attendance.service.js');
  const page = read('src/pages/attendance-manager/RulesSettings.jsx');
  assert.match(service, /getBrowserLocation\(locationMandatory\)/);
  assert.match(service, /apiClient\.post\('\/attendance\/toggle'/);
  assert.match(page, /Allowed radius:/);
  assert.doesNotMatch(page, /Use Current Location/);
});
