import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Workshop location supports place-name search with selectable results', () => {
  const page = read('src/pages/attendance-manager/RulesSettings.jsx');
  const search = read('src/components/attendance-manager/WorkshopPlaceSearch.jsx');
  assert.match(page, /<WorkshopPlaceSearch/);
  assert.match(page, /workshopLocationName: name/);
  assert.match(page, /workshopLatitude: latitude/);
  assert.match(page, /workshopLongitude: longitude/);
  assert.match(page, /workshopLocationName: ''/);
  assert.match(page, /Advanced: Edit coordinates manually/);
  assert.match(page, /attendanceManagerService\.saveRules\(rules\)/);
  assert.match(search, /Workshop Location \/ Place/);
  assert.match(search, /Search Place/);
  assert.match(search, /results\.map\(\(place\) =>/);
  assert.match(search, /onSelect\(place\)/);
  assert.match(search, /View on Map/);
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

test('Original punch geofence and GPS controls remain unchanged', () => {
  const page = read('src/pages/attendance-manager/RulesSettings.jsx');
  const service = read('src/services/attendance.service.js');
  assert.match(page, /Only Within Workshop Radius/);
  assert.match(page, /Use Current Location/);
  assert.match(page, /Allowed Punch Radius \(metres\)/);
  assert.match(page, /workshopLatitude: Number\(coords\.latitude\.toFixed\(7\)\)/);
  assert.match(service, /getBrowserLocation\(locationMandatory\)/);
  assert.match(service, /apiClient\.post\('\/attendance\/toggle'/);
});
