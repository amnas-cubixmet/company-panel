import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const card = read('src/components/staff-management/StaffDirectoryCard.jsx');
const page = read('src/pages/staff-management/Staff.jsx');
const css = read('src/styles/staff-management-compact.css');

test('Directory shows staff identity, branch, shift, mobile and login as compact rows', () => {
  assert.match(page, /staff-directory-table-header/);
  assert.match(card, /staff-directory-row/);
  for (const name of ['Branch', 'Mobile', 'Daily wage', 'Status']) {
    assert.ok(card.includes(`data-label="${name}"`), 'Missing responsive label ' + name);
  }
  assert.match(card, /staff\.role/);
  assert.match(card, /staff\.shift/);
  assert.match(card, /staff\.loginStatus/);
  assert.match(card, /getEmployeeLabel\(staff, index\)/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test('Zero daily wage is displayed as configured zero rather than missing', () => {
  assert.match(card, /payPlan\?\.dailyRate != null/);
  assert.match(card, /Number\.isFinite\(rate\)/);
  assert.match(card, /rate\.toLocaleString\('en-IN'\)/);
  assert.match(card, /Not set/);
});

test('All actions keep permission-controlled handlers, labels and 44px hit targets', () => {
  assert.match(card, /onOpenWages &&/);
  assert.match(card, /onClick=\{onOpenWages\}/);
  assert.match(card, /onToggleStatus &&/);
  assert.match(card, /onClick=\{onToggleStatus\}/);
  assert.match(card, /aria-label=\{staff\.accountStatus === 'Active'/);
  assert.match(card, /Deactivate \$\{staff\.name\}/);
  assert.match(page, /onToggleStatus=\{canEditStaff \?/);
  assert.match(css, /\.staff-directory-row-actions > button \{[\s\S]*?min-height: 44px !important/);
  assert.match(css, /\.staff-directory-row-actions \.staff-status-button \{[\s\S]*?min-width: 44px !important/);
});

test('Compact rows adapt to narrow widths without large card columns', () => {
  assert.match(css, /@media \(max-width: 1000px\)/);
  assert.match(css, /\.staff-directory-row,[\s\S]*?grid-template-columns: repeat\(2,minmax\(0,1fr\)\) !important/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /\.staff-directory-table.without-wages/);
});
