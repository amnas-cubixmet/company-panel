import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAttendanceTime } from '../src/utils/attendanceTime.js';

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
