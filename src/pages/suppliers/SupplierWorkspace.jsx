import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CreditCard, RefreshCw, Search, Truck, Wallet } from 'lucide-react';
import { supplierFinanceService } from '../../services/supplierFinance.service';
import { useFeatureAccess } from '../../context/FeatureAccessContext';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(num(value));
const labelOf = (item, suppliers) =>
  suppliers.find(supplier => String(supplier.id) === String(item.supplier || item.supplierId))?.name
  || item.supplierName || 'Supplier';
const available = credit => num(credit.outstanding) > 0;

const columns = {
  all: { title: 'All Suppliers', caption: 'Contacts and outstanding supplier credits' },
  credits: { title: 'Credit Management', caption: 'Received purchases with registered supplier credit' },
  purchases: { title: 'Purchase History', caption: 'Real purchase orders from Inventory' },
  payments: { title: 'Supplier Payments', caption: 'Cash, Bank and UPI settlements recorded in Expenses' },
};

const cell = { padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };
const box = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' };
const field = { width: '100%', minHeight: 44, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 9,
  background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 16, boxSizing: 'border-box' };
const headings = [
  { key: 'all', title: 'All Suppliers', path: '/suppliers' },
  { key: 'credits', title: 'Credit Management', path: '/suppliers/credits' },
  { key: 'purchases', title: 'Purchase History', path: '/suppliers/purchases' },
  { key: 'payments', title: 'Supplier Payments', path: '/suppliers/payments' },
];

