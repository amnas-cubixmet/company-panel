import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const card = read('src/components/staff-management/StaffDirectoryCard.jsx');
const css = read('src/styles/staff-management-readable.css');

test('Staff directory displays labeled branch, role, shift and joined values without clipping', () => {
  for (const name of ['Branch', 'Company Role', 'Shift', 'Mobile / Login', 'Daily wage']) {
    assert.ok(card.includes('<small>'+name+'</small>'), 'Missing card label '+name);
  }
  assert.match(card, /className="staff-directory-fact__copy"/);
  assert.match(css, /\.staff-directory-fact__copy > span \{[\s\S]*?white-space: normal !important/);
  assert.match(css, /\.staff-directory-fact--wage \{[\s\S]*?grid-column: 1 \/ -1/);
});

test('Zero daily wage is displayed as configured zero rather than incorrectly missing', () => {
  assert.match(card,/payPlan\?\.dailyRate != null/);
  assert.match(card,/Number\.isFinite\(Number\(payPlan\.dailyRate\)\)/);
  assert.match(card,/toLocaleString\('en-IN'\)/);
  assert.match(card,/Not configured/);
});

test('Buttons retain functionality, meaningful power action label and sufficient touch size', () => {
  assert.match(card,/event\.stopPropagation\(\)/);
  assert.match(card,/onOpenWages\(\)/);
  assert.match(card,/onToggleStatus\(\)/);
  assert.match(card,/aria-label=\{staff\.accountStatus === 'Active'/);
  assert.match(card,/Deactivate \$\{staff\.name\}/);
  assert.match(css,/\.staff-directory-card__actions \.staff-status-button \{[\s\S]*?min-height: 44px !important/);
  assert.match(css,/\.staff-directory-card__actions \.staff-view-button,[\s\S]*?min-height: 44px !important/);
});

test('Responsive card handles narrow desktop columns and mobile without page-wide overflow', () => {
  assert.match(css,/container: staff-directory-card \/ inline-size/);
  assert.match(css,/@container staff-directory-card \(max-width: 305px\)/);
  assert.match(css,/\.staff-directory-details \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css,/\.staff-directory-card__actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css,/white-space: normal !important/);
});
