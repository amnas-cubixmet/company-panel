import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('dashboard booking search is accessible and preserves its controlled filter', () => {
  const source = read('src/components/dashboard/BookingList.jsx');
  assert.match(source, /className="dashboard-search" role="search"/);
  assert.match(source, /type="search"/);
  assert.match(source, /value=\{search\}/);
  assert.match(source, /onChange=\{\(event\) => onSearchChange\(event\.target\.value\)\}/);
  assert.match(source, /aria-label="Search bookings by customer, vehicle or job"/);
  assert.match(source, /aria-label="Clear booking search"/);
  assert.match(source, /onClick=\{\(\) => onSearchChange\(''\)\}/);
  assert.match(source, /bookings\.map\(\(booking\) =>/);
});

test('booking search has one visible shell and theme-safe transparent inner input', () => {
  const css = read('src/styles/dashboard.css');
  assert.match(css, /\.dashboard-page \.dashboard-search:focus-within/);
  assert.match(css, /\.dashboard-page \.dashboard-search input\[type="search"\]\{/);
  assert.match(css, /border:0 !important;/);
  assert.match(css, /border-radius:0 !important;/);
  assert.match(css, /background:transparent !important;/);
  assert.match(css, /background-color:transparent !important;/);
  assert.match(css, /font-size:16px;/);
  assert.match(css, /\.dashboard-page \.dashboard-search-clear:focus-visible/);
});
