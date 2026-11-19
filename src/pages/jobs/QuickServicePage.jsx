import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { JobBreadcrumbs } from '../../components/jobs/JobBreadcrumbs';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import { USE_MOCK_API } from '../../api/apiConfig';
import { billingService } from '../../services/billing.service';
import { financeService } from '../../services/finance.service';
import { quickService } from '../../services/quickService.service';
import { defaultFinanceAccountId, financeAccountsForChannel } from '../../utils/financeCashBank';
import '../../styles/quick-service.css';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const emptyLine = (description = '') => ({
  key: crypto.randomUUID(), description, qty: '1', rate: '', hsnCode: '', taxRate: '',
});
const closePermissions = ['jobs.edit', 'invoices.view', 'invoices.create', 'invoices.edit', 'payments.view', 'payments.create'];

function QuickServiceCheckout({ service, onClose, onCancel }) {
  const [items, setItems] = useState(() => [emptyLine(service.description)]);
  const [details, setDetails] = useState(null);
  const [method, setMethod] = useState('Cash');
  const [account, setAccount] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([billingService.getGstContext(), financeService.listAccounts()])
      .then(([gst, accounts]) => {
        if (!active) return;
        setDetails({ gst: gst.registered, accounts });
        setAccount(defaultFinanceAccountId(accounts, 'Cash'));
      })
      .catch(err => { if (active) setError(err.message || 'Could not load checkout.'); });
    return () => { active = false; };
  }, [loadAttempt]);

  function changeItems(next) {
    setItems(next);
    setQuote(null);
    setError('');
  }

  function updateLine(key, field, value) {
    changeItems(items.map(item => item.key === key ? { ...item, [field]: value } : item));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !details) return;
    const lines = items.map(({ description, qty, rate, hsnCode, taxRate }) => ({
      description: description.trim(), qty, rate,
      ...(details.gst ? { hsnCode: hsnCode.trim(), taxRate } : {}),
    }));
    if (lines.some(item => !item.description || (details.gst && !item.hsnCode))) {
      setError('Enter a description and any required SAC for every service line.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!quote) {
        setQuote(await quickService.preview(service.id, lines));
        return;
      }
      const closed = await quickService.close(service.id, {
        items: lines, paymentMethod: method, account, expectedTotal: quote.total,
      });
      onClose(closed);
    } catch (err) {
      if (err.fieldErrors?.expectedTotal) setQuote(null);
      setError(err.message || 'Could not complete Quick Service.');
    } finally {
      setBusy(false);
    }
  }

  if (!details) return (
    <div className="quick-service-checkout">
      {error ? <p role="alert" className="quick-service-error">{error}</p> : <p role="status">Loading checkout…</p>}
      <div className="quick-service-actions">
        {error && <button type="button" className="dashboard-button" onClick={() => { setError(''); setLoadAttempt(value => value + 1); }}>Retry</button>}
        <button type="button" className="dashboard-button" onClick={onCancel}>Back</button>
      </div>
    </div>
  );

  const accounts = financeAccountsForChannel(details.accounts, method);
  return (
    <form className="quick-service-checkout" onSubmit={submit} aria-label={`Close ${service.description}`}>
      <h3>Service charges</h3>
      {items.map((item, index) => (
        <fieldset className="quick-service-line" key={item.key} disabled={busy}>
          <legend>Service {index + 1}</legend>
          <label className="quick-service-line-name">
            Service description
            <input required maxLength={255} value={item.description} onChange={event => updateLine(item.key, 'description', event.target.value)} />
          </label>
          <label>
            Qty
            <input required type="number" inputMode="decimal" min="0.01" max="999999.99" step="0.01" value={item.qty} onChange={event => updateLine(item.key, 'qty', event.target.value)} />
          </label>
          <label>
            Unit price (₹)
            <input required type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" value={item.rate} onChange={event => updateLine(item.key, 'rate', event.target.value)} />
          </label>
          {details.gst && <>
            <label>
              SAC
              <input required maxLength={30} value={item.hsnCode} onChange={event => updateLine(item.key, 'hsnCode', event.target.value)} />
            </label>
            <label>
              GST %
              <input required type="number" inputMode="decimal" min="0" max="100" step="0.01" value={item.taxRate} onChange={event => updateLine(item.key, 'taxRate', event.target.value)} />
            </label>
          </>}
          {items.length > 1 && <button type="button" className="dashboard-button" onClick={() => changeItems(items.filter(line => line.key !== item.key))}>Remove service {index + 1}</button>}
        </fieldset>
      ))}
      {items.length < 20 && (
        <button className="dashboard-button" type="button" disabled={busy} onClick={() => changeItems([...items, emptyLine()])}>Add service line</button>
      )}

      {quote && (
        <fieldset className="quick-service-payment" disabled={busy}>
          <legend>Payment received</legend>
          <div className="quick-service-total" role="status">
            <span>Invoice total</span>
            <strong>{currency.format(Number(quote.total))}</strong>
          </div>
          <div className="quick-service-field">
            <label htmlFor="quick-service-method">Method</label>
            <select id="quick-service-method" value={method} onChange={event => {
              const next = event.target.value;
              setMethod(next);
              setAccount(defaultFinanceAccountId(details.accounts, next));
            }}>
              <option value="Cash">Cash</option>
              <option value="Bank">Account / Bank / UPI</option>
            </select>
          </div>
          <div className="quick-service-field">
            <label htmlFor="quick-service-account">Receiving account</label>
            <select id="quick-service-account" required value={account} onChange={event => setAccount(event.target.value)}>
              <option value="">Choose account</option>
              {accounts.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </div>
          {!accounts.length && <p>No active {method} account. <Link to="/finance/accounts">Open finance accounts</Link></p>}
        </fieldset>
      )}

      {error && <p className="quick-service-error" role="alert">{error}</p>}
      <div className="quick-service-actions">
        <button type="button" className="dashboard-button" disabled={busy} onClick={onCancel}>Back</button>
        <button type="submit" className="dashboard-button is-primary" disabled={busy || Boolean(quote && !account)}>
          {busy ? 'Saving…' : quote ? 'Record Payment & Close' : 'Review Invoice Total'}
        </button>
      </div>
    </form>
  );
}

