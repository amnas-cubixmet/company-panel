import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acquireWorkshopLocation } from '../src/utils/attendanceGeolocation.js';

const pos = (accuracy, latitude = 11.25, longitude = 75.8) =>
  ({ coords: { accuracy, latitude, longitude } });

test('coarse first GPS fix is retried and a later precise fix is used for punch', async () => {
  const progress = [];
  let cleared = false;
  const geo = {
    watchPosition(success) {
      setTimeout(() => success(pos(550)), 1);
      setTimeout(() => success(pos(38)), 5);
      return 4;
    },
    clearWatch(id) { assert.equal(id, 4); cleared = true; },
  };
  const resolved = await acquireWorkshopLocation(geo, 100, (data) => progress.push(data), 100);
  assert.deepEqual(resolved, { latitude: 11.25, longitude: 75.8, accuracy: 38 });
  assert.deepEqual(progress, [{ accuracy: 550, radius: 100 }, { accuracy: 38, radius: 100 }]);
  assert.equal(cleared, true);
});

test('when all fixes are coarse, reject and NEVER send a fake location', async () => {
  let cleared = false;
  const geo = {
    watchPosition(success) {
      setTimeout(() => success(pos(700)), 1);
      setTimeout(() => success(pos(310)), 4);
      return 8;
    },
    clearWatch() { cleared = true; },
  };
  await assert.rejects(
    acquireWorkshopLocation(geo, 100, undefined, 20),
    (error) => error.code === 'LOCATION_ACCURACY_LOW' &&
      error.message.includes('310 m') && error.message.includes('100 m'),
  );
  assert.equal(cleared, true);
});

test('denied browser permission stops immediately with a helpful error', async () => {
  const geo = {
    watchPosition(_onSuccess, onFailure) {
      queueMicrotask(() => onFailure({ code: 1 }));
      return 2;
    },
    clearWatch() {},
  };
  await assert.rejects(
    acquireWorkshopLocation(geo, 100, undefined, 100),
    (error) => error.code === 'LOCATION_PERMISSION_DENIED',
  );
});

test('invalid radius or unsupported GPS fails closed', async () => {
  await assert.rejects(acquireWorkshopLocation({}, 100), /not supported/);
  await assert.rejects(acquireWorkshopLocation({ watchPosition() {} }, 25), /not configured correctly/);
});

test('Check In and Check Out share one precise GPS policy and an accessible retry button', () => {
  const service = readFileSync(new URL('../src/services/attendance.service.js', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/components/my-attendance/AttendancePunchPanel.jsx', import.meta.url), 'utf8');
  assert.match(service, /options\.punchLocationMode === 'workshop'/);
  assert.match(service, /await acquireWorkshopLocation\(/);
  assert.match(service, /options\.punchRadiusMeters/);
  assert.match(service, /options\.onLocationProgress/);
  assert.match(service, /return apiClient\.post\('\/attendance\/toggle'/);
  assert.match(panel, /punchRadiusMeters: state\?\.rule\?\.punchRadiusMeters/);
  assert.match(panel, /Retry with Precise GPS/);
  assert.match(panel, /Check Out not recorded/);
  assert.match(panel, /Check In not recorded/);
  assert.match(panel, /role="status" aria-live="polite"/);
  assert.match(panel, /role="alert"/);
});
