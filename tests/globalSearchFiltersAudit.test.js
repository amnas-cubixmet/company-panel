import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('global workspace search calls authenticated real backend, never storage/mock fixtures', () => {
  const service = file('src/services/globalSearch.service.js');
  assert.match(service, /apiClient\.get\('\/search'/);
  assert.match(service, /signal/);
  assert.doesNotMatch(service, /searchMockData|localStorage|liveStores|searchPages/);
});

test('single inline header search supports keyboard, focus, cancellation and grouped results', () => {
  const component = file('src/components/common/GlobalSearch.jsx');
  const header = file('src/components/layout/Header.jsx');
  const css = file('src/styles/global-search.css');
  for (const fragment of [
    'role="combobox"', 'role="listbox"', 'onKeyDown={onKeyDown}',
    "event.key === 'ArrowDown'", "event.key === 'ArrowUp'",
    "event.key === 'Escape'", "event.key === 'Enter'",
    'event.ctrlKey', 'event.metaKey',
    'new AbortController()', 'controller.abort()', 'aria-label="Clear search"',
    'global-search-feedback', 'global-search-group', 'global-search-result-row',
  ]) assert.ok(component.includes(fragment), fragment);
  assert.equal((header.match(/<GlobalSearch\b/g) || []).length, 1);
  assert.equal((component.match(/<input\b/g) || []).length, 1);
  assert.doesNotMatch(component, /createPortal|aria-modal|role="dialog"/);
  assert.doesNotMatch(css, /global-search-backdrop|global-search-dialog/);
  assert.match(css, /position: absolute/);
  assert.match(css, /font-size: 16px/);
});

test('job combined filters are URL-backed, preserve browser navigation and reset page', () => {
  const jobs = file('src/pages/jobs/JobList.jsx');
  const toolbar = file('src/components/jobs/JobsToolbar.jsx');
  assert.match(jobs, /useSearchParams/);
  assert.match(jobs, /searchParams\.get\('status'\)/);
  assert.match(jobs, /searchParams\.get\('branch'\)/);
  assert.match(jobs, /searchParams\.get\('technician'\)/);
  assert.match(jobs, /searchParams\.get\('priority'\)/);
  assert.match(jobs, /next\.delete\('page'\)/);
  assert.match(jobs, /filteredJobs\.slice\(/);
  assert.match(jobs, /setSearchParams\(next\)/);
  for (const key of ['Filter job cards by status', 'Filter job cards by branch',
    'Filter job cards by technician', 'Filter job cards by priority',
    'Job card created from date', 'Job card created to date', 'Reset Filters']) {
    assert.ok(toolbar.includes(key), key);
  }
});

test('customer directory filter values come from real tenant customers, not fake branches', () => {
  const customers = file('src/pages/customers/CustomerList.jsx');
  assert.match(customers, /customer\.branchName/);
  assert.match(customers, /availableBranches\.map/);
  assert.match(customers, /availableTypes\.map/);
  assert.match(customers, /useSearchParams/);
  assert.match(customers, /availableBranches\.map/);
});

test('stock global navigation supports real supplier details and persisted part search', () => {
  const stock = file('src/pages/stock/StockEasyPage.jsx');
  assert.match(stock, /searchParams\.get\('supplier'\)/);
  assert.match(stock, /apiClient\.get\(`\/stock\/suppliers\//);
  assert.match(stock, /searchParams\.get\('search'\)/);
  assert.match(stock, /Close Supplier Details/);
});

test('private customer portal was migrated out of the Company Panel safely', () => {
  const routes = file('src/routes/AppRoutes.jsx');
  const panel = file('src/components/customers/CustomerTrackingLinkPanel.jsx');
  assert.equal(routes.includes('CustomerPortalPage'), false);
  assert.equal(routes.includes('path="/c/:token"'), false);
  assert.ok(panel.includes('/customer-portal/links/'));
  assert.ok(panel.includes('Revoke Link'));
});

test('shared modal components lock scroll and implement accessible focus restoration', () => {
  const hook = file('src/components/common/useDialogAccessibility.js');
  const sheet = file('src/components/common/ResponsiveModalSheet.jsx');
  const dialog = file('src/components/feedback/Modal.jsx');
  assert.match(hook, /activeDialogCount/);
  assert.match(hook, /event\.key !== 'Tab'/);
  assert.match(hook, /top\?\.contains\(dialogRef\.current\)/);
  assert.match(hook, /previousFocus\.focus\(\)/);
  assert.match(sheet, /useDialogAccessibility\(isOpen, onClose, modalRef\)/);
  assert.match(dialog, /useDialogAccessibility\(visible, onClose, dialogRef\)/);
});
