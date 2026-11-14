import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jobInvoiceFor, jobInvoiceFinance } from '../src/utils/jobGstFinance.js';

const job = {id:'job-01', jobNumber:'JOB-001'};
const finalized = {
  id:'issued', kind:'invoice',jobId:'job-01', number:'INV-001',
  status:'Finalized', finalizedAt:'2026-11-14T10:00:00Z',
  date:'2026-11-14', total:'1180', paid:'400', balance:'780',
};
const draft = {
  id:'draft', kind:'invoice',jobId:'job-01', number:'INV-002',
  status:'Draft', date:'2026-11-15', total:'2000', paid:'0', balance:'2000',
};

test('an issued job invoice is never hidden by a newer unsent draft',()=>{
  assert.equal(jobInvoiceFor([draft,finalized], job).id,'issued');
  const finance=jobInvoiceFinance(jobInvoiceFor([draft,finalized],job));
  assert.equal(finance.posted,true);
  assert.equal(finance.outstanding,780);
  assert.match(finance.paymentUrl,/invoiceId=issued/);
  assert.equal(jobInvoiceFor([draft,{...finalized,status:'Cancelled'}],job).id,'draft');
  assert.equal(jobInvoiceFor([{...finalized,status:'Cancelled'}],job),null);
});

test('job billing summary uses separate GET and never adjusts payment or tax state',()=>{
  const service=readFileSync(new URL('../src/services/job.service.js',import.meta.url),'utf8');
  assert.match(service,/export const getJobBillingSummary/);
  assert.match(service,/\/billing-summary/);
  assert.match(service,/apiClient\.get/);
  const page=readFileSync(new URL('../src/pages/jobs/JobCardWorkspace.jsx',import.meta.url),'utf8');
  assert.match(page,/jobService\.getJobBillingSummary\(job\.id\)/);
  assert.match(page,/postedBilling\.sellingBeforeGST/);
  assert.match(page,/postedBilling\.invoiceTotal/);
  assert.match(page,/postedBilling\.paid/);
  assert.match(page,/postedBilling\.outstanding/);
  assert.match(page,/billingSummaryState\.jobId === job\?\.id/);
  assert.match(page,/setJobInvoices\(\[\]\)/);
});

test('customer, vehicle, invoice, staff and finance links are role-gated',()=>{
  const page=readFileSync(new URL('../src/pages/jobs/JobCardWorkspace.jsx',import.meta.url),'utf8');
  for(const link of ['customers/','vehicles/','staff-management/staff/','invoices/','finance/payments']){
    assert.ok(page.includes(link),link);
  }
  assert.match(page,/can\('customers.view'\)/);
  assert.match(page,/can\('vehicles.view'\)/);
  assert.match(page,/can\('staff.view'\)/);
  assert.match(page,/hasInvoiceAccess && jobLinkedInvoiceId/);
  assert.match(page,/canViewPayments && hasPostedBilling/);
});

test('internal profit is exclusive of GST and based only on recorded cost',()=>{
  const panel=readFileSync(new URL('../src/components/jobs/JobTotalCostPanel.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles/job-financial-bridge.css',import.meta.url),'utf8');
  assert.match(panel,/Number\(netSellingValue\) - recordedCost/);
  assert.match(panel,/Indicative Gross Profit \(before GST\)/);
  assert.match(panel,/Workshop Direct Cost/);
  assert.match(panel,/Customer Balance Due/);
  assert.match(panel,/Customer Paid/);
  assert.match(panel,/job-total-cost-footnotes/);
  assert.match(panel,/unallocatedDailyWages/);
  assert.match(css,/cg-job-connected-links/);
  assert.match(css,/cg-job-cost-breakdown/);
});

test('vehicle lookup does not conflate draft estimates with paid spending',()=>{
  const page=readFileSync(new URL('../src/pages/jobs/JobList.jsx',import.meta.url),'utf8');
  const lookup=readFileSync(new URL('../src/components/jobs/VehicleLookupPanel.jsx',import.meta.url),'utf8');
  assert.match(page,/const issuedInvoices/);
  assert.match(page,/if \(!isPostedInvoice\(invoice\)\) return false/);
  assert.match(page,/const uniquePosted = new Map/);
  assert.match(page,/!USE_MOCK_API/);
  assert.doesNotMatch(page,/job\.estimates\?\.at\(-1\)\?\.grandTotal/);
  assert.match(lookup,/Issued Invoice Value/);
});

test('job card retains required stages, QC and invoice are separate',()=>{
  const page=readFileSync(new URL('../src/pages/jobs/JobCardWorkspace.jsx',import.meta.url),'utf8');
  assert.match(page,/\['overview', 'inspection', 'estimate', 'work', 'qc', 'invoice'\]/);
  assert.match(page,/JobInspectionPanel/);
  assert.match(page,/QuickEstimatePanel/);
  assert.match(page,/JobQualityCheckPanel/);
  assert.match(page,/InvoicePdfShareSheet/);
});
