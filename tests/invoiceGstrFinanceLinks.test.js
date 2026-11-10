import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isPostedInvoice, gstrLinkForInvoice, financePaymentHistoryLink,
  invoiceOutstandingAmount,
} from '../src/utils/invoiceFinanceLinks.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('only posted GST invoices link to their return period and invoice number', () => {
  const invoice = {
    kind: 'invoice', invoiceType: 'gst', status: 'Finalized',
    finalizedAt: '2026-11-09T07:00:00Z',
    number: 'INV/2026-031', date: '2026-11-09',
  };
  assert.equal(isPostedInvoice(invoice), true);
  assert.equal(gstrLinkForInvoice(invoice),
    '/gstr?tab=gstr1&period=2026-11&invoice=INV%2F2026-031');
  assert.equal(gstrLinkForInvoice({ ...invoice, status: 'Draft' }), '');
  assert.equal(gstrLinkForInvoice({ ...invoice, invoiceType: 'regular' }), '');
  assert.equal(gstrLinkForInvoice({ ...invoice, finalizedAt: null }), '');
  assert.equal(gstrLinkForInvoice({ ...invoice, date: 'not-a-date' }), '');
  assert.equal(gstrLinkForInvoice({ ...invoice, kind: 'estimate' }), '');
});

test('finance deep links search invoice receipts, never post or change the tax', () => {
  const invoice = { number: 'INV/2026-031', balance: '590.00' };
  assert.equal(financePaymentHistoryLink(invoice),
    '/finance/payments?invoice=INV%2F2026-031');
  assert.equal(invoiceOutstandingAmount(invoice, { balance: 200 }), 590);
  assert.equal(invoiceOutstandingAmount({ balance: '-2.00' }, {}), 0);
  assert.equal(invoiceOutstandingAmount({}, { balance: 20 }), 20);
  const editor = read('src/pages/invoices/InvoiceRoutePage.jsx');
  assert.match(editor, /\/finance\/payments\/new\?invoiceId=/);
  assert.match(editor, /can\('payments\.create'\) && isPostedInvoice\(form\)/);
  assert.match(editor, /gstrLinkForInvoice\(form\)/);
  assert.match(editor, /financePaymentHistoryLink\(form\)/);
  assert.match(editor, /GST is not charged again on receipt/);
});

test('invoice list and payment ledger offer permission-aware finance and GSTR links', () => {
  const header = read('src/components/invoices/InvoiceListHeader.jsx');
  const payments = read('src/pages/payments/PaymentList.jsx');
  assert.match(header, /hasPermission\(user, 'gstr\.view'\)/);
  assert.match(header, /hasPermission\(user, 'payments\.view'\)/);
  assert.match(header, /GST Returns/);
  assert.match(header, /Finance/);
  assert.match(payments, /new URLSearchParams\(location\.search\)\.get\('invoice'\)/);
  assert.match(payments, /const filtered = useMemo/);
});
