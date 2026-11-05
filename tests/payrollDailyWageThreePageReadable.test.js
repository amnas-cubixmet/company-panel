import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page = read('src/pages/payroll/DailyWagePage.jsx');
const css = read('src/pages/payroll/daily-wage-readable.css');
const routes = read('src/routes/AppRoutes.jsx');

test('all three payroll paths use DailyWagePage and shared last-loaded style', () => {
  assert.match(routes, /path="\/payroll\/daily-wages" element=\{<DailyWagePage mode="overview" \/>/);
  assert.match(routes, /path="\/payroll\/daily-wages\/history" element=\{<DailyWagePage mode="history" \/>/);
  assert.match(routes, /path="\/payroll\/payments" element=\{<DailyWagePage mode="payments" \/>/);
  assert.ok(page.indexOf("import './daily-wage.css'") < page.indexOf("import './daily-wage-readable.css'"));
});

test('payroll tabs keep selected period query while navigating across daily wages/history/payments', () => {
  assert.match(page,/useLocation/);
  assert.match(page,/const \{ search \} = useLocation\(\)/);
  assert.match(page,/to=\{\`\$\{href\}\$\{search\}\`\}/);
  assert.match(page,/aria-current=\{selected === id \? 'page' : undefined\}/);
  for(const href of ['/payroll/daily-wages','/payroll/daily-wages/history','/payroll/payments']) {
    assert.ok(page.includes("'"+href+"'"),'Missing payroll tab '+href);
  }
});

test('readable fonts cover summary cards, search filters and wage tables', () => {
  for(const selector of [
    '.dw-header h1','.dw-header p','.dw-nav a','.dw-card-head h2',
    '.dw-metric-top > span:first-child','.dw-metric > strong',
    '.dw-attendance-summary span','.dw-toolbar select',
    '.dw-toolbar input[type="date"]','.dw-search input',
    '.dw-table th','.dw-table td','.dw-table td small','.dw-table td::before',
  ]) assert.ok(css.includes(selector),'Missing payroll UI selector '+selector);
  assert.match(css,/font-size: 16px/);
  assert.match(css,/font-size: 14px/);
  assert.match(css,/min-height: 44px/);
  assert.match(css,/min-height: 48px/);
});

test('mobile payroll cards preserve labels and avoid page-wide overflow', () => {
  assert.match(css,/@media \(max-width: 767px\)/);
  assert.match(css,/@media \(max-width: 390px\)/);
  assert.match(css,/\.dw-table td::before \{[\s\S]*?font-size: 13px/);
  assert.match(css,/\.dw-table-scroll \{ overflow-x: hidden; \}/);
  assert.match(css,/overscroll-behavior-inline: contain/);
  assert.match(page,/data-label="Employee"/);
  assert.match(page,/data-label="Payment"/);
  assert.match(page,/data-label="Account"/);
});

test('presentation updates do not change wage calculation or permission enforcement', () => {
  assert.match(page,/const canView = can\(mode === 'payments' \? 'payroll.payments.view' : 'payroll.view'\)/);
  assert.match(page,/dailyWageService\.dashboard\(\)/);
  assert.match(page,/dailyWageService\.history\(/);
  assert.match(page,/dailyWageService\.payments\(\)/);
  assert.doesNotMatch(css,/display:\s*none\s*!important/);
});
