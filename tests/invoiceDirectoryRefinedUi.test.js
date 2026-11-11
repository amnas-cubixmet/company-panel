import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');
const page=read('src/pages/invoices/InvoiceRoutePage.jsx');
const header=read('src/components/invoices/InvoiceListHeader.jsx');
const filter=read('src/components/invoices/InvoiceFilterToolbar.jsx');
const records=read('src/components/invoices/InvoiceRecordsPanel.jsx');
const stats=read('src/components/invoices/InvoiceOverviewStats.jsx');
const tabs=read('src/components/invoices/InvoiceTabs.jsx');
const css=read('src/styles/invoice-directory-refined.css');

test('invoices directory uses white primary-color UI scoped only to billing list',()=>{
  assert.ok(page.includes("import '../../styles/invoice-directory-refined.css';"));
  assert.ok(page.includes('billing-page billing-ui-unified billing-list-dashboard invoice-dashboard cg-invoice-refined'));
  assert.ok(css.includes('billing-list-dashboard.invoice-dashboard.cg-invoice-refined'));
  assert.ok(css.includes('var(--surface'));
  assert.ok(css.includes('var(--primary)'));
  assert.ok(css.includes('var(--text-primary'));
  assert.ok(css.includes('var(--text-secondary'));
  assert.doesNotMatch(css,/orange|rose|#f57645|#d9582e/i);
  assert.match(css,/@media screen \{/);
  assert.doesNotMatch(css,/@media print/);
  assert.doesNotMatch(css,/\.invoice-print/);
});

test('billing header retains permission-gated actions and cleaner title',()=>{
  assert.ok(header.includes('WORKSHOP BILLING'));
  assert.ok(header.includes('<h1>{activeTab'));
  assert.ok(header.includes("hasPermission(user, 'gstr.view')"));
  assert.ok(header.includes("hasPermission(user, 'stock.view')"));
  assert.ok(header.includes("hasPermission(user, 'payments.view')"));
  assert.ok(header.includes("hasPermission(user, 'invoices.create')"));
  for(const action of ['GST Returns','Supplier Purchases','Finance','Create Invoice','Add Estimate']){
    assert.ok(header.includes(action),action);
  }
  assert.doesNotMatch(header,/invoice-dashboard-header-badge/);
});

test('search and status filters preserve controlled API-backed document filtering',()=>{
  assert.ok(page.includes('billingService.list()'));
  assert.ok(page.includes('const filteredDocs = useMemo('));
  assert.ok(page.includes("const [listQuery, setListQuery] = useState('')"));
  assert.ok(page.includes("const [listStatus, setListStatus] = useState('All')"));
  assert.ok(page.includes("const hasListFilters = Boolean(listQuery.trim() || listStatus !== 'All')"));
  assert.ok(page.includes("const resetListFilters = () => { setListQuery(''); setListStatus('All'); };"));
  assert.ok(page.includes('onReset={resetListFilters}'));
  assert.ok(filter.includes('aria-label="Search billing records"'));
  assert.ok(filter.includes('aria-label="Filter documents by status"'));
  assert.ok(filter.includes('className="cg-invoice-active-filters"'));
  assert.ok(filter.includes('aria-label="Clear document search"'));
  assert.ok(filter.includes('onClick={onReset}'));
  assert.ok(filter.includes('role="status" aria-live="polite"'));
  assert.ok(css.includes('.cg-invoice-active-filters'));
});

test('invoice records retain secure view, PDF and draft-only edit',()=>{
  assert.ok(records.includes('role="region" aria-label="Invoice and estimate records table"'));
  assert.ok(records.includes('onView(document)'));
  assert.ok(records.includes('onPdf(document)'));
  assert.ok(records.includes('onEdit(document)'));
  assert.equal((records.match(/canEdit && document.status === 'Draft'/g)||[]).length,2);
  assert.ok(records.includes('formatMoney(totals.balance)'));
  assert.ok(records.includes('formatMoney(totals.total)'));
  assert.ok(records.includes('Could not load your billing records'));
  assert.ok(records.includes('onClick={onRetry}'));
  assert.ok(records.includes('hasFilters ?'));
  assert.ok(records.includes('onClick={onReset}'));
  assert.ok(records.includes('Clear filters'));
  assert.ok(page.includes('onPdf={(document) => downloadPdf(document)}'));
  assert.ok(page.includes('onView={(document) => navigate('));
});

test('invoice totals remain truthful and legal PDF rendering remains unchanged',()=>{
  assert.ok(stats.includes('not cash received'));
  assert.ok(stats.includes('includes drafts and cancelled'));
  assert.ok(page.includes('calculateDocumentTotals'));
  assert.ok(page.includes('normalizeBackendInvoiceTotals'));
  assert.ok(page.includes('invoiceOutstandingAmount'));
  assert.ok(page.includes('gstrLinkForInvoice'));
  assert.ok(page.includes('InvoicePdfShareSheet'));
  assert.ok(page.includes('billingService.previewTotals(form)'));
  assert.ok(page.includes('validateInvoiceDraft'));
  assert.ok(page.includes('formatInvoiceValidationError'));
  assert.ok(page.includes('<InvoicePrint doc={form}'));
  for(const a of ['invoice','estimate','eway']){
    assert.ok(tabs.includes("activeTab === '"+a+"'"),a);
  }
});

test('invoice desktop and mobile layouts stay usable and keyboard accessible',()=>{
  for(const name of [
    '.invoice-dashboard-header','.invoice-dashboard-tabs','.invoice-dashboard-stats',
    '.cg-invoice-filter-row','.invoice-dashboard-table-wrap','.invoice-dashboard-mobile-list',
    '.invoice-dashboard-mobile-card','.invoice-dashboard-mobile-actions',
    '@media(max-width:1200px)','@media(max-width:767px)','@media(max-width:390px)',
    'min-height:46px','font-size:16px',':focus-visible','prefers-reduced-motion:reduce'
  ]) assert.ok(css.includes(name),name);
  assert.doesNotMatch(css,/\.app-sidebar\s*\{/);
});
