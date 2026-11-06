import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const routes = read('src/routes/AppRoutes.jsx');
const wages = read('src/pages/payroll/DailyWagePage.jsx');
const overtime = read('src/pages/payroll/OvertimeApprovalPage.jsx');
const compact = read('src/pages/payroll/daily-wage-compact.css');

test('all four payroll routes preserve backend component mappings', () => {
  for (const fragment of [
    'path="/payroll/daily-wages" element={<DailyWagePage mode="overview" />',
    'path="/payroll/daily-wages/history" element={<DailyWagePage mode="history" />',
    'path="/payroll/daily-wages/overtime-approvals" element={<OvertimeApprovalPage />',
    'path="/payroll/payments" element={<DailyWagePage mode="payments" />',
  ]) assert.ok(routes.includes(fragment), fragment);
});

test('common payroll tabs keep selected period and include four routes', () => {
  assert.match(wages,/const \{ search \} = useLocation\(\)/);
  assert.match(wages,/to=\{\`\$\{href\}\$\{search\}\`\}/);
  assert.match(wages,/aria-current=\{selected === id \? 'page' : undefined\}/);
  assert.match(wages,/ref=\{navRef\}/);
  for (const path of [
    '/payroll/daily-wages', '/payroll/daily-wages/history',
    '/payroll/daily-wages/overtime-approvals', '/payroll/payments',
  ]) assert.ok(wages.includes("'"+path+"'"));
});

test('wages/history/payments keep real company records and permissions', () => {
  assert.match(wages,/can\(mode === 'payments' \? 'payroll.payments.view' : 'payroll.view'\)/);
  assert.match(wages,/dailyWageService\.dashboard\(\)/);
  assert.match(wages,/dailyWageService\.history\(/);
  assert.match(wages,/dailyWageService\.payments\(\)/);
  assert.match(wages,/mode === 'history'/);
  assert.match(wages,/mode === 'overview'/);
  assert.match(wages,/aria-label="Filter by branch"/);
  assert.match(wages,/aria-label="Search Daily Wages"/);
  assert.match(wages,/max=\{to \|\| undefined\}/);
  assert.match(wages,/loading \|\| error \? '—' : items\.length/);
  assert.match(wages,/mode === 'overview' && <details className="dw-payroll-help">/);
});

test('overtime approval and rejection still require backend permissions, rate and reason', () => {
  assert.match(overtime,/can\('attendance.team.view'\)/);
  assert.match(overtime,/can\('attendance.overtime.approve'\)/);
  assert.match(overtime,/pendingOvertime\(/);
  assert.match(overtime,/filterOvertimeApprovals\(/);
  assert.match(overtime,/row.canReview === false/);
  assert.match(overtime,/validOvertimeRate\(rate\)/);
  assert.match(overtime,/Rejection reason is required/);
  assert.match(overtime,/await appConfirm\(/);
  assert.match(overtime,/attendanceManagerService\.updateApprovalStatus\(selected.id,decision,note.trim\(\),/);
  assert.doesNotMatch(overtime,/dailyWageService\.addExtra/);
});

test('consistent route-local light/dark and mobile payroll styling', () => {
  assert.match(wages,/import '\.\/daily-wage-compact\.css';/);
  assert.match(overtime,/import '\.\/daily-wage-compact\.css';/);
  for (const rule of [
    '.dw-page.dashboard-page .dw-nav',
    '.dw-page.dashboard-page .dw-metrics',
    '.dw-page.dashboard-page .dw-toolbar',
    '.dw-page.dashboard-page .dw-table',
    '.dw-page.dw-overtime-page .dw-overtime-filters',
    '.dw-page.dw-overtime-page .dw-overtime-list',
    '@media(max-width:767px)',
    '@media(max-width:390px)',
    'min-height:44px',
    'font-size:16px',
    'var(--surface)',
    'var(--border)',
    'var(--primary)',
  ]) assert.ok(compact.includes(rule), rule);
  assert.doesNotMatch(compact,/\.dw-page\s+p\s*\{[^}]*display:\s*none/);
});

test('payments route remains payroll wage payments, not customer invoice collections', () => {
  assert.match(routes,/path="\/payroll\/payments" element=\{<DailyWagePage mode="payments" \/>\}/);
  assert.match(routes,/path="\/payments" element=\{<PaymentList \/>\}/);
  assert.match(wages,/mode === 'history' \? 'Daily Wage History' : 'Wage Payments'/);
});
