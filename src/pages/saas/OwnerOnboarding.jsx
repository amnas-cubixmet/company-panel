import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, ImagePlus, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { onboardingService } from '../../services/onboarding.service';
import { settingsService } from '../../services/settings.service';
import '../../styles/owner-onboarding.css';

const STEPS = [
  {
    key: 'company', title: 'Workshop details', subtitle: 'Legal name, address and GST registration',
    fields: [
      ['name', 'Workshop / Company Name', 'text', true],
      ['legal_name', 'Legal Business Name', 'text'],
      ['phone', 'Workshop Contact Number', 'tel'],
      ['email', 'Official Email', 'email'],
      ['gstin', 'GSTIN (optional)', 'text'],
      ['address', 'Registered Address', 'textarea'],
      ['city', 'City', 'text'],
      ['state', 'State', 'text'],
      ['country', 'Country', 'text'],
      ['pincode', 'PIN / Postal Code', 'text'],
    ],
  },
  {
    key: 'branch', title: 'Main branch & location', subtitle: 'Configure your actual workshop address and punch location',
    fields: [
      ['name', 'Main Branch Name', 'text', true],
      ['phone', 'Branch Contact Number', 'tel'],
      ['address', 'Branch Address', 'textarea'],
      ['city', 'City', 'text'],
      ['state', 'State', 'text', true],
      ['pincode', 'PIN / Postal Code', 'text'],
      ['latitude', 'Workshop Latitude', 'number'],
      ['longitude', 'Workshop Longitude', 'number'],
      ['punchRadiusMeters', 'Punch Radius (metres)', 'number'],
    ],
  },
  {
    key: 'operations', title: 'Working hours', subtitle: 'Service hours and job card defaults',
    fields: [
      ['workingStart', 'Working Day Starts', 'time', true],
      ['workingEnd', 'Working Day Ends', 'time', true],
      ['bookingSlotMinutes', 'Booking Slot (minutes)', 'number', true],
      ['jobPrefix', 'Job Card Number Prefix', 'text', true],
    ],
  },
  {
    key: 'billing', title: 'Invoice defaults', subtitle: 'Set payment terms and tax defaults for new invoices',
    fields: [
      ['invoicePrefix', 'Invoice Number Prefix', 'text', true],
      ['paymentTermsDays', 'Default Payment Terms (days)', 'number', true],
      ['defaultTaxRate', 'Default GST Rate (%)', 'number', true],
      ['rounding', 'Round invoice total', 'checkbox'],
    ],
  },
];

const integerFields = new Set(['punchRadiusMeters', 'bookingSlotMinutes', 'paymentTermsDays']);
const numberFields = new Set(['latitude', 'longitude', 'defaultTaxRate']);

const apiDataFor = (step, draft) => {
  const values = {};
  for (const [name, , type] of step.fields) {
    const input = draft?.[name];
    if (type === 'checkbox') {
      values[name] = Boolean(input);
    } else if (integerFields.has(name)) {
      values[name] = Number(input);
    } else if (numberFields.has(name)) {
      values[name] = input === '' || input == null ? null : String(input).trim();
    } else {
      values[name] = String(input ?? '').trim();
    }
  }
  // GST is optional; a missing default tax selection is not an API number.
  if (step.key === 'billing' && values.defaultTaxRate == null) {
    values.defaultTaxRate = '0';
  }
  return values;
};

