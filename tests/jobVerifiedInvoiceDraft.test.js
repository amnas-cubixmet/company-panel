import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Job Card invoice action does not fabricate lines or use localStorage pricing', () => {
  const job=read('src/pages/jobs/JobCardWorkspace.jsx');
  const start=job.indexOf('const createInvoice = () => {');
  const end=job.indexOf('const downloadJobInvoicePdf = () => {', start);
  const fn=job.slice(start,end);
  assert.match(fn, /navigate\(\`\/invoices\/new\?kind=invoice&jobId=/);
  assert.doesNotMatch(fn, /localStorage|purchasePrice|customerCharge|sellingPrice/);
});

test('Invoice editor gets an unsaved server-verified job draft, then asks user to Save', () => {
  const invoice=read('src/pages/invoices/InvoiceRoutePage.jsx');
  const service=read('src/services/billing.service.js');
  assert.match(service, /getJobInvoiceDraft\(jobId\)/);
  assert.match(service, /apiClient\.get\('\/billing\/documents\/job-draft'/);
  assert.match(invoice, /billingService\.getJobInvoiceDraft\(jobId\)/);
  assert.match(invoice, /draft\.existingInvoiceId/);
  assert.match(invoice, /sourceJobId: draft\.jobId/);
  assert.match(invoice, /jobCardNo: draft\.jobNumber/);
  assert.match(invoice, /setJobDraftWarnings\(draft\.warnings \|\| \[\]\)/);
  assert.match(invoice, /Save Draft/);
  assert.match(invoice, /Finalize Invoice/);
});

test('No mock invoice is generated from private Job Card financial state', () => {
  const service=read('src/services/billing.service.js');
  assert.match(service, /Verified Job Card invoice drafts require the live backend/);
  assert.match(service, /USE_MOCK_API && kind === 'invoice' \? getJobInvoicePrefill\(\)/);
});
