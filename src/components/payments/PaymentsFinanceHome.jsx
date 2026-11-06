import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { financeService } from '../../services/finance.service';
import { appConfirm } from '../common/appDialogs';
import '../../styles/payments-finance-home.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const fmt = value => money.format(Number(value || 0));
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
const moneyValid = value => /^\d+(?:\.\d{1,2})?$/.test(String(value)) && Number(value) > 0;
const message = err => {
  const data = err?.response?.data || err?.data;
  const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
  return (Array.isArray(first) ? first[0] : first) || data?.detail || err?.message || 'Request failed.';
};

export default function PaymentsFinanceHome({ refreshKey = 0, canEdit = false, onUpdated = () => {} }) {
  const [date, setDate] = useState(today);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [period, setPeriod] = useState('month');
  const [rangeFrom, setRangeFrom] = useState(today().slice(0, 7) + '-01');
  const [rangeTo, setRangeTo] = useState(today);
  const [page, setPage] = useState(1);
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [created, setCreated] = useState({
    name: '', kind: 'Bank', bankName: '', openingBalance: '0', openingDate: today(),
  });
  const [adjust, setAdjust] = useState({ account: '', direction: 'credit', amount: '', reason: '' });
  const change = (setter, key, value) => setter(old => ({ ...old, [key]: value }));
  const reload = () => setReloadKey(value => value + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    financeService.getPaymentsOverview({ date }).then(result => {
      if (alive) setOverview(result);
    }).catch(err => {
      if (alive) { setError(message(err)); setOverview(null); }
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [date, refreshKey, reloadKey]);

  const ledgerFilters = useMemo(() => {
    const d = today();
    const span = period === 'today' ? { from: d, to: d } :
      period === 'month' ? { from: d.slice(0, 7) + '-01', to: d } :
      period === 'custom' ? {
        ...(rangeFrom ? { from: rangeFrom } : {}), ...(rangeTo ? { to: rangeTo } : {}),
      } : {};
    return { ...span, ...(accountFilter ? { account: accountFilter } : {}) };
  }, [period, rangeFrom, rangeTo, accountFilter]);

  useEffect(() => {
    let alive = true;
    setLedgerLoading(true); setLedgerError('');
    financeService.getLedger({ ...ledgerFilters, page, page_size: 25 }).then(rows => {
      if (alive) setLedger(rows);
    }).catch(err => {
      if (alive) { setLedgerError(message(err)); setLedger(null); }
    }).finally(() => { if (alive) setLedgerLoading(false); });
    return () => { alive = false; };
  }, [ledgerFilters, page, refreshKey, reloadKey]);

  const createAccount = async event => {
    event.preventDefault();
    if (busy) return;
    setFormError(''); setFormSuccess('');
    if (!created.name.trim() || !/^\d+(?:\.\d{1,2})?$/.test(created.openingBalance)) {
      setFormError('Enter account name and opening balance with at most two decimal places.'); return;
    }
    setBusy(true);
    try {
      await financeService.createAccount({ ...created, name: created.name.trim() });
      setCreated({ name: '', kind: 'Bank', bankName: '', openingBalance: '0', openingDate: today() });
      setMode(''); setFormSuccess('Account and opening balance recorded.');
      reload(); onUpdated();
    } catch (err) { setFormError(message(err)); }
    finally { setBusy(false); }
  };

  const postAdjustment = async event => {
    event.preventDefault();
    if (busy) return;
    setFormError(''); setFormSuccess('');
    if (!adjust.account || !moneyValid(adjust.amount) || !adjust.reason.trim()) {
      setFormError('Select account, valid amount and audit reason.'); return;
    }
    if (!await appConfirm('Post this audited adjustment? The calculated balance is not overwritten.', {
      title: 'Account Balance Adjustment', confirmLabel: 'Post Adjustment',
    })) return;
    setBusy(true);
    try {
      await financeService.adjustBalance(adjust.account, {
        amount: adjust.amount, direction: adjust.direction, reason: adjust.reason.trim(),
      });
      setAdjust({ account: '', direction: 'credit', amount: '', reason: '' });
      setMode(''); setFormSuccess('Adjustment posted with an audit reason.');
      reload(); onUpdated();
    } catch (err) { setFormError(message(err)); }
    finally { setBusy(false); }
  };

  const exportLedger = async format => {
    if (exporting) return;
    setExporting(true); setLedgerError('');
    try {
      if (format === 'csv') await financeService.exportLedgerCSV(ledgerFilters);
      else await financeService.exportLedgerPDF(ledgerFilters);
    } catch (err) { setLedgerError(message(err)); }
    finally { setExporting(false); }
  };

  const stats = overview ? [
    ['Bank Balance', overview.bankBalance, 'Internal bank accounts'],
    ['Cash Balance', overview.cashBalance, 'Cash in hand'],
    ['UPI Balance', overview.upiBalance, 'UPI funds'],
    ['Received on Date', overview.todayReceived, 'Customer collections'],
    ['Paid on Date', overview.todayPaid, 'Supplier, expense, wage payouts'],
    ['Net Cash Movement', overview.todayNetCashFlow, 'After reversals, excludes transfers'],
  ] : [];

  return <div className="payments-finance-home">
    <section className="payments-finance-section" aria-label="Finance and payments summary">
      <div className="payments-finance-heading">
        <div><h2>Payment & Bank Overview</h2>
          <p>Account balances and daily money movement from real workshop ledger entries.</p></div>
        <label>Day <input type="date" aria-label="Finance summary date" value={date}
          onChange={event => setDate(event.target.value)} /></label>
        <button type="button" onClick={reload} disabled={loading}><RefreshCw size={16}/> Refresh</button>
      </div>
      {error && <p className="payments-finance-error" role="alert">{error}</p>}
      {loading && !overview && <p role="status">Loading account balances…</p>}
      <div className="payments-finance-stats">
        {stats.map(([title, value, description]) => <article key={title}>
          <span>{title}</span><strong>{fmt(value)}</strong><small>{description}</small>
        </article>)}
      </div>
      {overview && <p className="payments-finance-note">
        Total book funds: {fmt(overview.totalBookBalance)} · Other/Wallet: {fmt(overview.otherBalance)}.
        These are internal bookkeeping balances, not live bank data.
      </p>}
    </section>
    <section className="payments-finance-section" aria-label="Total revenue expenses and profit">
      <div className="payments-finance-heading"><div><h2>Revenue, Expenses & Profit</h2>
        <p>All-time invoice-based performance — separate from payments received and cash outflows.</p></div></div>
      {overview?.performance ? <>
        <div className="payments-finance-stats">
          {[
            ['Revenue (ex-GST)', overview.performance.revenue],
            ['Workshop Expenses', overview.performance.operatingExpenses],
            ['Parts Cost Sold', overview.performance.costOfPartsSold],
            ['Total Known Expenses', overview.performance.totalKnownExpenses],
            ['Estimated Profit', overview.performance.estimatedProfit],
          ].map(([name, amount]) => <article key={name}>
            <span>{name}</span><strong>{fmt(amount)}</strong>
          </article>)}
        </div>
        <p className="payments-finance-note"><strong>Estimated profit, not audited profit.</strong>
          {' ' + overview.performance.note}
          {Number(overview.performance.missingStockCosts) > 0 &&
            ' ' + overview.performance.missingStockCosts + ' sold stock lines have missing cost prices.'}
        </p>
      </> : overview && <p className="payments-finance-note">
        {overview.performanceAccessNote || 'Profitability details unavailable.'}
      </p>}
    </section>

    <section className="payments-finance-section" aria-label="Bank cash UPI account management">
      <div className="payments-finance-heading">
        <div><h2>Bank, Cash & UPI Accounts</h2>
          <p>Collections add money; actual payments deduct money. Balance adjustments are audited.</p></div>
        {canEdit && <div className="payments-finance-actions">
          <button type="button" onClick={() => { setMode(mode === 'create' ? '' : 'create'); setFormError(''); }}>
            <Plus size={16}/> Add Account
          </button>
          <button type="button" onClick={() => { setMode(mode === 'adjust' ? '' : 'adjust'); setFormError(''); }}>
            Adjust Bank Balance
          </button>
        </div>}
      </div>
      <div className="payments-finance-accounts">
        {overview?.accounts?.map(account => <article key={account.id}>
          <span>{account.name} ({account.kind}) {!account.isActive && '— Inactive'}</span>
          <strong>{fmt(account.balance)}</strong>
          <small>Opening balance: {fmt(account.openingBalance)}</small>
        </article>)}
      </div>
      {overview && overview.accounts.length === 0 &&
        <p className="payments-finance-note">No account configured yet. Create one to track payments.</p>}
      {formError && <p className="payments-finance-error" role="alert">{formError}</p>}
      {formSuccess && <p className="payments-finance-success" role="status">{formSuccess}</p>}
      {mode === 'create' && canEdit && <form className="payments-finance-form" onSubmit={createAccount}>
        <h3>Add Financial Account</h3>
        <label>Account Name *<input required value={created.name}
          onChange={e => change(setCreated, 'name', e.target.value)} /></label>
        <label>Account Type *<select value={created.kind}
          onChange={e => change(setCreated, 'kind', e.target.value)}>
          {['Bank', 'Cash', 'UPI', 'Wallet', 'Other'].map(k => <option key={k}>{k}</option>)}
        </select></label>
        {created.kind === 'Bank' && <label>Bank Name
          <input value={created.bankName} onChange={e => change(setCreated, 'bankName', e.target.value)} />
        </label>}
        <label>Opening Balance (₹) *<input required type="number" min="0" step="0.01"
          value={created.openingBalance} onChange={e => change(setCreated, 'openingBalance', e.target.value)} /></label>
        <label>Opening Date *<input required type="date" value={created.openingDate}
          onChange={e => change(setCreated, 'openingDate', e.target.value)} /></label>
        <div className="payments-finance-actions">
          <button type="button" onClick={() => setMode('')}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        </div>
      </form>}
      {mode === 'adjust' && canEdit && <form className="payments-finance-form" onSubmit={postAdjustment}>
        <h3>Audited Balance Correction</h3>
        <p>Never replace a running balance directly. Every adjustment creates a ledger entry.</p>
        <label>Account *<select required value={adjust.account}
          onChange={e => change(setAdjust, 'account', e.target.value)}>
          <option value="">Choose account</option>
          {overview?.accounts?.filter(a => a.isActive).map(a =>
            <option value={a.id} key={a.id}>{a.name} — {fmt(a.balance)}</option>)}
        </select></label>
        <label>Direction *<select value={adjust.direction}
          onChange={e => change(setAdjust, 'direction', e.target.value)}>
          <option value="credit">Add funds / Credit</option>
          <option value="debit">Reduce funds / Debit</option>
        </select></label>
        <label>Amount (₹) *<input required type="number" min="0.01" step="0.01"
          value={adjust.amount} onChange={e => change(setAdjust, 'amount', e.target.value)} /></label>
        <label>Mandatory Audit Reason *<input required maxLength={120} value={adjust.reason}
          onChange={e => change(setAdjust, 'reason', e.target.value)} /></label>
        <div className="payments-finance-actions">
          <button type="button" onClick={() => setMode('')}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post Adjustment'}</button>
        </div>
      </form>}
    </section>

    <section className="payments-finance-section" aria-label="Account transaction logs">
      <div className="payments-finance-heading">
        <div><h2>Account Transaction Log</h2>
          <p>Customer receipts, supplier/expense payments, transfers and all ledger adjustments.</p></div>
        <div className="payments-finance-actions">
          <button type="button" disabled={exporting} onClick={() => exportLedger('csv')}><Download size={16}/> CSV</button>
          <button type="button" disabled={exporting} onClick={() => exportLedger('pdf')}><Download size={16}/> PDF</button>
        </div>
      </div>
      <div className="payments-finance-filters">
        <label>Account <select aria-label="Filter ledger by account" value={accountFilter}
          onChange={e => { setAccountFilter(e.target.value); setPage(1); }}>
          <option value="">All Accounts</option>
          {overview?.accounts?.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}
        </select></label>
        <label>Date Range <select aria-label="Filter ledger by date" value={period}
          onChange={e => { setPeriod(e.target.value); setPage(1); }}>
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="all">All History</option>
          <option value="custom">Custom Range</option>
        </select></label>
        {period === 'custom' && <>
          <label>From<input type="date" value={rangeFrom}
            onChange={e => { setRangeFrom(e.target.value); setPage(1); }} /></label>
          <label>To<input type="date" value={rangeTo}
            onChange={e => { setRangeTo(e.target.value); setPage(1); }} /></label>
        </>}
      </div>
      {ledgerError && <p className="payments-finance-error" role="alert">{ledgerError}</p>}
      {ledgerLoading ? <p role="status">Loading transaction log…</p> :
        ledger?.results?.length ? <div className="payments-finance-ledger-wrap">
          <table className="payments-finance-ledger">
            <thead><tr><th>Date</th><th>Account / Type</th><th>Reference</th><th>Credit</th><th>Debit</th><th>Created By</th></tr></thead>
            <tbody>{ledger.results.map(row => <tr key={row.id}>
              <td>{row.date}</td><td><strong>{row.account}</strong>
                <small>{String(row.type || '').replaceAll('_', ' ')}</small></td>
              <td>{row.reference || '—'}</td>
              <td className="is-credit">{Number(row.credit) > 0 ? fmt(row.credit) : '—'}</td>
              <td className="is-debit">{Number(row.debit) > 0 ? fmt(row.debit) : '—'}</td>
              <td>{row.createdBy || '—'}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="payments-finance-note">No account movements for these filters.</p>}
      {ledger && ledger.totalPages > 1 && <div className="payments-finance-pagination">
        <button type="button" disabled={page <= 1 || ledgerLoading}
          onClick={() => setPage(v => Math.max(1, v - 1))}>Previous</button>
        <span>Page {page} of {ledger.totalPages} · {ledger.count} entries</span>
        <button type="button" disabled={page >= ledger.totalPages || ledgerLoading}
          onClick={() => setPage(v => v + 1)}>Next</button>
      </div>}
    </section>
  </div>;
}