export function OwnerOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const firstField = useRef(null);
  const current = STEPS[active];
  const completed = useMemo(() => new Set(state?.completedSteps || []), [state]);
  const completedCount = completed.size;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await onboardingService.get();
      setState(result);
      setDrafts(Object.fromEntries(STEPS.map(({ key }) => [key, result[key] || {}])));
      const next = STEPS.findIndex(({ key }) => !(result.completedSteps || []).includes(key));
      setActive(next < 0 ? 0 : next);
    } catch (cause) {
      setError(cause?.message || 'Unable to load workshop setup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => {
    setDrafts(previous => ({
      ...previous,
      [current.key]: { ...(previous[current.key] || {}), [field]: value },
    }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || !state) return;
    setSaving(true);
    setError('');
    try {
      let next = await onboardingService.saveStep(current.key, apiDataFor(current, drafts[current.key]));
      if (current.key === 'company' && logoFile) {
        await settingsService.uploadCompanyLogo(logoFile);
        setLogoFile(null);
        next = await onboardingService.get();
      }
      setState(next);
      setDrafts(previous => ({ ...previous, [current.key]: next[current.key] || previous[current.key] }));
      const missing = STEPS.findIndex(step => !next.completedSteps.includes(step.key));
      if (missing >= 0) {
        setActive(missing);
        firstField.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      } else {
        const finished = await onboardingService.complete();
        setState(finished);
        // Re-fetch the JWT profile with onboardingRequired=false after reload.
        window.location.replace('/account');
      }
    } catch (cause) {
      const first = Object.entries(cause?.fieldErrors || {}).find(([key]) => current.fields.some(([field]) => field === key));
      setError(first ? `${first[0]}: ${first[1]}` : (cause?.message || 'Unable to save. Please review this step.'));
    } finally {
      setSaving(false);
    }
  };

  if (user && !user.isCompanyOwner) {
    return <main className="cg-setup"><section className="cg-setup-card">
      <h1>Workshop owner access required</h1>
      <p>Only the verified workshop owner can complete organization setup.</p>
      <Link to="/dashboard">Return to Dashboard</Link>
    </section></main>;
  }

  if (loading) return <main className="cg-setup"><section className="cg-setup-card" role="status">
    Loading workshop setup…
  </section></main>;

  if (!state) return <main className="cg-setup"><section className="cg-setup-card">
    <h1>Unable to open workshop setup</h1>
    <p role="alert">{error}</p>
    <button type="button" onClick={load}>Retry</button>
  </section></main>;

  return (
    <main className="cg-setup">
      <header className="cg-setup-heading">
        <div><span className="cg-setup-eyebrow">CUBEGEARS · WORKSHOP SETUP</span>
          <h1>Set up your workshop</h1>
          <p>Real company settings saved securely to your workshop account. Continue where you left off.</p>
        </div>
        <Link className="cg-setup-later" to="/account">Finish later</Link>
      </header>
      <div className="cg-setup-progress" role="status" aria-live="polite">
        <strong>{completedCount} of {STEPS.length} steps saved</strong>
        <div className="cg-setup-progress-track"><span style={{ width: `${completedCount / STEPS.length * 100}%` }} /></div>
      </div>
      <div className="cg-setup-layout">
        <nav aria-label="Workshop setup steps" className="cg-setup-nav">
          {STEPS.map((step, index) => (
            <button key={step.key} type="button" disabled={saving}
              className={`cg-setup-step ${active === index ? 'is-current' : ''}`}
              aria-current={active === index ? 'step' : undefined}
              onClick={() => { setActive(index); setError(''); }}>
              <span className="cg-setup-step-number">{completed.has(step.key) ? <Check size={16}/> : index + 1}</span>
              <span>{step.title}</span>
            </button>
          ))}
        </nav>
        <section className="cg-setup-card" ref={firstField}>
          <div className="cg-setup-step-heading">
            <span>STEP {active + 1} OF {STEPS.length}</span>
            <h2>{current.title}</h2>
            <p>{current.subtitle}</p>
          </div>
          {error && <p role="alert" className="cg-setup-error">{error}</p>}
          {state.completed && <p role="status" className="cg-setup-done">
            Setup previously completed. You can update these settings at any time.
          </p>}
          <form onSubmit={submit} noValidate>
            <div className="cg-setup-fields">
              {current.fields.map(([key, label, type, required]) => (
                <label key={key} className={type === 'textarea' ? 'cg-setup-wide' : ''}>
                  <span className="cg-setup-label">{label}{required ? ' *' : ''}</span>
                  {type === 'textarea' ? (
                    <textarea name={key} rows={3} maxLength={1200} value={drafts[current.key]?.[key] ?? ''}
                      onChange={e => update(key, e.target.value)}/>
                  ) : type === 'checkbox' ? (
                    <input name={key} type="checkbox" checked={Boolean(drafts[current.key]?.[key])}
                      onChange={e => update(key, e.target.checked)}/>
                  ) : (
                    <input name={key} type={type} required={Boolean(required)}
                      inputMode={type === 'number' ? 'decimal' : undefined}
                      step={type === 'number' ? (integerFields.has(key) ? '1' : 'any') : undefined}
                      value={drafts[current.key]?.[key] ?? ''}
                      onChange={e => update(key, e.target.value)}
                      autoComplete={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'off'}/>
                  )}
                </label>
              ))}
            </div>
            {current.key === 'branch' && <p className="cg-setup-help">
              <MapPin size={16}/> GPS coordinates are optional. Provide both latitude and longitude to configure location-aware attendance. Accuracy depends on the staff device.
            </p>}
            {current.key === 'company' && <label className="cg-setup-logo">
              <ImagePlus size={20}/><span>Workshop logo (optional) {state.logoAvailable ? '· Uploaded' : ''}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp"
                onChange={e => setLogoFile(e.target.files?.[0] || null)}/>
              {logoFile && <small>Selected: {logoFile.name}</small>}
            </label>}
            {current.key === 'billing' && <p className="cg-setup-help">
              <ShieldCheck size={16}/> GST rates are configurable defaults, not a filing determination. Actual invoice tax depends on the applicable transaction.
            </p>}
            <div className="cg-setup-actions">
              <button type="button" className="cg-setup-back" disabled={saving || active === 0}
                onClick={() => { setActive(Math.max(0, active - 1)); setError(''); }}>
                <ChevronLeft size={16}/> Previous
              </button>
              <button type="submit" className="cg-setup-save" disabled={saving}>
                {saving ? 'Saving to workshop…' : completedCount === STEPS.length ? 'Save & finish setup' : 'Save & continue'}
                {!saving && <ChevronRight size={16}/>}
              </button>
            </div>
          </form>
          <p className="cg-setup-footer">Your customer, staff, invoice and inventory records are not changed by this wizard.</p>
        </section>
      </div>
    </main>
  );
}
