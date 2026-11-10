import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jobInvoiceGST, jobInvoiceFinance, jobInvoiceFor } from '../src/utils/jobGstFinance.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const posted = {
  id: '9aa979a6-1ee9-4bf7-a498-2ea4b5e88a39',
  number: 'INV/2026-099',
  kind: 'invoice',
  invoiceType: 'gst',
  sourceJobId: 'job-123',
  jobCardNo: 'JOB-001',
  date: '2026-11-10',
  createdAt: '2026-11-10T10:00:00Z',
  finalized_at: '2026-11-10T10:30:00Z',
  status: 'Partially Paid',
  taxable: '1000.00',
  cgst: '90.00',
  sgst: '90.00',
  igst: '0.00',
  total: '1180.00',
  paid: '380.00',
  balance: '800.00',
};

test('job GST uses saved invoice tax heads, not an estimated percent', () => {
  assert.deepEqual(jobInvoiceGST(posted), {
    cgst: 90, sgst: 90, igst: 0, taxable: 1000, tax: 180, mode: '',
  });
  assert.equal(jobInvoiceGST({ ...posted, invoiceType: 'regular' }), null);
  assert.equal(jobInvoiceGST({ ...posted, igst: undefined }), null);
});

test('a job can link only to its posted GST invoice and single Finance collection form', () => {
  const finance = jobInvoiceFinance(posted);
  assert.equal(finance.posted, true);
  assert.equal(finance.outstanding, 800);
  assert.equal(finance.paymentUrl,
    '/finance/payments/new?invoiceId=' + posted.id);
  assert.equal(finance.historyUrl,
    '/finance/payments?invoice=INV%2F2026-099');
  assert.equal(finance.gstrUrl,
    '/gstr?tab=gstr1&period=2026-11&invoice=INV%2F2026-099');

  assert.equal(jobInvoiceFinance({ ...posted, status: 'Draft', finalized_at: null }).paymentUrl, '');
  assert.equal(jobInvoiceFinance({ ...posted, status: 'Cancelled' }).gstrUrl, '');
  assert.equal(jobInvoiceFinance({ ...posted, balance: '0' }).paymentUrl, '');
  assert.equal(jobInvoiceFinance({ ...posted, invoiceType: 'regular' }).gstrUrl, '');
  assert.equal(jobInvoiceFinance(null).posted, false);
});

test('job invoice matching uses tenant-scoped invoice reference and excludes cancelled copies', () => {
  const cancelled = { ...posted, id: 'cancelled', status: 'Cancelled', createdAt: '2026-11-12T01:00:00Z' };
  const wrong = { ...posted, id: 'wrong', sourceJobId: 'different', jobCardNo: 'JOB-99' };
  const estimate = { ...posted, id: 'estimate', kind: 'estimate' };
  const job = { id: 'job-123', jobNumber: 'JOB-001' };
  assert.equal(jobInvoiceFor([cancelled, wrong, estimate, posted], job)?.id, posted.id);
  // Older invoices may retain only their FK relation, without sourceJobId.
  const legacyInvoice = {
    ...posted, id: 'legacy-invoice', jobId: job.id,
    sourceJobId: '', jobCardNo: '', status: 'Finalized',
  };
  assert.equal(jobInvoiceFor([legacyInvoice], job)?.id, 'legacy-invoice');
  assert.equal(jobInvoiceFor([cancelled], job), null);
  assert.equal(jobInvoiceFor([], job), null);
});

test('job card live payments use Finance account selection instead of legacy accountless API', () => {
  const details = read('src/pages/jobs/JobCardWorkspace.jsx');
  const list = read('src/pages/jobs/JobList.jsx');
  const records = read('src/components/jobs/JobRecordsPanel.jsx');

  assert.doesNotMatch(details, /await paymentService\.createPayment/);
  assert.match(read('src/utils/jobGstFinance.js'), /\/finance\/payments\/new\?invoiceId=/);
  assert.match(details, /jobInvoiceFinance\(linkedInvoice\)/);
  assert.match(details, /row\.jobId \|\| row\.job_id/);
  assert.match(details, /navigate\(financial\.paymentUrl\)/);
  assert.match(details, /canCreatePayment && financial\.paymentUrl/);
  assert.match(details, /canViewPayments && \(USE_MOCK_API/);
  assert.match(details, /canViewPayments \? invoicePaymentStatus : 'Restricted'/);
  assert.match(details, /canViewGST && financial\.gstrUrl/);
  assert.match(list, /billingService\.list\(\{ kind: 'invoice' \}\)/);
  assert.match(list, /!canViewInvoices \|\| USE_MOCK_API/);
  assert.match(records, /canCollectPayments && finance\.paymentUrl/);
  assert.match(records, /canViewGST && finance\.gstrUrl/);
  assert.match(records, /canViewPayments && finance\.historyUrl/);
});
