import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, ShieldCheck, Clock3, RefreshCcw } from 'lucide-react';
import { subscriptionApi, openRazorpayCheckout } from '../../services/razorpayCheckout.service';
import '../../styles/saas-checkout.css';

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(Number(value || 0));

export function Subscribe() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [access, setAccess] = useState(null);
  const [history, setHistory] = useState([]);
  const [workingId, setWorkingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [catalog, status, payments] = await Promise.all([
        subscriptionApi.plans(),
        subscriptionApi.access(),
        subscriptionApi.history().catch(() => [])
      ]);
      setPlans(Array.isArray(catalog) ? catalog : []);
      setAccess(status);
      setHistory(Array.isArray(payments) ? payments : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Unable to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pay = async (plan) => {
    if (workingId !== null) return;
    setWorkingId(plan.id);
    setError('');
    setNotice('');
    try {
      const order = await subscriptionApi.order(plan.id);
      const result = await openRazorpayCheckout(order);
      if (!result?.access?.allowed || result?.payment?.status !== 'captured') {
        throw new Error('Your payment is pending verification. Check payment history.');
      }
      setNotice('Payment captured. Your CubeGear subscription is active.');
      await load();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Payment was not confirmed. Please retry or check payment history.');
      await subscriptionApi.history().then(setHistory).catch(() => {});
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="cg-subscribe">
      <div className="cg-subscribe-shell">
        <header className="cg-subscribe-head">
          <span className="cg-subscribe-label"><ShieldCheck size={16}/> CUBEGEAR SECURE BILLING</span>
          <h1>{access?.status === 'active' ? 'Manage your subscription' : access?.status === 'expired' ? 'Your plan has expired — renew access' : 'Choose your plan to continue'}</h1>
          <p>Pay securely through Razorpay. Your dashboard opens only after the backend confirms your payment.</p>
          {access?.status === 'expired' && access.expiresAt && (
            <div className="cg-subscribe-error" role="status">
              Your previous plan ended on {new Date(access.expiresAt).toLocaleDateString('en-IN')}.
              Choose a plan below and complete payment to reopen your dashboard.
            </div>
          )}
          {access?.status === 'active' && (
            <div className="cg-subscribe-active" role="status">
              <CheckCircle2 size={18}/> {access.plan} is active until {new Date(access.expiresAt).toLocaleDateString('en-IN')}.
              <button type="button" onClick={() => navigate('/dashboard')}>Open dashboard </button>
            </div>
          )}
        </header>

        {loading && <div className="cg-subscribe-message" role="status">Loading available plans…</div>}
        {error && <div className="cg-subscribe-error" role="alert">{error}</div>}
        {notice && <div className="cg-subscribe-active" role="status">{notice}</div>}
        {!loading && !plans.length && (
          <div className="cg-subscribe-message">No active plans are published. Contact CubeGear support.</div>
        )}

        <p className="cg-subscribe-trust">One-time package payment. Access validity and pricing are configured by CubeGear for each plan; no automatic subscription deductions.</p>

        <section className="cg-subscribe-plans" aria-label="Subscription plans">
          {plans.map((plan) => {
            const amount = plan.checkoutPrice;
            const busy = workingId === plan.id;
            const features = (plan.features || []).filter((f) => f.enabled).slice(0, 8);
            return (
              <article key={plan.id} className="cg-subscribe-plan">
                <span className="cg-subscribe-plan-name">{plan.name}</span>
                <p>{plan.description || 'Everything you need to manage your workshop.'}</p>
                <div className="cg-subscribe-price">{money(amount)} <small>one-time payment</small></div>
                <div className="cg-subscribe-validity"><Clock3 size={16}/> Access for {plan.accessDurationDays} days after payment</div>
                <div className="cg-subscribe-details">{plan.maxUsers} users · {plan.maxBranches} branches · {plan.includedStorageGb} GB storage</div>
                <button type="button" disabled={workingId !== null || !access?.checkoutAvailable || !access?.canPurchase || Number(amount) <= 0}
                  onClick={() => pay(plan)} className="cg-subscribe-pay">
                  <CreditCard size={18}/> {busy ? 'Opening Razorpay…' : 'Pay securely with Razorpay'}
                </button>
                {!access?.canPurchase && <small className="cg-subscribe-note">Ask your company billing administrator to complete payment.</small>}
                {features.length > 0 && <ul>{features.map((f) => <li key={f.key}><CheckCircle2 size={15}/>{f.label}</li>)}</ul>}
              </article>
            );
          })}
        </section>

        <p className="cg-subscribe-trust"><ShieldCheck size={17}/> UPI, cards and net banking are handled by Razorpay Checkout, subject to the methods enabled on your Razorpay merchant account. CubeGear never stores card or UPI credentials.</p>

        <section className="cg-subscribe-history">
          <div className="cg-subscribe-history-head"><div><span>ACCOUNT BILLING</span><h2>Payment history</h2></div><button type="button" onClick={load}><RefreshCcw size={16}/> Refresh</button></div>
          {history.length ? <div className="cg-subscribe-table-wrap"><table>
            <thead><tr><th>Created</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Access until</th></tr></thead>
            <tbody>{history.map((row) => <tr key={row.id}>
              <td>{new Date(row.createdAt).toLocaleDateString('en-IN')}</td>
              <td>{row.plan}</td>
              <td>{money(row.amount)}</td>
              <td>{row.method || '—'}</td>
              <td><span className={row.status === 'captured' ? 'cg-subscribe-paid' : ''}>{row.status}</span></td>
              <td>{row.validUntil ? new Date(row.validUntil).toLocaleDateString('en-IN') : '—'}</td>
            </tr>)}</tbody>
          </table></div> : <p>No payment transactions recorded yet.</p>}
        </section>
      </div>
    </main>
  );
}
