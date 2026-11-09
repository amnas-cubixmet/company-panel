import { useCallback, useEffect, useState } from 'react';
import { getMySalaryPayments } from '../../services/attendance.service';

// Only the signed-in employee's paid transactions are available here. The
// backend resolves Employee from the JWT; this view never accepts a staff ID.
const money = (amount) => {
  const number = Number(amount);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(number)
    : '—';
};

export function MySalaryPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getMySalaryPayments();
      setPayments(Array.isArray(rows) ? rows : []);
    } catch (cause) {
      setError(cause?.message || 'Unable to load your salary payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="my-salary-panel" aria-label="My Salary">
      <header>
        <div>
          <h2>My Salary Payments</h2>
          <p>Read-only payment history recorded for your staff account.</p>
        </div>
        <button type="button" className="my-salary-refetch"
          onClick={load} disabled={loading}>Refresh</button>
      </header>
      {loading && <p className="my-salary-message" role="status">Loading salary payments…</p>}
      {!loading && error && <div className="my-salary-message" role="alert">
        <p>{error}</p>
        <button type="button" className="my-salary-refetch" onClick={load}>Retry</button>
      </div>}
      {!loading && !error && payments.length === 0 && (
        <p className="my-salary-message" role="status">
          No salary payments have been recorded yet. Your attendance history is available in the other tabs.
        </p>
      )}
      {!loading && !error && payments.length > 0 && (
        <div className="my-salary-records">
          {payments.map((payment) => (
            <article className="my-salary-record" key={`${payment.type}-${payment.id}`}>
              <strong className="my-salary-amount">{money(payment.amount)}</strong>
              <span>{payment.type}{payment.period ? ` · ${payment.period}` : ''}</span>
              <small>{payment.date} · {payment.method || 'Payment recorded'}</small>
              {payment.reference && <small>Reference: {payment.reference}</small>}
              <small>Status: {payment.status}</small>
            </article>
          ))}
        </div>
      )}
      <p>Only confirmed payments are listed here. Payroll processing, staff rates and salary approval remain restricted to authorized managers.</p>
    </section>
  );
}
