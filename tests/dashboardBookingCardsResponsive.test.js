import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const component = read('src/components/dashboard/BookingList.jsx');
const css = read('src/styles/dashboard-booking-cards.css');
const dashboard = read('src/pages/dashboard/Dashboard.jsx');

test('Booking cards keep selection/search and show useful empty state', () => {
  assert.match(component, /onSelectBooking\(booking\.id\)/);
  assert.match(component, /aria-pressed=\{active\}/);
  assert.match(component, /No matching jobs found/);
  assert.match(component, /No jobs available/);
  assert.match(component, /dashboardText\(booking\.service, 'Service not specified'\)/);
  assert.match(component, /statusClass\(dashboardText\(booking\.status, 'Pending'\)\)/);
});

test('Booking cards use uniform nonshrinking, contained 3-row mobile layout', () => {
  assert.match(dashboard, /dashboard-simple\.css';\s*import '..\/..\/styles\/dashboard-booking-cards\.css'/);
  assert.match(css, /\.dashboard-page \.booking-row \{/);
  assert.match(css, /grid-template-rows:auto auto auto/);
  assert.match(css, /flex:0 0 auto/);
  assert.match(css, /height:auto/);
  assert.match(css, /min-height:100px/);
  assert.match(css, /overflow:hidden/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css, /text-overflow:ellipsis/);
  assert.match(css, /\.dashboard-page \.booking-row\.is-active/);
  assert.match(css, /\.dashboard-page \.booking-row:focus-visible/);
  assert.match(css, /@media \(max-width:480px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
