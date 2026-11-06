import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const layout = read('src/components/layout/DashboardLayout.jsx');
const css = read('src/pages/payroll/daily-wage-compact.css');
const page = read('src/pages/payroll/OvertimeApprovalPage.jsx');
const routes = read('src/routes/AppRoutes.jsx');

test('only Overtime Approvals omits the desktop left sidebar', () => {
  assert.ok(layout.includes("const isOvertimeApprovals = /^\\/payroll\\/daily-wages\\/overtime-approvals\\/?$/.test(location.pathname);"));
  assert.match(layout, /!isOvertimeApprovals && <Sidebar \/>/);
  assert.match(layout, /isOvertimeApprovals \? ' is-overtime-full-width' : ''/);
  assert.match(css, /\.app-shell\.is-overtime-full-width \.app-content \{ max-width:none; min-width:0; \}/);
  assert.match(routes, /path="\/payroll\/daily-wages\/overtime-approvals"/);
});

test('header, main content, breadcrumbs, footer and mobile navigation stay present', () => {
  for (const fragment of ['<Header />', '{children}', '<MobileBottomNav />', '<AppBreadcrumbs />', '<Footer />']) {
    assert.ok(layout.includes(fragment), fragment);
  }
  assert.match(page, /<DailyWageNav selected="overtime"\/>/);
  assert.match(page, /attendanceManagerService\.updateApprovalStatus\(/);
});
