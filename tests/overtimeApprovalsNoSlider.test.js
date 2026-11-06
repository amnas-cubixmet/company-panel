import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/payroll/OvertimeApprovalPage.jsx');
const css = read('src/pages/payroll/daily-wage-compact.css');
const tabs = read('src/pages/payroll/DailyWagePage.jsx');

test('Overtime Approvals has no horizontal sliding navigation bar', () => {
  assert.match(page, /className="dw-page dashboard-page dw-overtime-page"/);
  assert.match(css, /\.dw-page\.dashboard-page\.dw-overtime-page \.dw-nav \{\s*display:grid;/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.dw-page\.dashboard-page\.dw-overtime-page \.dw-nav \{[\s\S]*?overflow:visible;/);
  assert.match(css, /@media \(max-width:767px\) \{\s*\.dw-page\.dashboard-page\.dw-overtime-page \.dw-nav \{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.dw-page\.dashboard-page\.dw-overtime-page \.dw-nav a \{[\s\S]*?white-space:normal;/);
});

test('Navigation and approval workflow remain unchanged', () => {
  assert.match(page, /<DailyWageNav selected="overtime"\/>/);
  assert.match(tabs, /to=\{\`\$\{href\}\$\{search\}\`\}/);
  assert.match(page, /attendanceManagerService\.updateApprovalStatus\(selected.id,decision,note.trim\(\),/);
  assert.match(page, /canApproveOvertime/);
  assert.match(page, /validOvertimeRate\(rate\)/);
});
