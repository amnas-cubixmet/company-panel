import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAttendanceSummary } from '../src/pages/my-attendance/attendanceSummary.utils.js';

const employee = { employee: { joiningDate: '2026-11-01' } };
const november = new Date(2026, 10, 1);
const nov4 = new Date(2026, 10, 4);

test('summary uses only backend attendance and calendar rows', () => {
  const result = buildAttendanceSummary({
    monthDate: november,
    now: nov4,
    attendanceStatus: employee,
    logs: [
      { date: '2026-11-02', status: 'Present', totalWorkedMinutes: 480, overtimeMinutes: 60 },
      { date: '2026-11-03', status: 'Missing Clock Out', totalWorkedMinutes: 210, lateMinutes: 12,
        sessions: [{ clockIn: '2026-11-03T09:00:00', clockOut: null }] },
    ],
    events: [
      { date: '2026-11-01', type: 'Weekly Off', status: 'Weekly Off' },
      { date: '2026-11-02', type: 'Attendance', status: 'Present' },
      { date: '2026-11-03', type: 'Attendance', status: 'Missing Clock Out' },
    ],
  });
  assert.equal(result.metrics.presentDays, 2);
  assert.equal(result.metrics.absentDays, 0);
  assert.equal(result.metrics.weeklyOffDays, 1);
  assert.equal(result.metrics.workingDays, 3);
  assert.equal(result.metrics.workedMinutes, 690);
  assert.equal(result.metrics.overtimeMinutes, 60);
  assert.equal(result.metrics.lateDays, 1);
  assert.equal(result.metrics.missingClockOut, 1);
  assert.equal(result.hasRecords, true);
});

test('previous scheduled days without a record count absent, not today or future days', () => {
  const result = buildAttendanceSummary({
    monthDate: november, now: nov4, attendanceStatus: employee,
    logs: [],
    events: [{ date: '2026-11-01', type: 'Weekly Off', status: 'Weekly Off' }],
  });
  assert.equal(result.metrics.absentDays, 2); // Nov 2 and Nov 3 only
  assert.equal(result.metrics.presentDays, 0);
  assert.equal(result.metrics.workingDays, 3);
  assert.equal(result.metrics.weeklyOffDays, 1);
  assert.equal(result.hasRecords, false);
});

test('joining date prevents inventing attendance for pre-employment days', () => {
  const result = buildAttendanceSummary({
    monthDate: november, now: nov4,
    attendanceStatus: { employee: { joining_date: '2026-11-03' } },
    logs: [], events: [],
  });
  assert.equal(result.metrics.workingDays, 2);
  assert.equal(result.metrics.absentDays, 1);
});

test('missing employee joining date is an explicit error, never fabricated zero totals', () => {
  assert.throws(
    () => buildAttendanceSummary({
      monthDate: november, now: nov4,
      attendanceStatus: { employee: {} }, logs: [], events: [],
    }),
    /Joining date is unavailable/,
  );
});

test('current day open session is not counted as a missing clock-out', () => {
  const result = buildAttendanceSummary({
    monthDate: november, now: nov4, attendanceStatus: employee,
    events: [],
    logs: [{ date: '2026-11-04', status: 'Present',
      sessions: [{ clockIn: '2026-11-04T09:00:00', clockOut: null }] }],
  });
  assert.equal(result.metrics.missingClockOut, 0);
});

test('summary page consumes protected Django APIs and contains no fixed demo metrics', () => {
  const src = readFileSync(new URL('../src/pages/my-attendance/AttendanceSummary.jsx', import.meta.url), 'utf8');
  assert.match(src, /getPersonalAttendanceLogs/);
  assert.match(src, /getCalendarEvents/);
  assert.match(src, /getAttendanceStatus/);
  assert.match(src, /buildAttendanceSummary/);
  assert.match(src, /if \(!attendanceStatus\?\.employee\)/);
  assert.doesNotMatch(src, /'September 2026'|'176h 30m'|value: '22'|value: "22"/);
});
