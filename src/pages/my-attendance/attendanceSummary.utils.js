import { parseAttendanceLocalDate } from '../../components/my-attendance/attendance.utils.js';

const asDateKey = (date) => {
  if (!date) return '';
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

const normalizedStatus = (value) => String(value || '').trim().toLowerCase();

const numericMinutes = (value) => {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
};

const isMissingClockOut = (record, date, today) => {
  const status = normalizedStatus(record.status);
  if (status === 'missing clock out') return true;
  // An ongoing session TODAY is not a missing punch.
  if (date >= today) return false;
  const sessions = Array.isArray(record.sessions) ? record.sessions : [];
  if (sessions.length) {
    return sessions.some((session) => Boolean(session.clockIn) && !session.clockOut);
  }
  return Boolean(record.clockIn && !record.clockOut);
};

/**
 * Calculate an employee-only month summary using the existing protected Django
 * attendance/calendar/status endpoints. No seeded values or mock fallbacks.
 * The calendar API supplies approved leaves, holidays and weekly-off dates;
 * a past scheduled day without a record is treated as absent, consistently
 * with the attendance-manager calendar. Today is never assumed absent.
 */
export const buildAttendanceSummary = ({
  logs,
  events,
  attendanceStatus,
  monthDate,
  now = new Date(),
}) => {
  const joiningDate = parseAttendanceLocalDate(
    attendanceStatus?.employee?.joiningDate || attendanceStatus?.employee?.joining_date,
  );
  if (!joiningDate) {
    throw new Error('Joining date is unavailable. The monthly summary cannot be calculated safely.');
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstVisible = joiningDate > monthStart ? joiningDate : monthStart;
  const lastVisible = today < monthEnd ? today : monthEnd;

  const inRange = (date) => Boolean(date && date >= firstVisible && date <= lastVisible);
  const logByDate = new Map();
  for (const record of Array.isArray(logs) ? logs : []) {
    const date = parseAttendanceLocalDate(record?.date);
    if (inRange(date)) logByDate.set(asDateKey(date), record);
  }

  const eventByDate = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const date = parseAttendanceLocalDate(event?.date);
    if (!inRange(date)) continue;
    const key = asDateKey(date);
    // An attendance record is always authoritative over a calendar event.
    if (!eventByDate.has(key)) eventByDate.set(key, event);
  }

  const metrics = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    weeklyOffDays: 0,
    workedMinutes: 0,
    overtimeMinutes: 0,
    lateDays: 0,
    missingClockOut: 0,
  };

  for (const record of logByDate.values()) {
    metrics.workedMinutes += numericMinutes(record.totalWorkedMinutes);
    metrics.overtimeMinutes += numericMinutes(record.overtimeMinutes);
    const status = normalizedStatus(record.status);
    if (numericMinutes(record.lateMinutes) > 0 || status === 'late') {
      metrics.lateDays += 1;
    }
    const date = parseAttendanceLocalDate(record.date);
    if (isMissingClockOut(record, date, today)) metrics.missingClockOut += 1;
  }

  // Calendar-day distribution uses one classification per date, not record
  // count + event count, so a date can never be counted twice.
  if (firstVisible <= lastVisible) {
    for (
      let day = new Date(firstVisible);
      day <= lastVisible;
      day.setDate(day.getDate() + 1)
    ) {
      const key = asDateKey(day);
      const record = logByDate.get(key);
      const event = eventByDate.get(key);
      const status = normalizedStatus(record?.status || event?.status || event?.type);

      if (status.includes('holiday')) {
        metrics.holidayDays += 1;
      } else if (status.includes('weekly off') || status === 'off') {
        metrics.weeklyOffDays += 1;
      } else {
        metrics.workingDays += 1;
        if (status.includes('leave')) {
          metrics.leaveDays += 1;
        } else if (status === 'absent') {
          metrics.absentDays += 1;
        } else if (
          status === 'present' || status === 'late' ||
          status === 'half day' || status === 'missing clock out' ||
          (record && (record.clockIn || record.sessions?.some((session) => session.clockIn)))
        ) {
          metrics.presentDays += 1;
        } else if (!record && day < today) {
          // Past working day with no attendance and no approved off/leave.
          metrics.absentDays += 1;
        }
      }
    }
  }

  return {
    joiningDate,
    monthLabel: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    metrics,
    hasRecords: logByDate.size > 0,
  };
};
