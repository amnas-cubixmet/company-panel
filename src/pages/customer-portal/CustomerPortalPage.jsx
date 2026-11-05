import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Car, Camera, CheckCircle2, ClipboardList, FileText, MapPin, Phone, RefreshCw, Wrench } from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';
import '../../styles/customer-portal.css';

const dictionaries = {
  en: {
    title: 'Track Your Vehicle Service', subtitle: 'Service updates from your workshop',
    vehicles: 'My Vehicles', active: 'Active Job Cards', history: 'Service History',
    estimates: 'Published Estimates', invoices: 'Published Invoices',
    photos: 'Inspection Photos', contact: 'Workshop Contact', progress: 'Service Progress',
    all: 'All Photos', empty: 'Nothing to show yet', retry: 'Try Again',
    loading: 'Loading your service updates…', invalid: 'This tracking link is unavailable or has been revoked.',
    network: 'Could not load your service details. Check your connection and try again.',
    date: 'Service Date', stage: 'Current Status', job: 'Job Card',
    call: 'Call Workshop', message: 'WhatsApp Workshop', noPhotos: 'No published inspection photos yet',
    issued: 'Published Date', total: 'Total', customer: 'Customer Service Portal',
    received: 'Vehicle Received', inspection: 'Inspection In Progress',
    inspection_completed: 'Inspection Completed', work_started: 'Work Started',
    work_in_progress: 'Work In Progress', quality_check: 'Quality Check',
    ready: 'Ready for Delivery', delivered: 'Delivered',
  },
  ml: {
    title: 'വാഹന സർവീസ് വിവരങ്ങൾ', subtitle: 'നിങ്ങളുടെ വർക്ക്‌ഷോപ്പിൽ നിന്നുള്ള അപ്ഡേറ്റുകൾ',
    vehicles: 'എന്റെ വാഹനങ്ങൾ', active: 'നിലവിലെ ജോബ് കാർഡുകൾ', history: 'സർവീസ് ചരിത്രം',
    estimates: 'പ്രസിദ്ധീകരിച്ച എസ്റ്റിമേറ്റുകൾ', invoices: 'പ്രസിദ്ധീകരിച്ച ഇൻവോയ്സുകൾ',
    photos: 'വാഹന പരിശോധന ഫോട്ടോകൾ', contact: 'വർക്ക്‌ഷോപ്പുമായി ബന്ധപ്പെടുക',
    progress: 'സർവീസ് പുരോഗതി', all: 'എല്ലാ ഫോട്ടോകളും', empty: 'ഇപ്പോൾ വിവരങ്ങളൊന്നുമില്ല',
    retry: 'വീണ്ടും ശ്രമിക്കുക', loading: 'സർവീസ് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു…',
    invalid: 'ഈ ട്രാക്കിംഗ് ലിങ്ക് ലഭ്യമല്ല അല്ലെങ്കിൽ റദ്ദാക്കിയിരിക്കുന്നു.',
    network: 'വിവരങ്ങൾ ലോഡ് ചെയ്യാനായില്ല. ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.',
    date: 'സർവീസ് തീയതി', stage: 'നിലവിലെ സ്ഥിതി', job: 'ജോബ് കാർഡ്',
    call: 'വിളിക്കുക', message: 'വാട്സ്ആപ്പിൽ ബന്ധപ്പെടുക',
    noPhotos: 'കസ്റ്റമർക്ക് ലഭ്യമാക്കിയ ഫോട്ടോകൾ ഇതുവരെ ഇല്ല',
    issued: 'പ്രസിദ്ധീകരിച്ച തീയതി', total: 'ആകെ തുക',
    customer: 'കസ്റ്റമർ സർവീസ് പോർട്ടൽ',
    received: 'വാഹനം സ്വീകരിച്ചു', inspection: 'പരിശോധന നടക്കുന്നു',
    inspection_completed: 'പരിശോധന പൂർത്തിയായി', work_started: 'പണി തുടങ്ങി',
    work_in_progress: 'പണി പുരോഗമിക്കുന്നു', quality_check: 'ഗുണനിലവാര പരിശോധന',
    ready: 'ഡെലിവറിക്ക് തയ്യാറായി', delivered: 'വാഹനം കൈമാറി',
  },
};
const stages = ['received','inspection','inspection_completed','work_started','work_in_progress','quality_check','ready','delivered'];
const activeStatuses = new Set(['New','Inspection','Estimate Pending','Approved','In Progress','Waiting for Parts','QC','Ready for Delivery']);
const displayDate = (value, lang) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};
const money = (value) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(Number(value) || 0);
const safePhone = (phone) => String(phone || '').replace(/[^\d+]/g, '');

