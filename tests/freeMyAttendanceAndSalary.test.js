import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('self attendance bypasses paid label checks only with verified self permission', () => {
  const feature = source('src/context/FeatureAccessContext.jsx');
  const account = source('src/utils/accountWorkspace.js');
  const menu = source('src/routes/routeConfig.js');
  const sidebar = source('src/components/layout/Sidebar.jsx');
  assert.match(feature, /permission === 'attendance\.self'/);
  assert.match(feature, /return access\.permissions\.includes\(permission\)/);
  assert.match(account, /access\.permissions\.includes\('attendance\.self'\)/);
  assert.match(menu, /label: 'My Attendance'[\s\S]*?permission: 'attendance\.self'/);
  assert.match(sidebar, /featureAccess\.can\(route\.permission\)/);
  assert.doesNotMatch(feature, /freeModules.*includes\('attendance'\)/);
});

test('My Salary is a card in Attendance calendar, not a separate tab', () => {
  const routes = source('src/routes/AppRoutes.jsx');
  const tabs = source('src/components/my-attendance/MyAttendanceTabs.jsx');
  const page = source('src/pages/attendance/MyAttendance.jsx');
  const calendar = source('src/pages/my-attendance/HolidayCalendar.jsx');
  const service = source('src/services/attendance.service.js');
  const salary = source('src/pages/my-attendance/MySalaryPayments.jsx');
  assert.match(routes, /path="\/my-attendance\/salary" element=\{<Navigate to="\/my-attendance\/calendar" replace \/>\}/);
  assert.doesNotMatch(tabs, /id: 'salary'|label: 'My Salary'/);
  assert.doesNotMatch(page, /activeTab === 'salary'/);
  assert.match(calendar, /<MySalaryPayments \/>/);
  assert.match(calendar, /<EmployeeAttendanceCard[\s\S]*<MySalaryPayments \/>[\s\S]*<AttendancePunchPanel/);
  assert.match(service, /apiClient\.get\('\/my-attendance\/salary'\)/);
  assert.doesNotMatch(service, /employeeId|staffId/);
  assert.match(salary, /my-salary-summary-card/);
  assert.match(salary, /Recent payments received/);
  assert.match(salary, /View payment history/);
  assert.match(salary, /aria-expanded=\{expanded\}/);
  assert.match(salary, /No salary payments have been recorded yet/);
  assert.doesNotMatch(salary, /apiClient\.post|payroll\.payments\.record/);
});
