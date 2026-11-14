import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  billingDirectorySummary, isIssuedBillingDocument, filterBillingDirectory,
} from '../src/components/invoices/invoiceDirectorySummary.js';

const rows = [
  {id:'d1',number:'INV-001',kind:'invoice',status:'Draft',date:'2026-11-12',
    customer:{name:'Customer A'},amount:9000,paid:0,balance:9000},
  {id:'i1',number:'INV-002',kind:'invoice',status:'Finalized',date:'2026-11-14',
    customer:{name:'Customer B'},vehicle:{registration:'KL10AB1234'},
    amount:1000,paid:300,balance:700},
  {id:'i2',number:'INV-003',kind:'invoice',status:'Partially Paid',date:'2026-11-13',
    customer:{name:'Customer A'},amount:2000,paid:800,balance:1200},
  {id:'c1',number:'INV-004',kind:'invoice',status:'Cancelled',date:'2026-11-10',
    amount:5000,paid:0,balance:5000},
  {id:'p1',number:'INV-005',kind:'invoice',status:'Paid',date:'2026-11-15',
    amount:3000,paid:3000,balance:0},
];
const totals = document => ({
  total:document.amount,paid:document.paid,balance:document.balance,
});

test('issued invoice KPIs exclude draft and cancelled and never double count receipts', () => {
  const result=billingDirectorySummary(rows,'invoice',totals);
  assert.deepEqual(result,{
    totalCount:5,issuedCount:3,draftCount:1,issuedValue:6000,
    received:4100,outstanding:1900,
  });
  assert.equal(isIssuedBillingDocument(rows[0]),false);
  assert.equal(isIssuedBillingDocument(rows[3]),false);
  assert.equal(isIssuedBillingDocument(rows[2]),true);
});

test('estimates show quotation value, never received revenue or due', () => {
  const result=billingDirectorySummary([
    {kind:'estimate',status:'Issued',amount:1000},
    {kind:'estimate',status:'Converted',amount:500},
    {kind:'estimate',status:'Draft',amount:2000},
  ],'estimate',totals);
  assert.equal(result.issuedValue,1500);
  assert.equal(result.received,0);
  assert.equal(result.outstanding,0);
});

test('filter uses real dates, status and search; newest/oldest sorting remains stable', () => {
  const original=rows.map(row=>row.id);
  assert.deepEqual(filterBillingDirectory(rows,{}).map(row=>row.id),
    ['p1','i1','i2','d1','c1']);
  assert.deepEqual(filterBillingDirectory(rows,{sort:'oldest'}).map(row=>row.id),
    ['c1','d1','i2','i1','p1']);
  assert.deepEqual(filterBillingDirectory(rows,{from:'2026-11-13',to:'2026-11-14'}).map(row=>row.id),
    ['i1','i2']);
  assert.deepEqual(filterBillingDirectory(rows,{status:'Finalized'}).map(row=>row.id),['i1']);
  assert.deepEqual(filterBillingDirectory(rows,{query:'kl10ab'}).map(row=>row.id),['i1']);
  assert.deepEqual(filterBillingDirectory(rows,{query:'Customer A',sort:'number'}).map(row=>row.id),
    ['d1','i2']);
  assert.deepEqual(rows.map(row=>row.id),original,'caller array must not be mutated');
});

test('invoice list keeps backend invoice actions, and new date range and paid/due layout', () => {
  const page=readFileSync(new URL('../src/pages/invoices/InvoiceRoutePage.jsx',import.meta.url),'utf8');
  const toolbar=readFileSync(new URL('../src/components/invoices/InvoiceFilterToolbar.jsx',import.meta.url),'utf8');
  const records=readFileSync(new URL('../src/components/invoices/InvoiceRecordsPanel.jsx',import.meta.url),'utf8');
  const stats=readFileSync(new URL('../src/components/invoices/InvoiceOverviewStats.jsx',import.meta.url),'utf8');
  for(const control of ['listFrom','listTo','listSort','filterBillingDirectory','invoice-list-polished.css']){
    assert.ok(page.includes(control),control);
  }
  assert.match(toolbar,/aria-label="Invoice start date"/);
  assert.match(toolbar,/aria-label="Invoice end date"/);
  assert.match(toolbar,/aria-label="Sort billing documents"/);
  assert.match(records,/onClick=\{\(\) => onPdf\(document\)\}/);
  assert.match(records,/onClick=\{\(\) => onView\(document\)\}/);
  assert.match(records,/formatMoney\(totals.paid\)/);
  assert.match(records,/activeTab === 'estimate' \? '—'/);
  assert.match(stats,/Payments Received/);
  assert.match(stats,/Outstanding/);
  assert.doesNotMatch(stats,/includes drafts and cancelled/);
});

test('only invoice list is restyled; editor, PDF and printing stay unmodified', () => {
  const css=readFileSync(new URL('../src/styles/invoice-list-polished.css',import.meta.url),'utf8');
  assert.match(css,/billing-list-dashboard/);
  assert.match(css,/cg-invoice-filter-secondary/);
  assert.match(css,/invoice-dashboard-mobile-card/);
  assert.match(css,/@media\(max-width:767px\)/);
  assert.doesNotMatch(css,/invoice-print-sheet/);
});