function PortalWorkshopLogo({ token, enabled }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    if (!enabled) { setSource(''); return undefined; }
    let mounted = true;
    let objectUrl = '';
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/c/${encodeURIComponent(token)}/logo`, {
      signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
    }).then((response) => {
      if (!response.ok) throw new Error('Workshop logo unavailable');
      return response.blob();
    }).then((blob) => {
      if (!mounted) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch(() => { if (mounted) setSource(''); });
    return () => {
      mounted = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, enabled]);
  return source ? <img className="customer-portal-workshop-logo" src={source} alt="" /> : <Car size={22}/>;
}

function PortalPhoto({ photo, token }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    let objectUrl = '';
    const path = `${API_BASE_URL}/c/${encodeURIComponent(token)}/photos/${encodeURIComponent(photo.id)}`;
    fetch(path, { credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then((r) => { if (!r.ok) throw new Error('Photo unavailable'); return r.blob(); })
      .then((blob) => {
        if (!mounted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(() => { if (mounted) setError(true); });
    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id, token]);

  return (
    <figure className="customer-portal-photo">
      {url
        ? <a href={url} rel="noreferrer" target="_blank" aria-label={photo.caption || photo.category}>
            <img src={url} alt={photo.caption || photo.category} loading="lazy" referrerPolicy="no-referrer"/>
          </a>
        : <div className="customer-portal-photo-empty">{error ? 'Photo unavailable' : 'Loading…'}</div>}
      <figcaption>
        <strong>{photo.category}</strong>
        <span>{photo.caption || photo.phase}</span>
      </figcaption>
    </figure>
  );
}

export default function CustomerPortalPage() {
  const { token } = useParams();
  const [lang, setLang] = useState(() => localStorage.getItem('cubegears:customer-language') === 'ml' ? 'ml' : 'en');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoFilter, setPhotoFilter] = useState('all');
  const [portalQuery, setPortalQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const t = dictionaries[lang];

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/c/${encodeURIComponent(token)}`, {
      signal: controller.signal, credentials: 'omit',
      headers: { Accept: 'application/json' }, referrerPolicy: 'no-referrer',
    }).then(async (response) => {
      if (response.status === 404) throw new Error('INVALID_LINK');
      if (!response.ok) throw new Error('NETWORK');
      return response.json();
    }).then((payload) => { if (alive) setData(payload); })
      .catch((cause) => {
        if (alive && cause?.name !== 'AbortError') {
          setError(cause?.message === 'INVALID_LINK' ? 'invalid' : 'network');
          setData(null);
        }
      }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [token, revision]);

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('cubegears:customer-language', newLang);
  };
  // Only records from this signed, customer-scoped API are filtered.
  const search = portalQuery.trim().toLowerCase();
  const vehicles = (data?.vehicles || []).filter((vehicle) =>
    !search || [vehicle.registration, vehicle.model].some((v) => String(v || '').toLowerCase().includes(search))
  );
  const jobs = (data?.jobs || []).filter((job) =>
    !search || [job.number, job.vehicleRegistration, job.vehicleModel, job.status]
      .some((v) => String(v || '').toLowerCase().includes(search))
  );
  const photos = data?.photos || [];
  const visiblePhotos = useMemo(
    () => photoFilter === 'all' ? photos : photos.filter((photo) => photo.category === photoFilter),
    [photos, photoFilter],
  );
  const phone = safePhone(data?.workshop?.phone);
  const waPhone = phone.replace(/^\+/, '');
  const active = jobs.filter((job) => activeStatuses.has(job.status));
  const history = jobs.filter((job) => !activeStatuses.has(job.status));

  return (
    <main className="customer-portal" lang={lang} data-customer-portal>
      <header className="customer-portal-header">
        <div className="customer-portal-brand">
          <PortalWorkshopLogo token={token} enabled={Boolean(data?.workshop?.logoAvailable)} />
          <span>{data?.workshop?.name || 'CubeGears'}</span>
        </div>
        <div className="customer-portal-language" role="group" aria-label="Language">
          <button type="button" className={lang === 'en' ? 'is-active' : ''} onClick={() => changeLanguage('en')}>English</button>
          <button type="button" className={lang === 'ml' ? 'is-active' : ''} onClick={() => changeLanguage('ml')}>മലയാളം</button>
        </div>
      </header>
      <div className="customer-portal-content">
        <div className="customer-portal-intro">
          <span>{t.customer}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        {loading && <div className="customer-portal-loading" role="status">
          <div className="customer-portal-skeleton"/><div className="customer-portal-skeleton"/><p>{t.loading}</p>
        </div>}
        {!loading && error && <section className="customer-portal-card" role="alert">
          <h2>{error === 'invalid' ? t.invalid : t.network}</h2>
          {error !== 'invalid' && <button type="button" onClick={() => setRevision((v) => v + 1)}><RefreshCw size={16}/> {t.retry}</button>}
        </section>}
        {!loading && data && <>
          <div className="customer-portal-record-search">
            <label htmlFor="portal-record-search">{lang === 'ml' ? 'എന്റെ വാഹനങ്ങളും ജോബുകളും തിരയുക' : 'Search my vehicles and jobs'}</label>
            <input id="portal-record-search" type="search" value={portalQuery}
              onChange={(event) => setPortalQuery(event.target.value)}
              placeholder={lang === 'ml' ? 'വാഹന നമ്പർ അല്ലെങ്കിൽ ജോബ് നമ്പർ' : 'Vehicle registration or job number'} />
          </div>
          <section className="customer-portal-card">
            <h2><Car size={18}/>{t.vehicles}</h2>
            {vehicles.length ? <div className="customer-portal-vehicle-list">
              {vehicles.map((v) => <article key={v.id}><strong>{v.registration}</strong><span>{v.model} {v.year || ''}</span></article>)}
            </div> : <p>{t.empty}</p>}
          </section>

          <section className="customer-portal-card">
            <h2><Wrench size={18}/>{t.active}</h2>
            {active.length ? active.map((job) => {
              const index = Math.max(0, stages.indexOf(job.stage));
              return <article key={job.id} className="customer-portal-job">
                <div className="customer-portal-job-top"><strong>{job.number}</strong><span>{job.vehicleRegistration}</span></div>
                <small>{t.date}: {displayDate(job.createdAt, lang)}</small>
                <h3>{t[job.stage] || job.status}</h3>
                <ol className="customer-portal-timeline" aria-label={t.progress}>
                  {stages.map((step, i) => <li key={step} className={i <= index ? 'is-completed' : ''} aria-current={i === index ? 'step' : undefined}>
                    {i <= index ? <CheckCircle2 size={16}/> : <span className="customer-portal-timeline-dot"/>}
                    <span>{t[step]}</span>
                  </li>)}
                </ol>
              </article>;
            }) : <p>{t.empty}</p>}
          </section>

          <section className="customer-portal-card">
            <h2><Camera size={18}/>{t.photos}</h2>
            {photos.length ? <>
              <label className="customer-portal-photo-filter">{t.all}
                <select value={photoFilter} onChange={(e) => setPhotoFilter(e.target.value)}>
                  <option value="all">{t.all}</option>
                  {[...new Set(photos.map((photo) => photo.category))].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className="customer-portal-photo-grid">{visiblePhotos.map((photo) => (
                <PortalPhoto key={photo.id} photo={photo} token={token}/>
              ))}</div>
            </> : <p>{t.noPhotos}</p>}
          </section>

          <section className="customer-portal-card">
            <h2><ClipboardList size={18}/>{t.history}</h2>
            {history.length ? history.map((job) => <article className="customer-portal-history" key={job.id}>
              <strong>{job.number} · {job.vehicleRegistration}</strong><span>{t[job.stage] || job.status}</span>
              <small>{displayDate(job.createdAt, lang)}</small>
            </article>) : <p>{t.empty}</p>}
          </section>

          <section className="customer-portal-card">
            <h2><FileText size={18}/>{t.estimates} / {t.invoices}</h2>
            {[...(data.estimates || []).map((e) => ({...e, key: `e-${e.jobId}-${e.version}`, label: `Estimate v${e.version}`})),
              ...(data.invoices || []).map((i) => ({...i, key: i.number, label: i.number}))].length ? (
              [...(data.estimates || []).map((e) => ({...e, key: `e-${e.jobId}-${e.version}`, label: `Estimate v${e.version}`})),
                ...(data.invoices || []).map((i) => ({...i, key: i.number, label: i.number}))]
                .map((document) => <article key={document.key} className="customer-portal-document">
                  <strong>{document.label}</strong><span>{document.status}</span>
                  <strong>{money(document.total)}</strong>
                </article>)
            ) : <p>{t.empty}</p>}
          </section>

          <section className="customer-portal-card customer-portal-contact">
            <h2><MapPin size={18}/>{t.contact}</h2>
            <strong>{data.workshop?.name}</strong>
            <p>{[data.workshop?.address, data.workshop?.city].filter(Boolean).join(', ')}</p>
            <div className="customer-portal-contact-actions">
              {phone && <a href={`tel:${phone}`}><Phone size={16}/>{t.call}</a>}
              {waPhone && <a target="_blank" rel="noreferrer" href={`https://wa.me/${waPhone}`}>{t.message}</a>}
            </div>
          </section>
        </>}
      </div>
    </main>
  );
}
