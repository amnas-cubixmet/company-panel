import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { resourceConfigs } from '../operations/resourceConfigs';
import { billingService, calculateDocumentTotals } from '../../services/billing.service';
import { USE_MOCK_API } from '../../api/apiConfig';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import { appConfirm, appPrompt } from '../../components/common/appDialogs';
import apiClient from '../../api/apiClient';
import {
  PaymentFilterToolbar, PaymentOverviewStats, PaymentRecordsPanel, PaymentsHeader
} from '../../components/payments';
import {
  formatPaymentDate, invoiceOutstanding, makePaymentPayload,
  normalizePaymentRow, payableInvoices, paymentStatusClass
} from '../../components/payments/payments.utils';
import '../../styles/payments.css';
import '../../styles/payments-unified.css';
import '../../styles/payments-borderless-forms.css';

const paymentService = resourceConfigs.payments.service;
const money = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
});
const dateLocal = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
const freshPayment = () => ({
  date: dateLocal(), invoiceId: '', method: 'Cash', amount: '', reference: ''
});
const friendlyError = (error, fallback) => {
  const details = error?.response?.data || error?.data;
  if (typeof details?.detail === 'string') return details.detail;
  if (details && typeof details === 'object') {
    const first = Object.entries(details).find(([, value]) => value);
    if (first) return `${first[0]}: ${Array.isArray(first[1]) ? first[1].join(', ') : String(first[1])}`;
  }
  return error?.message || fallback;
};
const invoiceCustomer = (invoice) =>
  invoice?.customerName || invoice?.customer?.name || 'Customer';

