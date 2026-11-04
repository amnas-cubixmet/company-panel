import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Layers3, Mail, ShieldCheck } from 'lucide-react';
import { AccountHeader } from '../../components/account';
import { planCatalogService } from '../../services/planCatalog.service';
import '../../styles/saas-plans.css';

const amount = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);

function FeatureGroups({ items }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const feature of items || []) {
      const key = [feature.parentGroupKey, feature.groupKey].filter(Boolean).join(' / ');
      if (!map.has(key)) map.set(key, { title: feature.group, features: [] });
      map.get(key).features.push(feature);
    }
    return Array.from(map.values());
  }, [items]);
  return <div className="cg-feature-groups">
    {grouped.map((group) => <section key={group.title}>
      <h4>{group.title}</h4>
      {group.features.map((feature) => <div className={feature.enabled ? 'cg-feature enabled' : 'cg-feature disabled'} key={feature.key}>
        <span>{feature.enabled ? <Check size={14} aria-hidden="true" /> : '—'}</span>{feature.label}
      </div>)}
    </section>)}
  </div>;
}

export function PlanMarketplace() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [request, setRequest] = useState(null);
  const [custom, setCustom] = useState({ email: '', branches: '1', users: '5', message: '' });
  const [customOpen, setCustomOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([planCatalogService.list(), planCatalogService.access()])
      .then(([catalog, access]) => {
        if (!alive) return;
        if (catalog.status === 'rejected') setError(catalog.reason?.message || 'Plans could not load.');
        else setPlans(Array.isArray(catalog.value) ? catalog.value : []);
        if (access.status === 'fulfilled') setCurrent(access.value?.configured ? { key: access.value.plan, cycle: access.value.billingCycle } : null);
      }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const submitPlan = async (plan) => {
    setAction('plan:' + plan.id); setMessage(''); setError('');
    try {
      const response = await planCatalogService.requestChange({
        plan_id: plan.id, billing_cycle: cycle
      });
      setMessage(response.message || 'Plan request submitted.');
      setRequest(null);
    } catch (e) {
      setError(e.message || 'Unable to submit plan change.');
    } finally { setAction(''); }
  };

  const submitCustom = async (event) => {
    event.preventDefault(); setAction('custom'); setMessage(''); setError('');
    try {
      const response = await planCatalogService.requestCustom({
        email: custom.email.trim(), branches: Number(custom.branches),
        users: Number(custom.users), message: custom.message.trim()
      });
      setMessage(response.message || 'Custom plan request submitted.');
      setCustomOpen(false);
    } catch (e) {
      setError(e.message || 'Unable to send your request.');
    } finally { setAction(''); }
  };

  return <div className="saas-page cg-plan-marketplace">
    <AccountHeader title="Subscription Plans"
      subtitle="Choose a plan that fits your workshop. Changes are reviewed before activation or charging."
      active="plans" onNavigate={navigate}
      actions={<button className="saas-button" type="button" onClick={() => navigate('/account/billing')}><ArrowLeft size={16}/> Back to Billing</button>} />

    <div className="cg-plan-toolbar">
      <div><h2>Choose your workshop plan</h2><p>All plans include normal billing and applicable GST invoices (CGST, SGST and IGST).</p></div>
      <div className="cg-billing-switch" aria-label="Billing frequency">
        {['monthly', 'yearly'].map((value) =>
          <button type="button" key={value} aria-pressed={cycle === value}
            className={cycle === value ? 'active' : ''} onClick={() => setCycle(value)}>
            {value === 'yearly' ? 'Yearly' : 'Monthly'}
          </button>)}
      </div>
    </div>
    {loading && <p role="status" className="saas-loading">Loading available plans…</p>}
    {error && <p role="alert" className="cg-plan-alert error">{error}</p>}
    {message && <p role="status" className="cg-plan-alert success"><CheckCircle2 size={16}/>{message}</p>}
    {!loading && !error && plans.length === 0 && <p className="saas-muted">No published plans yet. Contact CubixGear for a custom quote.</p>}
    <div className="cg-plan-cards">
      {plans.map((plan) => <article className="cg-plan-card" key={plan.id}>
        <header>
          <span className="saas-kicker">{current?.key === plan.key && current?.cycle === cycle ? 'YOUR CURRENT PLAN' : 'WORKSHOP SUBSCRIPTION'}</span>
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
        </header>
        <div className="cg-plan-price">{amount(cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)} <small>/ {cycle === 'yearly' ? 'year' : 'month'} + tax</small></div>
        {Number(plan.promoPercent) > 0 && <span className="cg-plan-promo">{plan.promoPercent}% promotion applied</span>}
        <div className="cg-plan-limits">
          <div><strong>{plan.maxBranches}</strong><span>Branches</span></div>
          <div><strong>{plan.maxUsers}</strong><span>Login Users</span></div>
          <div><strong>{plan.includedStorageGb} GB</strong><span>Storage</span></div>
        </div>
        <p className="cg-plan-rate">Extra storage: {amount(plan.extraStorageRate)}/GB/month · {plan.trialDays} trial days</p>
        <div className="cg-plan-fixed-feature"><ShieldCheck size={16}/> GST / CGST / SGST / IGST billing included</div>
        <button type="button" className="cg-plan-toggle" aria-expanded={expanded === plan.id}
          onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}>
          <Layers3 size={16}/> {expanded === plan.id ? 'Hide feature list' : 'View included features'}
        </button>
        {expanded === plan.id && <FeatureGroups items={plan.features}/>}
        {request === plan.id && <p className="cg-plan-notice">A plan-change enquiry will be sent to CubixGear. No payment is charged or activated automatically.</p>}
        <button type="button" className="cg-plan-action" disabled={Boolean(action) || (current?.key === plan.key && current?.cycle === cycle)}
          onClick={() => request === plan.id ? submitPlan(plan) : setRequest(plan.id)}>
          {current?.key === plan.key && current?.cycle === cycle ? 'Current Plan' : action === 'plan:' + plan.id ? 'Sending…' : request === plan.id ? 'Confirm Plan Request' : 'Request This Plan'}
          
        </button>
        {request === plan.id && <button type="button" className="cg-plan-cancel" onClick={() => setRequest(null)}>Cancel</button>}
      </article>)}
    </div>

    <section className="cg-custom-plan">
      <div>
        <span className="saas-kicker">CUSTOM PLAN</span>
        <h2>Need more branches, seats or a custom set of features?</h2>
        <p>Tell our team what your workshop needs. Your request will appear in the CubixGear Admin enquiry inbox.</p>
      </div>
      <button type="button" className="saas-button" onClick={() => setCustomOpen((v) => !v)}><Mail size={16}/> {customOpen ? 'Close Request' : 'Contact for Custom Plan'}</button>
      {customOpen && <form onSubmit={submitCustom} className="cg-custom-form">
        <label>Email <input required type="email" value={custom.email} onChange={(e) => setCustom({ ...custom, email: e.target.value })}/></label>
        <label>Branches <input required type="number" min="1" value={custom.branches} onChange={(e) => setCustom({ ...custom, branches: e.target.value })}/></label>
        <label>Login users <input required type="number" min="1" value={custom.users} onChange={(e) => setCustom({ ...custom, users: e.target.value })}/></label>
        <label className="cg-message-field">Your requirements <textarea required minLength={5} maxLength={4000} rows={3} value={custom.message} onChange={(e) => setCustom({ ...custom, message: e.target.value })} placeholder="Tell us the features, branches and staff you need."/></label>
        <button type="submit" className="cg-plan-action" disabled={Boolean(action)}>{action === 'custom' ? 'Sending…' : 'Send Request'}</button>
      </form>}
    </section>
  </div>;
}
