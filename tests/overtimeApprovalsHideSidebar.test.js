import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const layout = read('src/components/layout/DashboardLayout.jsx');
const menu = read('src/routes/routeConfig.js');
const desktop = read('src/components/layout/Sidebar.jsx');
const mobile = read('src/components/layout/MobileSlideSidebar.jsx');
const bottom = read('src/components/layout/MobileBottomNav.jsx');
const css = read('src/pages/payroll/daily-wage-compact.css');
const page = read('src/pages/payroll/OvertimeApprovalPage.jsx');
const wageTabs = read('src/pages/payroll/DailyWagePage.jsx');
const routes = read('src/routes/AppRoutes.jsx');

test('Overtime route retains the normal desktop left sidebar', () => {
  assert.match(layout, /<div className="app-shell">/);
  assert.match(layout, /<Sidebar \/>/);
  assert.doesNotMatch(layout, /!isOvertimeApprovals|is-overtime-full-width/);
  assert.doesNotMatch(css, /is-overtime-full-width/);
  assert.match(layout, /<Header \/>/);
  assert.match(layout, /<AppBreadcrumbs \/>/);
  assert.match(layout, /<MobileBottomNav \/>/);
});

test('remove only standalone Overtime sidebar menu, keep Payroll menu', () => {
  assert.doesNotMatch(menu, /id: 'overtime-approvals'/);
  assert.doesNotMatch(menu, /label: 'Overtime Approval'/);
  assert.match(menu, /id: 'payroll', label: 'Payroll', path: '\/payroll'/);
  assert.match(desktop, /routeConfig\.filter\(/);
  assert.match(desktop, /to=\{route\.path\}/);
  assert.match(mobile, /visibleRoutes\.filter\(/);
  assert.match(mobile, /to=\{route\.path\}/);
  assert.match(bottom, /routeConfig\.filter\(/);
});

test('Overtime route remains accessible from Payroll tabs with original approval logic', () => {
  assert.match(routes, /path="\/payroll\/daily-wages\/overtime-approvals" element=\{<OvertimeApprovalPage \/>\}/);
  assert.match(wageTabs, /\['overtime', 'Overtime Approval', '\/payroll\/daily-wages\/overtime-approvals'/);
  assert.match(page, /<DailyWageNav selected="overtime"\/>/);
  assert.match(page, /can\('attendance\.overtime\.approve'\)/);
  assert.match(page, /attendanceManagerService\.updateApprovalStatus\(/);
});