function RecordsTable({ headings: labels, rows, empty }) {
  return (
    <div style={{ ...box, overflowX: 'auto', maxWidth: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580, fontSize: 14 }}>
        <thead style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          <tr>{labels.map(label => <th key={label} scope="col" style={cell}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows : (
            <tr><td colSpan={labels.length} style={{ ...cell, color: 'var(--text-muted)', textAlign: 'center', padding: 28 }}>
              {empty}
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SupplierWorkspace() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const featureAccess = useFeatureAccess();
  const tab = pathname.split('/')[2] || 'all';
  const active = columns[tab] ? tab : 'all';
  const canFinance = featureAccess.can('stock.view') && featureAccess.can('expenses.view');
  const canRegister = canFinance && featureAccess.can('stock.edit') && featureAccess.can('expenses.create');
  const canPay = canFinance && featureAccess.can('expenses.create');
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pay, setPay] = useState({
    credit: searchParams.get('credit') || '', amount: '', method: 'Cash', reference: '',
  });
  const pendingPaymentRef = useRef(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierRows, purchaseRows, creditRows, paymentRows] = await Promise.all([
        supplierFinanceService.suppliers(),
        supplierFinanceService.purchases(),
        canFinance ? supplierFinanceService.credits() : Promise.resolve([]),
        canFinance ? supplierFinanceService.payments() : Promise.resolve([]),
      ]);
      setSuppliers(supplierRows);
      setPurchases(purchaseRows);
      setCredits(creditRows);
      setPayments(paymentRows);
    } catch (cause) {
      setError(cause?.message || 'Could not load supplier records.');
    } finally {
      setLoading(false);
    }
  }, [canFinance]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const credit = searchParams.get('credit');
    if (credit) setPay(values => ({ ...values, credit }));
  }, [searchParams]);

  const q = query.trim().toLowerCase();
  const matches = value => !q || String(value || '').toLowerCase().includes(q);
  const creditBySupplier = useMemo(() => {
    const result = new Map();
    for (const credit of credits) {
      const key = String(credit.supplierId);
      result.set(key, (result.get(key) || 0) + num(credit.outstanding));
    }
    return result;
  }, [credits]);
  const payableCredits = credits.filter(available);
  const selectedCredit = payableCredits.find(item => String(item.id) === String(pay.credit));
  const creditPurchaseIds = new Set(credits.map(credit => String(credit.purchaseOrder)));
  const creditEligible = purchases.filter(purchase =>
    ['Received', 'Completed'].includes(purchase.status) && num(purchase.total) > 0
    && !creditPurchaseIds.has(String(purchase.id)));

  const onRegister = async event => {
    event.preventDefault();
    if (!canRegister || saving || !purchaseOrder) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await supplierFinanceService.registerCredit({ purchaseOrder, dueDate: dueDate || null });
      setNotice('Credit recorded against the existing purchase order.');
      setPurchaseOrder(''); setDueDate('');
      await reload();
    } catch (cause) {
      setError(cause?.message || 'Credit could not be registered.');
    } finally {
      setSaving(false);
    }
  };

  const onSettle = async event => {
    event.preventDefault();
    if (!canPay || saving || !selectedCredit) return;
    const amount = Number(pay.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > num(selectedCredit.outstanding)) {
      setError('Enter a positive payment amount not exceeding the outstanding balance.');
      return;
    }
    if (pay.method !== 'Cash' && !pay.reference.trim()) {
      setError('Bank/UPI payments require a reference.');
      return;
    }
    const signature = [pay.credit, amount.toFixed(2), pay.method, pay.reference.trim()].join('|');
    if (pendingPaymentRef.current?.signature !== signature) {
      pendingPaymentRef.current = { signature, idempotencyKey: crypto.randomUUID() };
    }
    setSaving(true); setError(''); setNotice('');
    try {
      await supplierFinanceService.recordPayment({
        credit: pay.credit, amount: amount.toFixed(2), method: pay.method,
        reference: pay.reference.trim(), idempotencyKey: pendingPaymentRef.current.idempotencyKey,
      });
      pendingPaymentRef.current = null;
      setPay(values => ({ ...values, amount: '', reference: '' }));
      setNotice('Settlement recorded once in Expenses and allocated to supplier credit.');
      await reload();
    } catch (cause) {
      // Preserve the request UUID on retry: a network failure may occur after the server commits.
      setError(cause?.message || 'Payment was not confirmed. Retry with the same details.');
    } finally {
      setSaving(false);
    }
  };

  const input = (label, content) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
      <span>{label}</span>{content}
    </label>
  );
  const selected = headings.find(x => x.key === active);
  const rowsSuppliers = suppliers.filter(item => matches([item.name, item.phone, item.email].join(' ')))
    .map(item => <tr key={item.id}>
      <td style={cell}><strong>{item.name}</strong></td>
      <td style={cell}>{item.phone || item.email || '—'}</td>
      <td style={cell}>{canFinance ? money(creditBySupplier.get(String(item.id))) : 'Restricted'}</td>
      <td style={cell}><Link to={'/stock?supplier=' + encodeURIComponent(item.id)} style={{ color: 'var(--primary)' }}>
        Inventory details <ArrowUpRight size={14} style={{ display: 'inline' }} />
      </Link></td>
    </tr>);
  const rowsCredits = credits.filter(item => matches([item.supplierName, item.purchaseNumber, item.status].join(' ')))
    .map(item => <tr key={item.id}>
      <td style={cell}><strong>{item.supplierName}</strong><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.purchaseNumber}</div></td>
      <td style={cell}>{money(item.total)}</td>
      <td style={cell}>{money(item.paid)}</td>
      <td style={cell}><strong>{money(item.outstanding)}</strong></td>
      <td style={cell}>{item.dueDate || '—'}</td>
      <td style={cell}>{item.status}</td>
      <td style={cell}>{canPay && available(item)
        ? <Link to={'/suppliers/payments?credit=' + encodeURIComponent(item.id)} style={{ color: 'var(--primary)' }}>Settle</Link>
        : '—'}</td>
    </tr>);
  const rowsPurchases = purchases.filter(item => matches([item.number, item.purchaseNo, labelOf(item, suppliers), item.status].join(' ')))
    .map(item => <tr key={item.id}>
      <td style={cell}>{item.number || item.purchaseNo || '—'}</td>
      <td style={cell}>{labelOf(item, suppliers)}</td>
      <td style={cell}>{item.status || '—'}</td>
      <td style={cell}>{money(item.total)}</td>
      <td style={cell}>{canFinance && creditPurchaseIds.has(String(item.id)) ? 'Credit registered' : '—'}</td>
    </tr>);
  const rowsPayments = payments.filter(item => matches([item.supplierName, item.purchaseNumber, item.reference, item.method].join(' ')))
    .map(item => <tr key={item.id}>
      <td style={cell}>{item.date}</td>
      <td style={cell}>{item.supplierName}</td>
      <td style={cell}>{item.purchaseNumber}</td>
      <td style={cell}>{money(item.amount)}</td>
      <td style={cell}>{item.method}</td>
      <td style={cell}>{item.reference || '—'}</td>
      <td style={cell}><Link to="/expenses" style={{ color: 'var(--primary)' }}>Expenses</Link></td>
    </tr>);

  return (
    <div style={{ display: 'grid', gap: 17, minWidth: 0, maxWidth: 1300 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
            <Truck size={21} aria-hidden="true" /><h1 style={{ margin: 0, fontSize: 23, fontWeight: 750 }}>{selected.title}</h1>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{columns[active].caption}</p>
        </div>
        <button type="button" onClick={reload} disabled={loading || saving} className="ui-button ui-button--secondary">
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>

      <nav aria-label="Supplier sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {headings.filter(item => featureAccess.can(item.key === 'credits' || item.key === 'payments' ? 'expenses.view' : 'stock.view'))
          .map(item => <Link key={item.key} to={item.path} aria-current={active === item.key ? 'page' : undefined}
            style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '6px 12px', borderRadius: 9,
              border: '1px solid var(--border)', textDecoration: 'none', fontSize: 13,
              background: active === item.key ? 'var(--primary-soft)' : 'var(--surface)',
              color: active === item.key ? 'var(--primary)' : 'var(--text-secondary)' }}>
            {item.title}
          </Link>)}
      </nav>

      {!canFinance && (active === 'all' || active === 'purchases') && (
        <p role="status" style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          Supplier balances require both Inventory View and Expenses View permission.
        </p>
      )}
      {error && <p role="alert" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center',
        color: 'var(--danger)', fontSize: 14 }}><AlertCircle size={17} />{error}</p>}
      {notice && <p role="status" style={{ margin: 0, color: 'var(--success)', fontSize: 14 }}>{notice}</p>}
      {loading && <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading supplier records…</p>}
      {!loading && active === 'all' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ ...box, padding: 15, minWidth: 180 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Suppliers</span>
              <div style={{ fontSize: 25, fontWeight: 750 }}>{suppliers.length}</div>
            </div>
            {canFinance && <div style={{ ...box, padding: 15, minWidth: 220 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total outstanding credits</span>
              <div style={{ fontSize: 25, fontWeight: 750 }}>{money(credits.reduce((sum, credit) => sum + num(credit.outstanding), 0))}</div>
            </div>}
          </div>
          {input('Search suppliers', <div style={{ position: 'relative', maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', top: 14, left: 12, color: 'var(--text-muted)' }} />
            <input aria-label="Search suppliers" style={{ ...field, paddingLeft: 38 }} placeholder="Name, phone or email"
              value={query} onChange={event => setQuery(event.target.value)} />
          </div>)}
          <RecordsTable headings={['Supplier', 'Contact', 'Outstanding', 'Inventory']} rows={rowsSuppliers} empty="No suppliers found." />
        </>
      )}
      {!loading && active === 'credits' && canFinance && (
        <>
          {canRegister && (
            <form onSubmit={onRegister} style={{ ...box, display: 'grid', gap: 12, padding: 16 }}>
              <strong style={{ fontSize: 15 }}>Register purchase credit</strong>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Only existing, fully received Purchase Orders appear here. A purchase can have one credit record.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
                <div style={{ flex: '1 1 250px', minWidth: 0 }}>
                  {input('Received Purchase Order', <select aria-label="Received Purchase Order" required style={field}
                    value={purchaseOrder} onChange={event => setPurchaseOrder(event.target.value)}>
                    <option value="">Select received purchase</option>
                    {creditEligible.map(order => <option key={order.id} value={order.id}>
                      {order.number || order.purchaseNo} — {labelOf(order, suppliers)} — {money(order.total)}
                    </option>)}
                  </select>)}
                </div>
                <div style={{ flex: '0 1 190px' }}>
                  {input('Due date (optional)', <input type="date" style={field}
                    value={dueDate} onChange={event => setDueDate(event.target.value)} />)}
                </div>
                <button type="submit" disabled={saving || !purchaseOrder} className="ui-button ui-button--primary">
                  {saving ? 'Saving…' : 'Register Credit'}
                </button>
              </div>
            </form>
          )}
          {input('Search credits', <input aria-label="Search credits" style={{ ...field, maxWidth: 360 }}
            placeholder="Supplier, PO or status" value={query} onChange={event => setQuery(event.target.value)} />)}
          <RecordsTable headings={['Supplier / Purchase', 'Purchase Total', 'Paid', 'Outstanding', 'Due', 'Status', 'Action']}
            rows={rowsCredits} empty="No supplier credits registered. Register a received purchase above." />
        </>
      )}
      {!loading && active === 'purchases' && (
        <>
          {input('Search purchase history', <input aria-label="Search purchase history"
            style={{ ...field, maxWidth: 360 }} placeholder="Purchase number, supplier or status"
            value={query} onChange={event => setQuery(event.target.value)} />)}
          <RecordsTable headings={['Purchase Order', 'Supplier', 'Status', 'Total', 'Credit']}
            rows={rowsPurchases} empty="No purchase orders found in Inventory." />
        </>
      )}
      {!loading && active === 'payments' && canFinance && (
        <>
          {canPay && (
            <form onSubmit={onSettle} style={{ ...box, padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} aria-hidden="true" /><strong>Record supplier settlement</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 12 }}>
                {input('Outstanding credit', <select aria-label="Outstanding credit" required style={field} value={pay.credit}
                  onChange={event => setPay(values => ({ ...values, credit: event.target.value, amount: '' }))}>
                  <option value="">Select credit</option>
                  {payableCredits.map(item => <option key={item.id} value={item.id}>
                    {item.supplierName} — {item.purchaseNumber} — {money(item.outstanding)}
                  </option>)}
                </select>)}
                {input('Payment amount', <input aria-label="Payment amount" required type="number" min="0.01" step="0.01"
                  max={selectedCredit ? String(selectedCredit.outstanding) : undefined}
                  value={pay.amount} onChange={event => setPay(values => ({ ...values, amount: event.target.value }))}
                  style={field} placeholder="Amount" />)}
                {input('Payment method', <select aria-label="Payment method" style={field}
                  value={pay.method} onChange={event => setPay(values => ({ ...values, method: event.target.value, reference: '' }))}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="UPI">UPI</option>
                </select>)}
                {input('Reference', <input aria-label="Payment reference" style={field} value={pay.reference}
                  required={pay.method !== 'Cash'} placeholder={pay.method === 'Cash' ? 'Optional' : 'Required bank/UPI reference'}
                  onChange={event => setPay(values => ({ ...values, reference: event.target.value }))} />)}
              </div>
              {selectedCredit && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Available to settle: <strong>{money(selectedCredit.outstanding)}</strong>
              </div>}
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>
                The payment is recorded in Expenses and linked to this credit. Bank/UPI method selection does not reconcile a bank account.
              </p>
              <button type="submit" disabled={saving || !selectedCredit} className="ui-button ui-button--primary"
                style={{ justifySelf: 'start' }}><CreditCard size={17} aria-hidden="true" />
                {saving ? 'Recording…' : 'Record Partial / Full Payment'}
              </button>
            </form>
          )}
          {input('Search payments', <input aria-label="Search supplier payments" style={{ ...field, maxWidth: 360 }}
            placeholder="Supplier, PO, method or reference" value={query}
            onChange={event => setQuery(event.target.value)} />)}
          <RecordsTable headings={['Date', 'Supplier', 'Purchase', 'Amount', 'Method', 'Reference', 'Ledger']}
            rows={rowsPayments} empty="No supplier payments recorded." />
        </>
      )}
      {!canFinance && (active === 'credits' || active === 'payments') && (
        <div role="alert" style={{ ...box, padding: 18, color: 'var(--text-secondary)' }}>
          Inventory View and Expenses View permissions are required to see supplier finance.
        </div>
      )}
    </div>
  );
}
