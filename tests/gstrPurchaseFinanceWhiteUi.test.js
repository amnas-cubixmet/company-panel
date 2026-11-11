import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path,import.meta.url),'utf8');
const gstr=read('src/pages/gstr/GSTRDashboard.jsx');
const finance=read('src/pages/finance/FinanceWorkspace.jsx');
const gstrCss=read('src/pages/gstr/gstr-purchase-finance-refined.css');
const financeCss=read('src/styles/finance-white-refined.css');
const overview=read('src/pages/finance/FinanceDashboard.jsx');
const itc=read('src/pages/gstr/GSTPart15Workspace.jsx');

test('GSTR Purchase GST and Finance source links never bypass workshop staff permissions',()=>{
  assert.match(gstr,/const canSeePurchaseFinance = access\.can\('stock\.view'\) && access\.can\('payments\.view'\)/);
  assert.match(gstr,/\{canSeePurchaseFinance && <div className="gstr-purchase-settlements"/);
  assert.match(gstr,/\{canSeePurchaseFinance && <Link to="\/suppliers\/purchases" className="cg-gstr-purchase-nav-link"/);
  assert.match(gstr,/\{access\.can\('payments\.view'\) && <Link to="\/finance\/transactions"/);
  assert.match(gstr,/\{access\.can\('expenses\.view'\) && <Link to="\/finance\/expenses"/);
  assert.match(gstr,/\{access\.can\('expenses\.view'\) && <div className="gstr-expense-gst-review"/);
  assert.match(gstr,/className="cg-gstr-purchase-quick-links"/);
  assert.match(gstr,/PURCHASE GST &amp; FINANCE/);
});

test('tax and payments remain separate source records and no payment is posted from GSTR',()=>{
  assert.match(gstr,/apiClient\.get\('\/gstr\/purchase-settlements', \{ params: \{ period \} \}\)/);
  assert.match(gstr,/Current Supplier Due/);
  assert.match(gstr,/Bank \/ UPI Allocated/);
  assert.match(gstr,/Purchase GST/);
  assert.match(gstr,/Payment does not change/);
  assert.match(gstr,/CURRENT ledger balance/);
  assert.match(gstr,/they are excluded from eligible ITC and GSTR-3B/);
  assert.match(gstr,/Not submitted by CubixGear/);
  assert.match(gstr,/Not a GST Portal filing file/);
  assert.doesNotMatch(gstr,/supplierFinanceService\.recordPayment/);
  assert.match(itc,/const canReview = access\.can\('gstr\.reconcile'\)/);
  assert.match(itc,/apiClient\.post\('\/gstr\/itc'/);
});

test('Finance workspace includes permission-scoped GSTR review without exposing balances',()=>{
  assert.match(finance,/label: 'Purchase GST / GSTR-2B', to: '\/gstr\?tab=gstr2b', icon: FileText, access: 'gstr\.view'/);
  assert.match(finance,/workflows\.filter\(item => access\.can\(item\.access\)\)/);
  assert.match(finance,/sections\.filter\(item => access\.can\(item\.access\)\)/);
  assert.match(finance,/canView = access\.can\('payments\.view'\) \|\| access\.can\('expenses\.view'\)/);
  assert.match(finance,/className="finance-workspace cg-finance-refined"/);
  assert.match(finance,/import '..\/..\/styles\/finance-white-refined\.css'/);
  assert.match(overview,/v === undefined \|\| v === null \? 'Restricted'/);
  assert.match(overview,/financeService\.getDashboard\(\)/);
});

test('Purchase GST and Finance interface follows white primary and text palette',()=>{
  assert.match(gstr,/import '\.\/gstr-purchase-finance-refined\.css'/);
  assert.match(gstrCss,/\.cg-gstr-refined \.gstr-purchase-settlements/);
  assert.match(gstrCss,/\.cg-gstr-refined \.gstr-expense-gst-review/);
  assert.match(gstrCss,/\.cg-gstr-purchase-nav-link/);
  assert.match(gstrCss,/background:var\(--cg-gstr-paper/);
  assert.match(financeCss,/\.finance-workspace\.cg-finance-refined/);
  assert.match(financeCss,/--cg-finance-paper:var\(--surface,#fff\)/);
  assert.match(financeCss,/--cg-finance-ink:var\(--text-primary/);
  assert.match(financeCss,/--cg-finance-muted:var\(--text-secondary/);
  assert.match(financeCss,/var\(--primary\)/);
  assert.match(financeCss,/\.finance-stat-card/);
  assert.match(financeCss,/\.finance-account-card/);
  assert.match(financeCss,/\.finance-workspace-links a/);
  assert.doesNotMatch(gstrCss + financeCss,/orange|rose|#f57645|#d9582e/i);
});

test('desktop and mobile finance + GST panels remain navigable and keyboard accessible',()=>{
  for (const value of ['@media(max-width:900px)','@media(max-width:700px)','@media(max-width:365px)','min-height:44px',':focus-visible']) {
    assert.ok(gstrCss.includes(value), 'GST CSS missing '+value);
  }
  for (const value of ['@media(max-width:1100px)','@media(max-width:700px)','@media(max-width:390px)','min-height:46px',':focus-visible']) {
    assert.ok(financeCss.includes(value), 'Finance CSS missing '+value);
  }
  assert.match(financeCss,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(financeCss,/\.finance-ledger-table/);
  assert.match(financeCss,/\.payments-dashboard-stat-card/);
  assert.match(financeCss,/\.expense-dashboard-stat-card/);
  assert.match(financeCss,/\.gl-panel/);
  assert.doesNotMatch(financeCss,/\.app-sidebar\s*\{/);
});
