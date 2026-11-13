import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAttendanceTime, formatAttendanceDateTimeParts } from '../src/utils/attendanceTime.js';

test('renders an ISO punch timestamp as readable AM/PM, not raw ISO', () => {
  const raw = '2026-11-13T14:07:25.442313+05:30';
  const expected = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(raw));
  assert.equal(formatAttendanceTime(raw), expected);
  assert.doesNotMatch(formatAttendanceTime(raw), /2026-|T14:|\\.442313/);
});
test('converts legacy time-only clock values', () => {
  assert.equal(formatAttendanceTime('14:07:25'), '02:07 PM');
  assert.equal(formatAttendanceTime('09:05'), '09:05 AM');
  assert.equal(formatAttendanceTime('00:00'), '12:00 AM');
  assert.equal(formatAttendanceTime('12:00'), '12:00 PM');
});
test('retains formatted times, missing values and unknown data', () => {
  assert.equal(formatAttendanceTime('6:00 pm'), '06:00 PM');
  assert.equal(formatAttendanceTime(null), '—');
  assert.equal(formatAttendanceTime('Missing'), 'Missing');
  assert.equal(formatAttendanceTime('not-a-time'), 'not-a-time');
});

test('report clock renders readable local time and matching local date', () => {
  const checkIn = '2026-11-13T09:03:39.479816Z';
  const checkOut = '2026-11-13T09:05:49.681305Z';
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  for (const raw of [checkIn, checkOut]) {
    const parts = formatAttendanceDateTimeParts(raw);
    assert.equal(parts.time, formatAttendanceTime(raw));
    assert.equal(parts.date, formatter.format(new Date(raw)));
    assert.doesNotMatch(parts.time, /2026-|T09:|Z$/);
    assert.doesNotMatch(parts.date, /T09:|Z$/);
  }
});

test('report clock supports legacy time-only data and an explicit date', () => {
  assert.deepEqual(formatAttendanceDateTimeParts('14:07:25', '2026-11-13'), {
    time: '02:07 PM', date: '13 Nov 2026',
  });
  assert.deepEqual(formatAttendanceDateTimeParts('09:05', '2026-11-13'), {
    time: '09:05 AM', date: '13 Nov 2026',
  });
  assert.deepEqual(formatAttendanceDateTimeParts(null, '2026-11-13'), {
    time: '—', date: '',
  });
  assert.deepEqual(formatAttendanceDateTimeParts('09:05', '2026-02-30'), {
    time: '09:05 AM', date: '',
  });
});

test('report clock derives overnight date from the full timestamp, not row date', () => {
  const raw = '2026-11-13T23:55:00Z';
  const expectedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(raw));
  assert.equal(formatAttendanceDateTimeParts(raw, '2026-11-13').date, expectedDate);
});
