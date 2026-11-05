import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const shell = read('src/pages/attendance/AttendanceManager.jsx');
const header = read('src/components/attendance-manager/AttendanceManagerHeader.jsx');
const tabs = read('src/components/attendance-manager/AttendanceManagerTabs.jsx');
const stats = read('src/components/attendance-manager/AttendanceStats.jsx');
const overview = read('src/pages/attendance-manager/Overview.jsx');
const daily = read('src/pages/attendance-manager/DailyAttendance.jsx');
const calendar = read('src/pages/attendance-manager/MonthlyCalendar.jsx');
const leave = read('src/pages/attendance-manager/LeaveRequestsManager.jsx');
const shifts = read('src/pages/attendance-manager/Shifts.jsx');
const reports = read('src/pages/attendance-manager/AttendanceReports.jsx');
const rules = read('src/pages/attendance-manager/RulesSettings.jsx');
const css = read('src/styles/attendance-manager-compact.css');

test('all seven routes remain available with shared scoped presentation', () => {
  const pages = [['overview','AttendanceOverview'],['daily','DailyAttendance'],
    ['calendar','MonthlyAttendanceCalendar'],['leave-requests','LeaveRequestsManager'],
    ['shifts','ShiftSettings'],['reports','AttendanceReports'],['rules','RulesSettings']];
  for (const [route, component] of pages) {
    assert.ok(shell.includes("activeTab === '"+route+"' && <"+component), route);
    assert.ok(tabs.includes('/attendance-manager/'+route), route);
  }
  assert.match(shell,/attendance-manager-readable\.css';\s*import '..\/..\/styles\/attendance-manager-compact\.css'/);
  assert.match(header, /<h1>Attendance Manager<\/h1>/);
  assert.match(header, /hasPermission\(user, 'payroll\.view'\)/);
  assert.match(tabs, /aria-current=\{activeTab === id \? 'page' : undefined\}/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /min-height:44px/);
  assert.doesNotMatch(css, /\.attendance-rules-page p\s*\{[^}]*display:none/);
});

test('overview displays real six KPIs and leaves productivity information accessible', () => {
  for (const label of ['Total Staff','Present','Absent','Late','On Leave','Pending Approvals']) {
    assert.ok(stats.includes(label), label);
  }
  assert.match(overview, /attendanceManagerService\.getTeamAttendance\(\)/);
  assert.match(overview, /attendanceManagerService\.getApprovals\(\)/);
  assert.match(overview, /pending=\{pending\}/);
  assert.match(overview, /if \(error\)/);
  const panel = read('src/components/attendance-manager/ProductivityPanel.jsx');
  assert.match(panel, /Staff Attendance/);
  assert.match(panel, /Productivity details/);
});

test('daily correction workflow remains intact and date filter belongs to common toolbar', () => {
  assert.match(daily, /am-filter-card/);
  assert.match(daily, /aria-label="Attendance date"/);
  assert.match(daily, /aria-label="Filter by branch"/);
  assert.match(daily, /aria-label="Filter by attendance status"/);
  assert.match(daily, /attendanceManagerService\.updateTeamAttendance\(/);
  assert.match(daily, /am-daily-mobile-list/);
  assert.match(css, /\.am-staff-attendance-row/);
});

test('calendar preserves month filtering with disabled future navigation', () => {
  assert.match(calendar,/getMonthlyCalendar\(month, year\)/);
  assert.match(calendar,/isFutureMonth/);
  assert.match(calendar,/disabled=\{isFutureMonth\(year, month \+ 1\)\}/);
  assert.match(calendar,/am-calendar-scroll/);
  assert.match(calendar,/Filter by branch/);
  assert.match(calendar,/LT: 'am-day--late'/);
  assert.match(css,/\.am-calendar-month-controls > label select/);
});

test('leave filters do not change protected approval logic', () => {
  assert.match(leave,/\['All', 'Pending', 'Approved', 'Rejected'\]/);
  assert.match(leave,/visibleRequests\.map/);
  assert.match(leave,/View Details/);
  assert.match(leave,/item\.canReview === false/);
  assert.match(leave,/Rejection reason is required/);
  assert.match(leave,/attendanceManagerService\.updateApprovalStatus\(/);
});

test('shifts preserve save and assign endpoints', () => {
  assert.match(shifts, /attendanceManagerService\.saveShift\(/);
  assert.match(shifts, /attendanceManagerService\.assignShift\(/);
  assert.match(shifts, /Active Shift/);
  assert.match(shifts, /Assign Shift/);
});

test('reports expose live-data filters and CSV export without fake totals', () => {
  assert.match(reports, /attendanceManagerService\.getTeamAttendance\(\)/);
  assert.match(reports, /Filter report by branch/);
  assert.match(reports, /Filter report by employee/);
  assert.match(reports, /hasRecordDates/);
  assert.match(reports, /am-report-mobile-list/);
  assert.match(reports, /const exportCsv = \(\) =>/);
  assert.match(reports, /loading \|\| error \? '—'/);
  assert.match(css, /\.am-report-table \{display:none\}/);
});

test('rules preserve mode, GPS, approval and holiday API guards', () => {
  const modes = read('src/components/attendance-manager/AttendanceModeSelector.jsx');
  for (const mode of ["'single'","'multi'","'auto_checkout'","'hybrid'"]) {
    assert.ok(modes.includes(mode), mode);
  }
  assert.match(modes,/aria-pressed=\{selected\}/);
  assert.match(rules,/const multiMode = rules\.attendanceMode === 'multi'/);
  assert.match(rules,/const autoMode = \['auto_checkout', 'hybrid'\]/);
  assert.match(rules,/navigator\.geolocation\.getCurrentPosition/);
  assert.match(rules,/punchRadiusMeters/);
  assert.match(rules,/attendanceManagerService\.saveRules\(rules\)/);
  assert.match(rules,/correctionApproval/);
  assert.match(rules,/allowSelfApproval/);
  assert.match(rules,/await appConfirm\('Delete this company holiday\?'/);
  assert.match(rules,/attendanceManagerService\.deleteHoliday\(id\)/);
  assert.match(rules,/attendance-rule-disclosure/);
});

test('mobile and light/dark designs are scoped to existing tokens', () => {
  assert.match(css,/var\(--primary\)/);
  assert.match(css,/var\(--surface\)/);
  assert.match(css,/var\(--border\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/@media\(max-width:360px\)/);
});
