import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path,import.meta.url),'utf8');
const page=read('src/pages/gstr/GSTRDashboard.jsx');
const css=read('src/pages/gstr/gstr-directory-refined.css');
const review=read('src/pages/gstr/GSTPart15Workspace.jsx');

test('GST preparation uses scoped white branded workspace and keeps existing nine tabs',()=>{
  assert.match(page,/import '\.\/gstr-directory-refined\.css'/);
  assert.match(page,/className="gstr-page cg-gstr-refined"/);
  assert.match(page,/className="cg-gstr-heading"/);
  assert.match(page,/className="gstr-filter-panel" aria-label="GST return reporting period and registration"/);
  assert.match(page,/className="cg-gstr-export"/);
  assert.match(css,/\.gstr-page\.cg-gstr-refined/);
  assert.match(css,/--cg-gstr-paper:var\(--surface,#fff\)/);
  assert.match(css,/var\(--primary\)/);
  assert.match(css,/var\(--text-primary/);
  assert.match(css,/var\(--text-secondary/);
  assert.doesNotMatch(css,/orange|rose|#f57645|#d9582e/i);
  for(const value of ['overview','gstr1','gstr3b','gstr2b','hsn','itc','credits','ledger','exports']){
    assert.ok(page.includes("['"+value+"'") || page.includes(", '"+value+"'"),'Missing tab '+value);
  }
  assert.match(page,/aria-pressed=\{tab === value\}/);
});

test('filters use real period, financial-year and workshop GSTIN data',()=>{
  assert.match(page,/apiClient\.get\('\/gstr\/overview', \{ params: \{ period \} \}\)/);
  assert.match(page,/setFinancialYear\(event\.target\.value\)/);
  assert.match(page,/setMonth\(event\.target\.value\)/);
  assert.match(page,/data\?\.company\?\.gstin/);
  assert.match(page,/<Stat label="Taxable Sales"/);
  assert.match(page,/<Stat label="Sales GST"/);
  assert.match(page,/<Stat label="Reviewed ITC"/);
  assert.match(page,/<Stat label="Estimated GST \(not final\)"/);
  assert.match(css,/\.gstr-filter-panel/);
  assert.match(css,/\.gstr-stats/);
});

test('searchable outward invoices are clearable and tables accessible on desktop and phone',()=>{
  assert.match(page,/className="gstr-table-scroll" role="region" aria-label="GST records table" tabIndex=\{0\}/);
  assert.match(page,/className="gstr-search cg-gstr-search"/);
  assert.match(page,/aria-label="Search outward invoices"/);
  assert.match(page,/aria-label="Clear outward invoice search" onClick=\{\(\) => setSearch\(''\)\}/);
  assert.match(page,/const filtered = useMemo/);
  assert.match(page,/className="gstr-mobile-rows"/);
  assert.match(page,/aria-label="Previous records page"/);
  assert.match(page,/aria-label="Next records page"/);
  assert.match(css,/\.gstr-table-scroll/);
  assert.match(css,/\.gstr-mobile-row/);
  assert.match(css,/\.gstr-pagination/);
});

test('CSV exports, reconciliation and legal preparation warnings remain unchanged',()=>{
  assert.match(page,/apiClient\.get\('\/gstr\/exports'/);
  assert.match(page,/PREPARATION\.csv/);
  assert.match(page,/access\.can\('gstr.export'\)/);
  assert.match(page,/access\.can\('gstr.reconcile'\)/);
  assert.match(page,/Not submitted by CubixGear/);
  assert.match(page,/Portal unverified/);
  assert.match(page,/Not a GST Portal filing file/);
  assert.match(page,/5 \* 1024 \* 1024/);
  assert.match(page,/apiClient\.post\('\/gstr\/reconcile'/);
  assert.match(review,/apiClient\.post\('\/gstr\/itc'/);
  assert.match(review,/apiClient\.post\('\/gstr\/credit-notes'/);
  assert.match(review,/apiClient\.post\('\/gstr\/filing-review'/);
});

test('responsive white panels preserve mobile access and strong visible focus',()=>{
  for(const part of [
    '.gstr-guide','.gstr15-workspace','.gstr-export-actions',
    '.gstr15-form','.gstr-breakdown','.gstr-status',
    '.gstr-tabs button.is-active','.gstr-search.cg-gstr-search',
    '@media(max-width:1000px)','@media(max-width:700px)',
    '@media(max-width:365px)','min-height:46px',
    'font-size:16px',':focus-visible','prefers-reduced-motion:reduce'
  ]) assert.ok(css.includes(part),part);
  assert.match(css,/@media screen \{/);
  assert.doesNotMatch(css,/@media print/);
  assert.doesNotMatch(css,/\.app-sidebar\s*\{/);
});
