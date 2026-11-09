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

test('attendance personal salary history has its own route, private API, and read-only view', () => {
  const routes = source('src/routes/AppRoutes.jsx');
  const tabs = source('src/components/my-attendance/MyAttendanceTabs.jsx');
  const page = source('src/pages/attendance/MyAttendance.jsx');
  const service = source('src/services/attendance.service.js');
  const salary = source('src/pages/my-attendance/MySalaryPayments.jsx');
  assert.match(routes, /path="\/my-attendance\/salary" element=\{<MyAttendance \/>\}/);
  assert.match(tabs, /id: 'salary', label: 'My Salary'/);
  assert.match(page, /activeTab === 'salary' && <MySalaryPayments \/>/);
  assert.match(service, /apiClient\.get\('\/my-attendance\/salary'\)/);
  assert.doesNotMatch(service, /employeeId|staffId/);
  assert.match(salary, /Read-only payment history/);
  assert.match(salary, /No salary payments have been recorded yet/);
  assert.doesNotMatch(salary, /apiClient\.post|payroll\.payments\.record/);
});
