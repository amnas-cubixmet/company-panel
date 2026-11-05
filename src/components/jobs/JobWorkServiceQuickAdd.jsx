import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import { serviceService } from '../../services/service.service';
import { jobService } from '../../services/job.service';
import { buildCategoryTreeRows, categoryIsDescendantOf } from '../../utils/serviceHierarchy';
import '../../styles/job-work-service-quick.css';

const initial = () => ({
  serviceId: '', quantity: '1', customerRate: '', mechanicId: '',
  mechanicCost: '0', requestId: '',
});

const showError = error => {
  const data = error?.response?.data;
  const issue = data && typeof data === 'object'
    ? Object.values(data).flat().find(Boolean) : null;
  return String(issue || error?.message || 'Could not save service.');
};

export function JobWorkServiceQuickAdd({ jobId, staff = [], canEdit, onSaved }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [form, setForm] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [newService, setNewService] = useState({ name: '', code: '', price: '0', categoryId: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([serviceService.getServices(), serviceService.getServiceCategories()])
      .then(([entries, parents]) => {
        if (active) {
          setServices(Array.isArray(entries) ? entries : []);
          setCategories(Array.isArray(parents) ? parents : []);
        }
      })
      .catch(err => { if (active) setError(showError(err)); });
    return () => { active = false; };
  }, []);

  const tree = useMemo(() => buildCategoryTreeRows(categories), [categories]);
  const categoryDescendants = useMemo(() => {
    if (!categoryId) return null;
    return new Set(tree.filter(category => category.id === categoryId ||
      categoryIsDescendantOf(categoryId, category.id, categories)).map(category => category.id));
  }, [tree, categories, categoryId]);
  const matches = useMemo(() => services.filter(service =>
    String(service.status || 'active').toLowerCase() === 'active' &&
    (!categoryDescendants || categoryDescendants.has(service.categoryId)) &&
    [service.name, service.code, service.description].some(value =>
      !search.trim() || String(value || '').toLowerCase().includes(search.trim().toLowerCase()))
  ).slice(0, 60), [services, search, categoryDescendants]);

  const selectService = service => {
    setForm(current => ({
      ...current, serviceId: service.id, customerRate: String(service.price ?? '0'),
      // A changed service is a distinct financial operation, not a retry.
      requestId: '',
    }));
    setError('');
    setNotice('');
  };

  const add = async event => {
    event.preventDefault();
    if (!canEdit || saving || !form.serviceId) return;
    const requestId = form.requestId || crypto.randomUUID();
    setForm(current => ({ ...current, requestId }));
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await jobService.addJobService(jobId, { ...form, requestId });
      setForm(initial());
      setSearch('');
      setCategoryId('');
      setNotice('Service saved to Job Card. Worker charge is not a payroll payment.');
      await onSaved?.();
      searchRef.current?.focus();
    } catch (err) {
      // Keep requestId unchanged so retries cannot duplicate the entry.
      setError(showError(err));
    } finally {
      setSaving(false);
    }
  };

  const create = async event => {
    event.preventDefault();
    if (!canEdit || saving) return;
    setSaving(true);
    setError('');
    try {
      const code = newService.code.trim();
      const created = await serviceService.createService({
        name: newService.name.trim(), code, price: newService.price,
        categoryId: newService.categoryId || null,
        status: 'active',
      });
      setServices(previous => [created, ...previous.filter(row => row.id !== created.id)]);
      selectService(created);
      setSearch(created.name);
      setShowCreate(false);
      setNewService({ name: '', code: '', price: '0', categoryId: '' });
      setNotice('New service created in the existing catalogue. Review quantity and rate before adding.');
    } catch (err) {
      setError(showError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="job-service-quick" aria-label="Add a job service">
      <header><div><Wrench size={18}/><strong>Add Service</strong></div>
        <span>Customer selling rate and worker charge are recorded separately.</span></header>
      {error && <p className="job-service-quick-error" role="alert">{error}</p>}
      {notice && <p className="job-service-quick-notice" role="status">{notice}</p>}
      <div className="job-service-quick-filters">
        <label>Category
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {tree.map(row => <option key={row.id} value={row.id}>
              {'— '.repeat(Math.min(row.depth || 0, 8))}{row.name}
            </option>)}
          </select>
        </label>
        <label>Search Service
          <span className="job-service-quick-search"><Search size={16}/>
            <input ref={searchRef} type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name or service code" aria-label="Search service catalogue"/>
          </span>
        </label>
      </div>
      <div className="job-service-quick-results" role="group" aria-label="Matching services">
        {matches.map(service => <button key={service.id} type="button"
          aria-pressed={form.serviceId === service.id}
          className={form.serviceId === service.id ? 'is-selected' : ''}
          onClick={() => selectService(service)}>
          <span><strong>{service.name}</strong><small>{service.code || 'Service'} · {service.category || 'Uncategorized'}</small></span>
          <b>₹{Number(service.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
        </button>)}
        {!matches.length && <p>No matching services. You can create a reusable service below.</p>}
      </div>
      {canEdit && <button type="button" className="job-service-quick-new" disabled={saving}
        onClick={() => { setShowCreate(value => !value); setError(''); }}>
        <Plus size={16}/> {showCreate ? 'Cancel New Service' : 'Create New Service'}
      </button>}
      {showCreate && canEdit && <form className="job-service-quick-create" onSubmit={create}>
        <label>Service Name<input required maxLength={160} value={newService.name}
          onChange={e => setNewService(old => ({ ...old, name: e.target.value }))}/></label>
        <label>Service Code<input required maxLength={40} value={newService.code}
          onChange={e => setNewService(old => ({ ...old, code: e.target.value.toUpperCase() }))}/></label>
        <label>Default Customer Rate (₹)<input required type="number" min="0" max="10000000" step="0.01"
          value={newService.price} onChange={e => setNewService(old => ({ ...old, price: e.target.value }))}/></label>
        <label>Category<select value={newService.categoryId}
          onChange={e => setNewService(old => ({ ...old, categoryId: e.target.value }))}>
          <option value="">Uncategorized</option>
          {tree.map(row => <option value={row.id} key={row.id}>{row.path}</option>)}
        </select></label>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save to Catalogue'}</button>
      </form>}
      {canEdit && <form className="job-service-quick-entry" onSubmit={add}>
        <label>Quantity<input required type="number" inputMode="decimal" min="0.01" max="10000" step="0.01"
          value={form.quantity} onChange={e => setForm(old => ({ ...old, quantity: e.target.value, requestId: '' }))}/></label>
        <label>Customer Rate (₹)<input required type="number" inputMode="decimal" min="0" max="10000000" step="0.01"
          value={form.customerRate} onChange={e => setForm(old => ({ ...old, customerRate: e.target.value, requestId: '' }))}/></label>
        <label>Mechanic (Optional)<select value={form.mechanicId}
          onChange={e => setForm(old => ({ ...old, mechanicId: e.target.value, requestId: '' }))}>
          <option value="">Not assigned</option>
          {staff.map(row => <option key={row.userId || row.id} value={row.userId || row.id}>{row.name || row.fullName}</option>)}
        </select></label>
        <label>Agreed Mechanic Charge (₹) — not paid<input type="number" inputMode="decimal" min="0" max="10000000" step="0.01"
          value={form.mechanicCost} onChange={e => setForm(old => ({ ...old, mechanicCost: e.target.value, requestId: '' }))}/></label>
        <div className="job-service-quick-total">Customer charge
          <strong>₹{(Math.max(0, Number(form.quantity) || 0) * Math.max(0, Number(form.customerRate) || 0))
            .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
        <button type="submit" disabled={!form.serviceId || saving}>{saving ? 'Saving…' : 'Add Service to Job'}</button>
      </form>}
    </section>
  );
}

export default JobWorkServiceQuickAdd;