export function QuickServicePage() {
  const { can } = useFeatureAccess();
  const allowed = can('jobs.view') && !USE_MOCK_API;
  const canStart = can('jobs.create');
  const canClose = closePermissions.every(can);
  const canViewInvoice = can('invoices.view');
  const [services, setServices] = useState([]);
  const [description, setDescription] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [closed, setClosed] = useState(null);
  const formRequest = useRef(null);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    quickService.list()
      .then(data => { if (active) setServices(Array.isArray(data) ? data : data.results || []); })
      .catch(err => { if (active) setLoadError(err.message || 'Could not load services.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, reload]);

  async function start(event) {
    event.preventDefault();
    const name = description.trim();
    if (starting || !name) return;
    if (formRequest.current?.description !== name) formRequest.current = { description: name, requestId: crypto.randomUUID() };
    setStarting(true);
    setError('');
    setClosed(null);
    try {
      const service = await quickService.start(formRequest.current);
      setServices(rows => [service, ...rows.filter(row => row.id !== service.id)]);
      formRequest.current = null;
      setDescription('');
    } catch (err) {
      setError(err.message || 'Could not start service.');
    } finally {
      setStarting(false);
    }
  }

  function finish(service) {
    setServices(rows => rows.map(row => row.id === service.id ? service : row));
    setSelectedId(null);
    setClosed(service);
  }

  return (
    <main className="dashboard-page job-management-page quick-service-page">
      <JobBreadcrumbs current="Quick Service" />
      <header className="dashboard-heading">
        <div className="dashboard-heading-copy">
          <h1>Quick Service</h1>
          <p>Start a walk-in service with just the work description. Issue the invoice when you collect payment.</p>
        </div>
      </header>
      {!allowed ? <p role="status">{USE_MOCK_API ? 'Quick Service requires a connected workshop.' : 'You do not have access to Quick Service.'}</p> : <>
        {canStart && (
          <form className="quick-service-start" onSubmit={start}>
            <label htmlFor="quick-service-description">Service description</label>
            <input id="quick-service-description" required maxLength={255} placeholder="e.g. Tyre puncture repair" value={description} onChange={event => setDescription(event.target.value)} />
            <button type="submit" className="dashboard-button is-primary" disabled={loading || starting || !description.trim()}>{starting ? 'Starting…' : 'Start Service'}</button>
          </form>
        )}
        {error && <p className="quick-service-error" role="alert">{error}</p>}
        {closed && <p className="quick-service-success" role="status">Service closed. {currency.format(Number(closed.invoiceTotal))} recorded by {closed.paymentMethod === 'Bank' ? 'account' : 'cash'}.</p>}
        <section aria-labelledby="quick-service-list-heading" className="quick-service-list">
          <div className="quick-service-list-heading">
            <h2>Services</h2>
            <button type="button" className="dashboard-button" onClick={() => setReload(value => value + 1)} disabled={loading}>Refresh</button>
          </div>
          {loadError && <p className="quick-service-error" role="alert">{loadError}</p>}
          {loading && <p role="status">Loading services…</p>}
          {!loading && !loadError && services.length === 0 && <p>No quick services yet.</p>}
          {services.map(service => (
            <article key={service.id} className="quick-service-card">
              <div className="quick-service-card-head">
                <div>
                  <h3>{service.description}</h3>
                  <p>{service.invoiceId ? 'Closed' : 'In progress'} · {new Date(service.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="quick-service-actions">
                  {service.invoiceId && canViewInvoice && <Link className="dashboard-button" to={`/invoices/${service.invoiceId}`}>View Invoice {service.invoiceNumber}</Link>}
                  {!service.invoiceId && canClose && selectedId !== service.id && (
                    <button type="button" className="dashboard-button is-primary" onClick={() => setSelectedId(service.id)}>Finish Service</button>
                  )}
                </div>
              </div>
              {service.id === selectedId && !service.invoiceId && canClose && (
                <QuickServiceCheckout service={service} onClose={finish} onCancel={() => setSelectedId(null)} />
              )}
            </article>
          ))}
        </section>
      </>}
    </main>
  );
}
