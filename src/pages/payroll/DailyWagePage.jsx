import { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarCheck2, CheckCircle2, Clock3, History, Search, Users, Wallet } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { dailyWageService } from '../../services/dailyWage.service';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';
import './daily-wage.css';
import './daily-wage-readable.css';

export const rupees = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(value || 0));

export const todayISO = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const sections = [
  ['overview', 'Daily Wages', '/payroll/daily-wages', Wallet],
  ['history', 'Daily History', '/payroll/daily-wages/history', History],
  ['overtime', 'Overtime Approval', '/payroll/daily-wages/overtime-approvals', Clock3],
  ['payments', 'Payments', '/payroll/payments', Banknote],
];

export function DailyWageNav({ selected = 'overview' }) {
  const { search } = useLocation();
  // Moving between the payroll views must retain the user's selected
  // month, year, branch and staff query parameters.
  return (
    <nav className="dw-nav" aria-label="Daily Wage Navigation">
      {sections.map(([id, title, href, Icon]) => (
        <Link key={id} to={`${href}${search}`} aria-current={selected === id ? 'page' : undefined} className={selected === id ? 'is-active' : ''}>
          <Icon size={16} aria-hidden="true"/>{title}
        </Link>
      ))}
    </nav>
  );
}

const Metric = ({ label, value, Icon, meta }) => (
  <article className="dw-metric dashboard-stat-card">
    <div className="dw-metric-top">
      <span>{label}</span>
      <span className="dw-metric-icon"><Icon size={18} aria-hidden="true"/></span>
    </div>
    <strong>{value}</strong>
    <small>{meta}</small>
  </article>
);

const Empty = ({ text }) => <div className="dw-empty">{text}</div>;

