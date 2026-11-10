import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const page = read('src/pages/gstr/GSTRDashboard.jsx');
const review = read('src/pages/gstr/GSTPart15Workspace.jsx');
const help = read('src/pages/gstr/GSTRGuide.jsx');
const css = read('src/pages/gstr/gstr-ui-polish.css');

test('all nine GST sections remain available with labels and dynamic explanation', () => {
  for (const section of [
    'overview', 'gstr1', 'gstr3b', 'gstr2b', 'hsn',
    'itc', 'credits', 'ledger', 'exports',
  ]) {
    assert.ok(page.includes("'" + section + "'"), 'Missing ' + section);
    assert.match(page, new RegExp('(?:^|\\n)\\s*' + section + ': ', 'm'));
  }
  assert.match(page, /<GSTRGuide\/>/);
  assert.match(page, /aria-pressed=\{tab === value\}/);
  assert.match(page, /setSearch\(''\); updateParams\(\{ tab: value \}\)/);
  assert.match(page, /TAB_HELP\[tab\]/);
});

test('financial year, return period and company GSTIN still use verified API', () => {
  assert.match(page, /apiClient\.get\('\/gstr\/overview'/);
  assert.match(page, /params: \{ period \}/);
  assert.match(page, /setFinancialYear\(event\.target\.value\)/);
  assert.match(page, /setMonth\(event\.target\.value\)/);
  assert.match(page, /data\?\.company\?\.gstin/);
  assert.match(page, /<Stat label="Taxable Sales"/);
  assert.match(page, /<Stat label="Sales GST"/);
});

test('bilingual help and export labels do not imply GST Portal filing', () => {
  assert.match(help, /വിൽപ്പന/);
  assert.match(help, /GST Portal/);
  assert.match(help, /A successful match does not approve tax credit automatically/);
  assert.match(page, /Portal status unverified/);
  assert.match(page, /Preparation only/);
  assert.match(page, /Not a GST Portal filing file/);
  assert.match(page, /PREPARATION\.csv/);
  assert.match(page, /cubixgear-/);
  assert.doesNotMatch(page, /cubegears-/);
});

test('tax controls and ITC approval remain permission-scoped and do not write from display controls', () => {
  assert.match(page, /access\.can\('gstr\.export'\)/);
  assert.match(page, /access\.can\('gstr\.reconcile'\)/);
  assert.match(review, /const canReview = access\.can\('gstr\.reconcile'\)/);
  assert.match(review, /apiClient\.post\('\/gstr\/itc'/);
  assert.match(review, /apiClient\.post\('\/gstr\/credit-notes'/);
  assert.match(review, /apiClient\.post\('\/gstr\/filing-review'/);
  assert.match(review, /if \(saving \|\| !canReview\) return/);
  assert.match(review, /internal review/i);
  assert.match(review, /!fetching && !error/);
});

test('mobile layout keeps readable cards, tables, search, touch controls and accessible retry', () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.gstr-mobile-rows/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(page, /aria-label="Retry loading GST records"/);
  assert.match(review, /onClick=\{\(\) => setVersion\(v => v \+ 1\)\} disabled=\{fetching\}>Retry/);
  assert.match(page, /role="status"/);
});