export function PaymentList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { can } = useFeatureAccess();
  const isNew = location.pathname.endsWith('/new');
  const isView = Boolean(id) && !isNew;
  const canCreate = can('payments.create');
  const canReverse = can('payments.reverse') && !USE_MOCK_API;
  const canViewInvoices = can('invoices.view');

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(freshPayment);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Reading payment history does not imply permission to read invoices.
      const [paymentRows, invoiceRows] = await Promise.all([
        paymentService.list(),
        isNew && canCreate && canViewInvoices ? billingService.list() : Promise.resolve([]),
      ]);
      setPayments((Array.isArray(paymentRows) ? paymentRows : []).map(normalizePaymentRow));
      setInvoices(Array.isArray(invoiceRows) ? invoiceRows : invoiceRows?.results || []);
    } catch (e) {
      setError(friendlyError(e, 'Unable to load payments.'));
    } finally {
      setLoading(false);
    }
  }, [isNew, canCreate, canViewInvoices]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const statuses = useMemo(
    () => [...new Set(payments.map((row) => row.status).filter(Boolean))].sort(),
    [payments]
  );
  const methods = useMemo(
    () => [...new Set(payments.map((row) => row.method).filter(Boolean))].sort(),
    [payments]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((row) =>
      (!q || [row.receiptNo, row.customer, row.invoice, row.method, row.reference, row.status]
        .some((value) => String(value || '').toLowerCase().includes(q))) &&
      (statusFilter === 'All' || row.status === statusFilter) &&
      (methodFilter === 'All' || row.method === methodFilter)
    );
  }, [payments, query, statusFilter, methodFilter]);

  const eligibleInvoices = useMemo(
    () => payableInvoices(invoices, calculateDocumentTotals), [invoices]
  );
  const selectedInvoice = eligibleInvoices.find((row) => String(row.id) === form.invoiceId);
  const outstanding = selectedInvoice ? invoiceOutstanding(selectedInvoice, calculateDocumentTotals) : 0;

  const changeInvoice = (invoiceId) => {
    const invoice = eligibleInvoices.find((row) => String(row.id) === invoiceId);
    setForm((previous) => ({
      ...previous,
      invoiceId, amount: invoice ? invoiceOutstanding(invoice, calculateDocumentTotals).toFixed(2) : ''
    }));
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving || !canCreate) return;
    let payload;
    try {
      payload = makePaymentPayload(form, selectedInvoice, outstanding, USE_MOCK_API);
    } catch (e) {
      setError(e.message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await paymentService.create(payload);
      if (!saved?.id) throw new Error('Payment was recorded but no record ID was returned. Refresh payments before retrying.');
      navigate(`/payments/${saved.id}`, { replace: true });
    } catch (e) {
      setError(friendlyError(e, 'Unable to record payment.'));
    } finally {
      setSaving(false);
    }
  };

  const reversePayment = async () => {
    if (!isView || !canReverse || saving) return;
    const record = payments.find((row) => String(row.id) === String(id));
    if (record?.status !== 'Completed') return;
    const reason = await appPrompt('Reason for reversing this customer payment:');
    if (!reason?.trim()) return;
    if (!await appConfirm('Reverse this payment and reopen its invoice balance?', {
      title: 'Reverse customer payment', confirmLabel: 'Reverse Payment', tone: 'danger',
    })) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/payments/${id}/reverse`, { reason: reason.trim() });
      setRefreshKey((value) => value + 1);
    } catch (e) {
      setError(friendlyError(e, 'Unable to reverse payment.'));
    } finally {
      setSaving(false);
    }
  };

  if (isNew) {
    return (
      <div className="payments-page payments-entry-page">
        <header className="payments-head">
          <div>
            <span className="payments-kicker">CUSTOMER COLLECTIONS</span>
            <h1>Record Payment</h1>
            <p>Choose an outstanding invoice. Customer and balance are filled automatically.</p>
          </div>
          <button type="button" className="payments-secondary-btn" onClick={() => navigate('/payments')}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to Payments
          </button>
        </header>

        {error && <div className="payments-error" role="alert">{error}</div>}
        {loading ? <p className="payments-empty" role="status">Loading invoices…</p> : (
          !canCreate ? <p className="payments-empty">You do not have permission to record payments.</p> :
          <form className="payment-form-card" onSubmit={save}>
            <div className="payment-form-intro">
              <h2>Payment Details</h2>
              <p>Payments are linked to finalized invoices and marked Completed when saved.</p>
            </div>
            <div className="payment-form-grid">
              <label className="payment-wide">
                <span>Invoice with Outstanding Balance *</span>
                <select required value={form.invoiceId} onChange={(e) => changeInvoice(e.target.value)} disabled={saving}>
                  <option value="">Select invoice</option>
                  {eligibleInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.number || invoice.id} · {invoiceCustomer(invoice)} · Due {money.format(invoiceOutstanding(invoice, calculateDocumentTotals))}
                    </option>
                  ))}
                </select>
                {eligibleInvoices.length === 0 && <small>No unpaid finalized invoices found.</small>}
              </label>

              <label>
                <span>Customer</span>
                <input value={invoiceCustomer(selectedInvoice)} readOnly placeholder="Select invoice" />
              </label>
              <label>
                <span>Outstanding Balance</span>
                <input value={selectedInvoice ? money.format(outstanding) : '—'} readOnly />
              </label>
              <label>
                <span>Payment Date *</span>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={saving} />
              </label>
              <label>
                <span>Payment Amount (₹) *</span>
                <input type="number" required min="0.01" max={selectedInvoice ? outstanding : undefined} step="0.01"
                  inputMode="decimal" value={form.amount} disabled={!selectedInvoice || saving}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </label>
              <label>
                <span>Payment Method *</span>
                <select value={form.method} disabled={saving} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'].map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <label>
                <span>Transaction Reference</span>
                <input value={form.reference} disabled={saving} maxLength={120}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="UPI ID / Cheque No. / Bank Reference" />
              </label>
              <div className="payment-form-confirmation payment-wide">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Payment status: <strong>Completed</strong>. This receipt is linked to the selected invoice; posted payments must be corrected through an authorized accounting workflow.</span>
              </div>
            </div>
            <div className="payment-form-actions">
              <button type="button" className="payments-secondary-btn" onClick={() => navigate('/payments')} disabled={saving}>Cancel</button>
              <button type="submit" className="payments-primary-btn" disabled={saving || !selectedInvoice}>
                <CheckCircle2 size={16} aria-hidden="true" /> {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (isView) {
    const record = payments.find((row) => String(row.id) === String(id));
    return (
      <div className="payments-page payments-detail-page">
        <header className="payments-head">
          <div>
            <span className="payments-kicker">PAYMENT DETAILS</span>
            <h1>{record?.receiptNo || 'Payment Details'}</h1>
            <p>Saved payment information and invoice reference.</p>
          </div>
          <button type="button" className="payments-secondary-btn" onClick={() => navigate('/payments')}>
            <ArrowLeft size={16} aria-hidden="true"/> Back to Payments
          </button>
        </header>
        {error && <div className="payments-error" role="alert">{error}</div>}
        {loading ? <div className="payments-empty">Loading payment…</div> : record ? (
          <>
          <section className="payment-detail-card">
            {[
              ['Payment Reference', record.receiptNo], ['Payment Date', formatPaymentDate(record.date)],
              ['Customer', record.customer], ['Invoice', record.invoice],
              ['Payment Method', record.method], ['Amount', money.format(record.amount || 0)],
              ['Transaction Reference', record.reference || '—'], ['Status', record.status]
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong className={label === 'Status' ? 'payment-detail-status ' + paymentStatusClass(record.status) : ''}>{value || '—'}</strong>
              </div>
            ))}
          </section>
          {record.status === 'Reversed' && record.reversal_reason && (
            <p className="payments-empty" role="status">Reversal reason: {record.reversal_reason}</p>
          )}
          {record.status === 'Completed' && canReverse && (
            <div className="payment-form-actions">
              <button className="payments-secondary-btn" type="button" onClick={reversePayment} disabled={saving}>
                {saving ? 'Reversing…' : 'Reverse Payment'}
              </button>
            </div>
          )}
          </>
        ) : <div className="payments-empty">Payment not found. Check the reference or return to Payments.</div>}
      </div>
    );
  }

  return (
    <div className="payments-page payments-dashboard">
      <PaymentsHeader onRecordPayment={() => navigate('/payments/new')} />
      <PaymentOverviewStats payments={payments} formatMoney={(value) => money.format(value || 0)} />
      <PaymentFilterToolbar
        query={query} onQueryChange={setQuery}
        status={statusFilter} onStatusChange={setStatusFilter}
        method={methodFilter} onMethodChange={setMethodFilter}
        statuses={statuses} methods={methods}
        resultCount={filtered.length}
        onClear={() => { setQuery(''); setStatusFilter('All'); setMethodFilter('All'); }}
        onRefresh={() => setRefreshKey((count) => count + 1)}
        loading={loading}
      />
      {error && <div className="payments-error" role="alert">{error}</div>}
      <PaymentRecordsPanel payments={filtered} loading={loading}
        formatMoney={(value) => money.format(value || 0)}
        onView={(row) => navigate(`/payments/${row.id}`)} />
    </div>
  );
}

export default PaymentList;