export const DailyWagePage = ({ mode = 'overview' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canView = hasPermission(user, 'payroll.view');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError('');
    const promise = mode === 'overview'
      ? dailyWageService.dashboard()
      : mode === 'history'
        ? dailyWageService.history({ ...(from ? { from } : {}), ...(to ? { to } : {}) })
        : dailyWageService.payments();
    promise.then((result) => { if (mounted) setData(result); })
      .catch((err) => { if (mounted) setError(err.message || 'Could not load Daily Wages.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [canView, mode, from, to, refreshToken]);

  const items = useMemo(() => {
    const rows = Array.isArray(data) ? data : Array.isArray(data?.employees) ? data.employees : [];
    const text = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesText = !text || [
        row.name, row.employeeName, row.employeeCode, row.designation,
        row.branchName, row.date, row.method, row.reference,
      ].some((value) => String(value || '').toLowerCase().includes(text));
      return matchesText && (branch === 'All' || String(row.branchId) === branch);
    });
  }, [data, query, branch]);

  const branches = useMemo(() =>
    [...new Map((Array.isArray(data) ? data : data?.employees || []).filter((e) => e.branchId)
      .map((e) => [e.branchId, e.branchName || 'Branch'])).entries()],
    [data],
  );

  if (!canView) return <div className="dw-page"><Empty text="You need Payroll View permission to see wage accounts."/></div>;

  return (
    <main className="dw-page dashboard-page">
      <header className="dw-header dashboard-heading">
        <div className="dashboard-heading-copy">
          <h1>{mode === 'overview' ? 'Daily Wage Payroll' : mode === 'history' ? 'Daily Wage History' : 'Wage Payments'}</h1>
          <p>Attendance-based daily earnings · No monthly salary or automatic commission</p>
        </div>
        <button className="dw-button" type="button" onClick={() => setRefreshToken((v) => v + 1)}>
          <Clock3 size={16}/> Refresh
        </button>
      </header>
      <DailyWageNav selected={mode}/>
      {mode === 'overview' && data && (
        <div className="dw-metrics">
          <Metric label="Workers" value={data.totalWorkers || 0} Icon={Users} meta="Company / branch employees"/>
          <Metric label="Today's Earned Wages" value={rupees(data.todayExpense)} Icon={CalendarCheck2} meta="Finalized attendance only"/>
          <Metric label="Outstanding Payable" value={rupees(data.outstanding)} Icon={Wallet} meta={`${data.workersUnpaid || 0} staff awaiting payment`}/>
          <Metric label="Total Wage Payments" value={rupees(data.totalPayments)} Icon={CheckCircle2} meta="Recorded settlements"/>
        </div>
      )}
      {mode === 'overview' && data && (
        <div className="dw-attendance-summary">
          <span><b>{data.todayAttendance?.full || 0}</b> Full Day</span>
          <span><b>{data.todayAttendance?.half || 0}</b> Half Day</span>
          <span><b>{data.todayAttendance?.pending || 0}</b> Pending Finalization</span>
        </div>
      )}
      {error && <p className="dw-alert" role="alert">{error} <button type="button" onClick={() => setRefreshToken((v) => v + 1)}>Retry</button></p>}
      <section className="dw-card" aria-labelledby="dw-records-heading">
        <div className="dw-card-head">
          <div>
            <h2 id="dw-records-heading">{mode === 'overview' ? 'Employee Wage Accounts' : mode === 'history' ? 'Posted Daily Earnings' : 'Wage Payment Transactions'}</h2>
            <p>{mode === 'overview' ? 'Select a worker to approve days, add earnings or settle unpaid wages.' : 'Permanent transaction history for the selected company.'}</p>
          </div>
          <span>{items.length} records</span>
        </div>
        <div className="dw-toolbar">
          <label className="dw-search"><Search size={17}/>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff or records" aria-label="Search Daily Wages"/>
          </label>
          <select aria-label="Filter by branch" value={branch} onChange={(event) => setBranch(event.target.value)}>
            <option value="All">All Branches</option>
            {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          {mode === 'history' && (
            <>
              <label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label>
              <label>To <input type="date" min={from || undefined} value={to} onChange={(event) => setTo(event.target.value)}/></label>
            </>
          )}
        </div>
        {loading ? <Empty text="Loading wage records…"/> : !items.length ? (
          <Empty text="No wage entries match the selected filters."/>
        ) : (
          <div className="dw-table-scroll">
            {mode === 'overview' ? (
              <table className="dw-table">
                <thead><tr><th>Employee</th><th>Daily Rate</th><th>Today's Attendance</th><th>Today's Wage</th><th>Extra</th><th>Unpaid Balance</th><th>Last Paid</th><th>Action</th></tr></thead>
                <tbody>{items.map((w) => (
                  <tr key={w.id}>
                    <td data-label="Employee"><strong>{w.name}</strong><small>{w.employeeCode} · {w.designation || 'Staff'}</small></td>
                    <td data-label="Daily Rate">{w.dailyRate ? rupees(w.dailyRate) : <span className="dw-pending">Set Rate</span>}</td>
                    <td data-label="Attendance"><span className={w.today.finalized ? 'dw-ok' : 'dw-pending'}>{w.today.finalized ? w.today.attendance : 'Pending'}</span></td>
                    <td data-label="Today's Wage">{rupees(w.today.totalWage)}</td>
                    <td data-label="Extra">{rupees(w.today.extraEarnings)}</td>
                    <td data-label="Unpaid"><strong>{rupees(w.currentBalance)}</strong></td>
                    <td data-label="Last Paid">{w.lastPaymentDate || '—'}</td>
                    <td data-label="Action"><button className="dw-button is-primary" onClick={() => navigate(`/staff/${w.id}/wages`)} type="button">Wage Account </button></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : mode === 'history' ? (
              <table className="dw-table">
                <thead><tr><th>Work Date</th><th>Employee</th><th>Attendance</th><th>Applied Rate</th><th>Base Wage</th><th>Extras</th><th>Adjustments</th><th>Total</th><th>Payment</th></tr></thead>
                <tbody>{items.map((e) => <tr key={e.id}>
                  <td data-label="Date">{e.date}</td><td data-label="Employee"><button type="button" className="dw-text-link" onClick={() => navigate(`/staff/${e.employeeId}/wages`)}>{e.employeeName}</button></td>
                  <td data-label="Attendance">{e.attendance}</td><td data-label="Applied Rate">{rupees(e.dailyRate)}</td>
                  <td data-label="Base">{rupees(e.baseWage)}</td><td data-label="Extras">{rupees(e.extras)}</td>
                  <td data-label="Adjustments">{rupees(e.adjustments)}</td><td data-label="Total"><strong>{rupees(e.total)}</strong></td>
                  <td data-label="Payment"><span className={e.paymentStatus === 'Paid' ? 'dw-ok' : 'dw-pending'}>{e.paymentStatus || 'Unpaid'}</span></td>
                </tr>)}</tbody>
              </table>
            ) : (
              <table className="dw-table">
                <thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Account</th></tr></thead>
                <tbody>{items.map((p) => <tr key={p.id}>
                  <td data-label="Date">{p.date}</td><td data-label="Employee">{p.employeeName}</td><td data-label="Amount"><strong>{rupees(p.amount)}</strong></td>
                  <td data-label="Method">{p.method}</td><td data-label="Reference">{p.reference || '—'}</td>
                  <td data-label="Status"><span className={p.reversed ? 'dw-pending' : 'dw-ok'}>{p.reversed ? 'Reversed' : 'Paid'}</span></td>
                  <td data-label="Account"><button type="button" className="dw-text-link" onClick={() => navigate(`/staff/${p.employeeId}/wages`)}>View Account</button></td>
                </tr>)}</tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </main>
  );
};
