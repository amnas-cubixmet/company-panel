import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('attendance month/year selection remains accessible and keeps original navigation handlers', () => {
  const file = read('src/components/my-attendance/AttendanceOverviewHeader.jsx');
  for (const label of ['Previous month', 'Next month', 'Month', 'Year']) {
    assert.ok(file.includes('aria-label="' + label + '"'));
  }
  assert.match(file, /onMonthChange\(Number\(event\.target\.value\)\)/);
  assert.match(file, /onYearChange\(Number\(event\.target\.value\)\)/);
  assert.match(file, /disabled=\{previousDisabled\}/);
  assert.match(file, /disabled=\{nextDisabled\}/);
});

test('history search clears without changing the existing export workflow', () => {
  const file = read('src/components/my-attendance/AttendanceHistoryTable.jsx');
  const page = read('src/pages/my-attendance/HolidayCalendar.jsx');
  assert.match(file, /aria-label="Search attendance"/);
  assert.match(file, /onSearchChange\(event\.target\.value\)/);
  assert.match(file, /aria-label="Clear attendance search"/);
  assert.ok(file.includes("onSearchChange('')"));
  assert.match(file, /onClick=\{onExport\}/);
  assert.match(page, /onExport=\{exportCsv\}/);
  assert.match(page, /anchor\.download/);
});

test('toolbar style is component-scoped, responsive and focusable', () => {
  const file = read('src/styles/attendance-calendar.css');
  assert.ok(file.includes('.attendance-calendar-redesign .attendance-month-select-field select'));
  assert.ok(file.includes('.attendance-calendar-redesign .attendance-history-search>input'));
  assert.ok(file.includes('.attendance-calendar-redesign .attendance-export-button'));
  assert.ok(file.includes('height:44px'));
  assert.ok(file.includes('font-size:16px'));
  assert.ok(file.includes(':focus-visible'));
  assert.ok(file.includes('@media(max-width:520px)'));
});
