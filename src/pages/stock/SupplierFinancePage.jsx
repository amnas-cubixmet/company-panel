import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Plus, RefreshCw, Wallet } from 'lucide-react';
import { supplierFinanceService as finance } from '../../services/supplierFinance.service';

const field = 'w-full min-w-0 min-h-12 rounded-xl border border-line bg-surface px-3 py-2 text-base text-content outline-none focus:border-primary';
const secondary = 'min-h-11 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-content disabled:opacity-50';
const primary = 'min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const box = 'rounded-2xl border border-line bg-surface p-4';
const today = () => new Date().toLocaleDateString('en-CA');
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const line = () => ({ itemId: '', description: '', quantity: '1', purchaseRate: '', gstRate: '0' });
const paymentKey = () => globalThis.crypto?.randomUUID?.() || ('PAY-' + Date.now() + '-' + Math.random().toString(36).slice(2));

export default function SupplierFinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [supplierDraft, setSupplierDraft] = useState({ name: '', phone: '', gstNo: '' });
  const [accountDraft, setAccountDraft] = useState({ name: '', kind: 'Cash', openingBalance: '0' });
  const [draft, setDraft] = useState({
    invoiceNumber: '', invoiceDate: today(), dueDate: '', receiveIntoStock: false,
    lines: [line()],
  });
  const [paymentDraft, setPaymentDraft] = useState({
    kind: 'Payment', accountId: '', method: 'Bank Transfer', amount: '',
    paidOn: today(), reference: '', allocations: {},
  });
  const [applyDraft, setApplyDraft] = useState({ paymentId: '', billId: '', amount: '' });
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get('tab');
    return ['overview', 'bill', 'payment', 'accounts'].includes(requested) ? requested : 'overview';
  });
  const requestKey = useRef(paymentKey());
  const inFlight = useRef(false);

  const refresh = useCallback(async (supplierId = selectedSupplier) => {
    const [supplierData, accountData, billData, paymentData, productData] = await Promise.all([
      finance.getSuppliers(), finance.getAccounts(), finance.getBills(),
      finance.getPayments(), finance.getInventoryItems(),
    ]);
    setSuppliers(supplierData);
    setAccounts(accountData);
    setBills(billData);
    setPayments(paymentData);
    setInventory(productData);
    const target = supplierId || supplierData[0]?.id || '';
    setSelectedSupplier(target);
    setPaymentDraft((old) => ({ ...old, accountId: old.accountId || accountData[0]?.id || '' }));
    if (target) {
      const [details, activity] = await Promise.all([
        finance.getSupplierSummary(target), finance.getSupplierLedger(target),
      ]);
      setSummary(details);
      setLedger(activity);
    } else {
      setSummary(null);
      setLedger(null);
    }
  }, [selectedSupplier]);

  useEffect(() => {
    let valid = true;
    setLoading(true);
    refresh().catch((exception) => {
      if (valid) setError(exception?.message || 'Unable to load supplier accounting.');
    }).finally(() => { if (valid) setLoading(false); });
    return () => { valid = false; };
    // Changing the supplier uses the explicit selector below; never refetch on every state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSupplier = async (id) => {
    setSelectedSupplier(id);
    setError('');
    setNotice('');
    if (!id) { setSummary(null); setLedger(null); return; }
    try {
      const [details, activity] = await Promise.all([
        finance.getSupplierSummary(id), finance.getSupplierLedger(id),
      ]);
      setSummary(details); setLedger(activity);
    } catch (exception) {
      setError(exception?.message || 'Supplier records could not be loaded.');
    }
  };

  const run = async (label, task, success) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label); setError(''); setNotice('');
    try {
      const nextSupplierId = await task();
      setNotice(success);
      try {
        await refresh(typeof nextSupplierId === 'string' ? nextSupplierId : selectedSupplier);
      } catch (refreshError) {
        setError('Saved successfully, but the latest records could not be refreshed: ' +
          (refreshError?.message || 'Please refresh this page.'));
      }
    } catch (exception) {
      setError(exception?.message || 'Unable to save. Please review the current record before retrying.');
    } finally {
      setBusy(''); inFlight.current = false;
    }
  };

  const supplierBills = useMemo(() => bills.filter((b) => b.supplierId === selectedSupplier), [bills, selectedSupplier]);
  const outstandingBills = supplierBills.filter((b) => b.postingStatus === 'Posted' && Number(b.outstanding) > 0);
  const advances = payments.filter((p) => p.supplierId === selectedSupplier && p.kind === 'Advance' && Number(p.unapplied) > 0);
  const account = accounts.find((a) => a.id === paymentDraft.accountId);
  const selectedSupplierName = suppliers.find((s) => s.id === selectedSupplier)?.name || 'Supplier';
  const posting = Boolean(busy);

  const createSupplier = (event) => {
    event.preventDefault();
    run('supplier', async () => {
      const created = await finance.addSupplier(supplierDraft);
      setSupplierDraft({ name: '', phone: '', gstNo: '' });
      return created.id;
    }, 'Supplier saved.');
  };

  const createAccount = (event) => {
    event.preventDefault();
    run('account', () => finance.createAccount(accountDraft), 'Recorded financial account created.');
  };

  const updateLine = (index, patch) => setDraft((prev) => ({
    ...prev,
    lines: prev.lines.map((row, pos) => pos === index ? { ...row, ...patch } : row),
  }));

  const createBill = (event) => {
    event.preventDefault();
    run('bill', async () => {
      await finance.createBill({
        supplierId: selectedSupplier, invoiceNumber: draft.invoiceNumber.trim(),
        invoiceDate: draft.invoiceDate, dueDate: draft.dueDate || null,
        receiveIntoStock: draft.receiveIntoStock,
        items: draft.lines.map((row) => ({
          ...row, itemId: row.itemId || null,
          description: row.description.trim(),
        })),
      });
      setDraft({ invoiceNumber: '', invoiceDate: today(), dueDate: '', receiveIntoStock: false, lines: [line()] });
      setActiveTab('overview');
    }, 'Supplier bill saved as Draft. Posting is required to create liability and receive stock.');
  };

  const paySupplier = (event) => {
    event.preventDefault();
    const allocations = paymentDraft.kind === 'Advance' ? [] : outstandingBills
      .filter((bill) => Number(paymentDraft.allocations[bill.id] || 0) > 0)
      .map((bill) => ({ billId: bill.id, amount: paymentDraft.allocations[bill.id] }));
    run('payment', async () => {
      await finance.recordPayment({
        supplierId: selectedSupplier, accountId: paymentDraft.accountId,
        kind: paymentDraft.kind, method: paymentDraft.method, amount: paymentDraft.amount,
        paidOn: paymentDraft.paidOn, reference: paymentDraft.reference,
        idempotencyKey: requestKey.current, allocations,
      });
      requestKey.current = paymentKey();
      setPaymentDraft((old) => ({ ...old, amount: '', reference: '', allocations: {} }));
    }, 'Supplier payment recorded in the selected account ledger.');
  };

  const applyAdvance = (event) => {
    event.preventDefault();
    run('advance', () => finance.applyAdvance(applyDraft.paymentId, {
      billId: applyDraft.billId, amount: applyDraft.amount,
    }).then(() => setApplyDraft({ paymentId: '', billId: '', amount: '' })),
    'Advance applied against the supplier bill. No second bank deduction was made.');
  };

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 p-3 pb-24 text-content md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/stock" className="text-sm font-semibold text-primary">Inventory Management</Link>
          <h1 className="mt-1 text-2xl font-bold text-content">Supplier Credit & Payments</h1>
          <p className="mt-1 text-sm text-muted">Purchases, payables and recorded cash / bank entries.</p>
        </div>
        <button type="button" className={secondary} disabled={posting || loading}
          onClick={() => run('refresh', () => refresh(), 'Supplier records refreshed.')}>
          <span className="inline-flex items-center gap-2"><RefreshCw size={16}/> Refresh</span>
        </button>
      </header>

      {loading && <p role="status" className={box}>Loading supplier records…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-500/30 p-3 text-sm text-red-600">{error}</div>}
      {notice && <div role="status" className={box}><CheckCircle2 size={16} className="inline text-primary"/> {notice}</div>}

      <section className={box}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">
            Supplier
            <select value={selectedSupplier} onChange={(event) => selectSupplier(event.target.value)} className={field}>
              {!suppliers.length && <option value="">No suppliers yet</option>}
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <details className="min-w-0 md:w-64">
            <summary className={secondary + ' cursor-pointer'}>+ Add Supplier</summary>
            <form className="mt-3 grid gap-2" onSubmit={createSupplier}>
              <input required maxLength={180} className={field} placeholder="Supplier name" aria-label="New supplier name"
                value={supplierDraft.name} onChange={(event) => setSupplierDraft({ ...supplierDraft, name: event.target.value })}/>
              <input className={field} placeholder="Mobile number" aria-label="New supplier mobile"
                value={supplierDraft.phone} onChange={(event) => setSupplierDraft({ ...supplierDraft, phone: event.target.value })}/>
              <input className={field} placeholder="GSTIN (optional)" aria-label="New supplier GSTIN"
                value={supplierDraft.gstNo} onChange={(event) => setSupplierDraft({ ...supplierDraft, gstNo: event.target.value })}/>
              <button type="submit" disabled={posting} className={primary}>Save Supplier</button>
            </form>
          </details>
        </div>
      </section>

      {summary && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ['Purchase total', summary.totalPurchases], ['Outstanding', summary.outstanding],
            ['Applied payments', summary.totalPaymentsApplied], ['Available advance', summary.availableAdvance],
          ].map(([name, amount]) => (
            <div key={name} className={box + ' min-w-0'}>
              <span className="block text-xs font-medium text-muted">{name}</span>
              <strong className="mt-1 block break-all text-lg">{money(amount)}</strong>
            </div>
          ))}
        </div>
      )}

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Supplier accounting sections">
        {[
          ['overview', 'Bills & Ledger'], ['bill', 'New Purchase'],
          ['payment', 'Pay Supplier'], ['accounts', 'Cash / Bank'],
        ].map(([value, label]) => (
          <button type="button" key={value} onClick={() => setActiveTab(value)}
            aria-pressed={activeTab === value}
            className={(activeTab === value ? primary : secondary) + ' whitespace-normal'}>
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="grid gap-4">
          <section className={box}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Purchase Bills — {selectedSupplierName}</h2>
              <button className={secondary} type="button" onClick={() => setActiveTab('bill')}>+ New Purchase</button>
            </div>
            <div className="mt-3 grid gap-2">
              {supplierBills.map((bill) => (
                <article key={bill.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <strong>{bill.invoiceNumber}</strong>
                    <p className="text-sm text-muted">{bill.status} · {bill.invoiceDate} · {bill.receiveIntoStock ? 'Inventory receipt' : 'Direct purchase'}</p>
                    <p className="text-sm">Total {money(bill.total)} · Due {money(bill.outstanding)}</p>
                  </div>
                  {bill.postingStatus === 'Draft' && <button type="button" disabled={posting}
                    className={primary}
                    onClick={() => run('post', () => finance.postBill(bill.id), 'Purchase bill posted. Supplier liability and inventory receipt (if selected) recorded exactly once.')}>
                    {busy === 'post' ? 'Posting…' : 'Confirm & Post Bill'}
                  </button>}
                </article>
              ))}
              {!supplierBills.length && <p className="py-5 text-sm text-muted">No purchase bills recorded for this supplier.</p>}
            </div>
          </section>
          <section className={box}>
            <h2 className="text-lg font-bold">Supplier Ledger</h2>
            <p className="mt-1 text-xs text-muted">Positive balance = amount payable to supplier. Advances remain separate until applied.</p>
            <div className="mt-3 grid gap-2">
              {(ledger?.entries || []).map((entry, index) => (
                <div key={entry.sourceId + '-' + index} className="grid grid-cols-2 gap-2 border-b border-line py-2 text-sm md:grid-cols-4">
                  <span><strong>{entry.type}</strong><small className="block text-muted">{entry.reference}</small></span>
                  <span className="text-muted">{new Date(entry.date).toLocaleDateString()}</span>
                  <span>+{money(entry.payableIncrease)} / −{money(entry.payableDecrease)}</span>
                  <strong>Due {money(entry.runningPayable)}</strong>
                </div>
              ))}
              {!ledger?.entries?.length && <p className="py-3 text-sm text-muted">No posted financial transactions.</p>}
            </div>
          </section>
          {!!advances.length && <section className={box}>
            <h2 className="text-lg font-bold">Apply Supplier Advance</h2>
            <form onSubmit={applyAdvance} className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">Advance
                <select className={field} required value={applyDraft.paymentId}
                  onChange={(event) => setApplyDraft({ ...applyDraft, paymentId: event.target.value })}>
                  <option value="">Choose advance</option>
                  {advances.map((advance) => <option key={advance.id} value={advance.id}>Available {money(advance.unapplied)} · {advance.paidOn}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">Outstanding bill
                <select className={field} required value={applyDraft.billId}
                  onChange={(event) => setApplyDraft({ ...applyDraft, billId: event.target.value })}>
                  <option value="">Choose bill</option>
                  {outstandingBills.map((bill) => <option key={bill.id} value={bill.id}>{bill.invoiceNumber} · {money(bill.outstanding)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">Apply amount
                <input required type="number" min="0.01" step="0.01" className={field}
                  value={applyDraft.amount} onChange={(event) => setApplyDraft({ ...applyDraft, amount: event.target.value })}/>
              </label>
              <button className={primary + ' md:col-span-3'} disabled={posting} type="submit">Apply Advance (No Additional Bank Debit)</button>
            </form>
          </section>}
        </div>
      )}

      {activeTab === 'bill' && (
        <form className={box + ' grid gap-4'} onSubmit={createBill}>
          <h2 className="text-lg font-bold">New Supplier Purchase — Draft</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">Supplier invoice number
              <input className={field} required maxLength={100} value={draft.invoiceNumber}
                onChange={(event) => setDraft({ ...draft, invoiceNumber: event.target.value })}/>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Invoice date
              <input className={field} type="date" required value={draft.invoiceDate}
                onChange={(event) => setDraft({ ...draft, invoiceDate: event.target.value })}/>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Due date (optional)
              <input className={field} type="date" value={draft.dueDate}
                onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}/>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.receiveIntoStock}
              onChange={(event) => setDraft({ ...draft, receiveIntoStock: event.target.checked })}/>
            Receive products into Inventory only when this bill is posted
          </label>
          {draft.lines.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="grid gap-1 text-sm lg:col-span-2">Inventory product (optional for direct purchases)
                <select className={field} value={row.itemId}
                  onChange={(event) => {
                    const item = inventory.find((record) => record.id === event.target.value);
                    updateLine(index, {
                      itemId: event.target.value, description: item?.partName || item?.name || row.description,
                      purchaseRate: item?.costPrice || item?.cost || row.purchaseRate,
                      gstRate: item?.tax || row.gstRate,
                    });
                  }}>
                  <option value="">Custom / direct purchase</option>
                  {inventory.map((item) => <option key={item.id} value={item.id}>{item.partName || item.name} · {item.sku}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">Product name
                <input className={field} required maxLength={180} value={row.description}
                  onChange={(event) => updateLine(index, { description: event.target.value })}/>
              </label>
              <label className="grid gap-1 text-sm">Quantity
                <input className={field} type="number" required min="0.01" step="0.01" value={row.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}/>
              </label>
              <label className="grid gap-1 text-sm">Purchase rate (₹)
                <input className={field} type="number" required min="0" step="0.01" value={row.purchaseRate}
                  onChange={(event) => updateLine(index, { purchaseRate: event.target.value })}/>
              </label>
              <label className="grid gap-1 text-sm">GST %
                <select className={field} value={row.gstRate} onChange={(event) => updateLine(index, { gstRate: event.target.value })}>
                  {['0', '5', '12', '18', '28'].map((rate) => <option key={rate} value={rate}>{rate === '0' ? 'None / 0%' : rate + '%'}</option>)}
                </select>
              </label>
              {draft.lines.length > 1 && <button className={secondary} type="button"
                onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== index) })}>Remove line</button>}
            </div>
          ))}
          <button type="button" className={secondary} onClick={() => setDraft({ ...draft, lines: [...draft.lines, line()] })}>
            <span className="inline-flex items-center gap-2"><Plus size={16}/> Add Product Line</span>
          </button>
          <p className="text-xs text-muted">Totals are calculated on the server. A Draft does not create stock or supplier debt. Confirm posting after review.</p>
          <button className={primary} disabled={posting || !selectedSupplier} type="submit">
            {busy === 'bill' ? 'Saving…' : 'Save Draft Purchase Bill'}
          </button>
        </form>
      )}

      {activeTab === 'payment' && (
        <form className={box + ' grid gap-4'} onSubmit={paySupplier}>
          <div><h2 className="text-lg font-bold">Pay Supplier — {selectedSupplierName}</h2>
            <p className="text-sm text-muted">Outstanding: {money(summary?.outstanding)} · Advance: {money(summary?.availableAdvance)}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">Payment type
              <select value={paymentDraft.kind} className={field} onChange={(event) =>
                setPaymentDraft({ ...paymentDraft, kind: event.target.value, allocations: {} })}>
                <option value="Payment">Pay Outstanding Bills</option>
                <option value="Advance">Advance Payment</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Payment account
              <select required value={paymentDraft.accountId} className={field} onChange={(event) => {
                const selected = accounts.find((x) => x.id === event.target.value);
                setPaymentDraft({ ...paymentDraft, accountId: event.target.value,
                  method: selected?.kind === 'Cash' ? 'Cash' : selected?.kind === 'UPI' ? 'UPI' : 'Bank Transfer' });
              }}>
                <option value="">Choose account</option>
                {accounts.filter((x) => x.isActive).map((a) =>
                  <option key={a.id} value={a.id}>{a.name} · Recorded {money(a.recordedBalance)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Method
              <select value={paymentDraft.method} className={field} onChange={(event) =>
                setPaymentDraft({ ...paymentDraft, method: event.target.value })}>
                {['Cash', 'Bank Transfer', 'UPI'].map((method) => <option key={method}>{method}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Amount (₹)
              <input required min="0.01" step="0.01" type="number" className={field}
                value={paymentDraft.amount} onChange={(event) =>
                  setPaymentDraft({ ...paymentDraft, amount: event.target.value })}/>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Payment date
              <input type="date" required className={field} value={paymentDraft.paidOn}
                onChange={(event) => setPaymentDraft({ ...paymentDraft, paidOn: event.target.value })}/>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Reference (optional)
              <input className={field} maxLength={120} value={paymentDraft.reference}
                onChange={(event) => setPaymentDraft({ ...paymentDraft, reference: event.target.value })}/>
            </label>
          </div>
          {paymentDraft.kind === 'Payment' && <div className="grid gap-2">
            <strong className="text-sm">Allocate payment across posted bills</strong>
            {outstandingBills.map((bill) => <label key={bill.id} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2 sm:items-center">
              <span className="text-sm">{bill.invoiceNumber} · Due {money(bill.outstanding)}</span>
              <input className={field} type="number" min="0" max={bill.outstanding} step="0.01"
                value={paymentDraft.allocations[bill.id] || ''}
                placeholder="Allocate amount (₹)"
                onChange={(event) => setPaymentDraft((prev) => ({
                  ...prev, allocations: { ...prev.allocations, [bill.id]: event.target.value },
                }))}/>
            </label>)}
            {!outstandingBills.length && <p className="text-sm text-muted">No posted bills remain unpaid. Use Advance Payment if appropriate.</p>}
            <p className="text-xs text-muted">Allocations must equal the payment amount. The server checks every outstanding bill.</p>
          </div>}
          <p className="text-xs text-muted">This reduces only the selected recorded account ledger. It is not a real-time bank balance.</p>
          <button className={primary} type="submit" disabled={posting || !selectedSupplier || !paymentDraft.accountId ||
            !paymentDraft.amount || (paymentDraft.kind === 'Payment' && !outstandingBills.length)}>
            {busy === 'payment' ? 'Posting payment…' : 'Confirm Supplier Payment'}
          </button>
        </form>
      )}

      {activeTab === 'accounts' && <div className="grid gap-4">
        <section className={box}>
          <h2 className="text-lg font-bold">Recorded Cash & Bank Accounts</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {accounts.map((a) => <div key={a.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-line p-3">
              {a.kind === 'Cash' ? <Wallet size={18}/> : <CreditCard size={18}/>}
              <div className="min-w-0"><strong>{a.name}</strong><p className="text-xs text-muted">{a.kind} · Recorded balance</p>
                <strong>{money(a.recordedBalance)}</strong></div>
            </div>)}
            {!accounts.length && <p className="text-sm text-muted">No recorded financial accounts yet.</p>}
          </div>
        </section>
        <form className={box + ' grid gap-3 sm:grid-cols-3'} onSubmit={createAccount}>
          <h3 className="text-lg font-bold sm:col-span-3">Add Financial Account</h3>
          <label className="grid gap-1 text-sm">Account name
            <input required maxLength={120} className={field} value={accountDraft.name}
              onChange={(event) => setAccountDraft({ ...accountDraft, name: event.target.value })}/>
          </label>
          <label className="grid gap-1 text-sm">Type
            <select className={field} value={accountDraft.kind}
              onChange={(event) => setAccountDraft({ ...accountDraft, kind: event.target.value })}>
              {['Cash', 'Bank', 'UPI'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Opening recorded balance
            <input required type="number" min="0" step="0.01" className={field} value={accountDraft.openingBalance}
              onChange={(event) => setAccountDraft({ ...accountDraft, openingBalance: event.target.value })}/>
          </label>
          <button type="submit" className={primary + ' sm:col-span-3'} disabled={posting}>Create Account</button>
          <p className="text-xs text-muted sm:col-span-3">Opening balances are recorded snapshots; never label them as synced live bank balances.</p>
        </form>
      </div>}

      <footer className="text-xs text-muted">
        Supplier payments settle liabilities; they are not a second purchase expense.
        Customer invoice selling rates remain separate from supplier purchase costs.
      </footer>
    </main>
  );
}
