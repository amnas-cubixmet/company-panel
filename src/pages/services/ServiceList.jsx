import { appConfirm, appAlert } from '../../components/common/appDialogs';
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Activity, Clock3, Edit3, IndianRupee, Layers3, Trash2 } from "lucide-react";
import { ResponsiveModalSheet } from '../../components/common/ResponsiveModalSheet';
import {
  ServiceCatalogGrid,
  ServiceCatalogTabs,
  ServiceCategoriesPanel,
  ServiceFilterToolbar,
  ServiceOverviewStats,
  ServicesHeader,
} from '../../components/services';
import { serviceService } from '../../services/service.service';
import { buildCategoryTreeRows, categoryIsDescendantOf } from '../../utils/serviceHierarchy';
import '../../styles/service-management.css';
import '../../styles/service-borderless-forms.css';
import '../../styles/service-hierarchy.css';

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const pricingTypes = ['Fixed', 'Starting', 'Inspection Based'];

const emptyService = {
  code: '',
  name: '',
  category: '',
  categoryId: '',
  pricingType: 'Fixed',
  price: '',
  durationMinutes: '60',
  status: 'active',
  description: '',
  checklistText: '',
  hsnSac: '', taxRate: '18', taxTreatment: 'taxable', unit: 'Job'
};

const emptyCategory = {
  name: '',
  description: '',
  status: 'active', parentId: ''
};

const statusClass = (status = '') =>
  String(status).toLowerCase() === 'active' ? 'is-active' : 'is-inactive';

const durationLabel = (minutes) => {
  const total = Number(minutes || 0);
  if (!total) return '—';
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const Metric = ({ label, value, icon: Icon, tone = 'primary' }) => (
  <article className="service-metric-card">
    <div className="service-metric-card__top">
      <span>{label}</span>
      <i className={`is-${tone}`}><Icon size={16}/></i>
    </div>
    <strong>{value}</strong>
  </article>
);

const Field = ({ label, children, wide = false }) => (
  <label className={wide ? 'service-field is-wide' : 'service-field'}>
    <span>{label}</span>
    {children}
  </label>
);

const ServiceForm = ({
  values,
  setValues,
  categories,
  onSubmit,
  onCancel,
  submitting,
  title
}) => (
  <div className="service-form-page cg-services">
    <header className="service-form-header">
      <div>
        <h1>{title}</h1>
        <p>Configure workshop labour service, pricing, duration, category and checklist.</p>
      </div>
    </header>

    <form className="service-form" onSubmit={onSubmit}>
      <section className="service-form-section">
        <div className="service-section-header">
          <div>
            <h2>Service Information</h2>
            <p>Core service identity and workshop category.</p>
          </div>
        </div>

        <div className="service-form-grid">
          <Field label="Service Code">
            <input
              required
              value={values.code}
              onChange={(e)=>setValues({...values,code:e.target.value.toUpperCase()})}
              placeholder="e.g. BRAKE-001"
            />
          </Field>

          <Field label="Service Name">
            <input
              required
              value={values.name}
              onChange={(e)=>setValues({...values,name:e.target.value})}
              placeholder="Front Brake Pad Replacement"
            />
          </Field>

          <Field label="Category">
            <select
              required
              value={values.categoryId}
              onChange={(e)=>{
                const category=categories.find((item)=>item.id===e.target.value);
                setValues({
                  ...values,
                  categoryId:e.target.value,
                  category:category?.name || ''
                });
              }}
            >
              <option value="">Select category</option>
              {categories.map((category)=><option key={category.id} value={category.id}>{'— '.repeat(Math.min(category.depth || 0, 10)) + category.name}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <select value={values.status} onChange={(e)=>setValues({...values,status:e.target.value})}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="service-form-section">
        <div className="service-section-header">
          <div>
            <h2>Pricing & Time</h2>
            <p>Default labour charge, pricing method and estimated duration.</p>
          </div>
        </div>

        <div className="service-form-grid">
          <Field label="Pricing Type">
            <select value={values.pricingType} onChange={(e)=>setValues({...values,pricingType:e.target.value})}>
              {pricingTypes.map((type)=><option key={type}>{type}</option>)}
            </select>
          </Field>

          <Field label="Default Selling Rate (₹)">
            <input type="number" min="0" max="10000000" step="0.01" value={values.price}
              onChange={(e)=>setValues({...values,price:e.target.value})}/>
          </Field>
          <Field label="Unit">
            <input maxLength={30} value={values.unit || 'Job'}
              onChange={(e)=>setValues({...values,unit:e.target.value})}/>
          </Field>
          <Field label="SAC / HSN">
            <input maxLength={20} inputMode="numeric" value={values.hsnSac || ''}
              onChange={(e)=>setValues({...values,hsnSac:e.target.value})} placeholder="Verified code if known"/>
          </Field>
          <Field label="GST Rate (%)">
            <input type="number" min="0" max="100" step="0.01" value={values.taxRate ?? ''}
              onChange={(e)=>setValues({...values,taxRate:e.target.value})}/>
          </Field>
          <Field label="GST Treatment">
            <select value={values.taxTreatment || 'taxable'}
              onChange={(e)=>setValues({...values,taxTreatment:e.target.value})}>
              <option value="taxable">Taxable</option><option value="exempt">Exempt</option>
              <option value="nil_rated">Nil-rated</option><option value="non_gst">Non-GST</option>
              <option value="out_of_scope">Out of scope</option>
            </select>
          </Field>

          <Field label="Estimated Duration (minutes)">
            <input type="number" min="0" value={values.durationMinutes} onChange={(e)=>setValues({...values,durationMinutes:e.target.value})}/>
          </Field>
        </div>
      </section>

      <section className="service-form-section">
        <div className="service-section-header">
          <div>
            <h2>Description & Checklist</h2>
            <p>Workshop scope and standard technician checklist.</p>
          </div>
        </div>

        <div className="service-form-grid">
          <Field label="Description" wide>
            <textarea
              rows="4"
              value={values.description}
              onChange={(e)=>setValues({...values,description:e.target.value})}
              placeholder="Describe what this service includes..."
            />
          </Field>

          <Field label="Checklist — one item per line" wide>
            <textarea
              rows="6"
              value={values.checklistText}
              onChange={(e)=>setValues({...values,checklistText:e.target.value})}
              placeholder={'Inspect condition\nPerform labour work\nFinal quality check'}
            />
          </Field>
        </div>
      </section>

      <div className="service-form-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button className="is-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Service'}
        </button>
      </div>
    </form>
  </div>
);

export const ServiceList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const isNew = location.pathname === '/services/new';
  const isEdit = Boolean(id && location.pathname.endsWith('/edit'));
  const isDetail = Boolean(id && !isEdit && location.pathname !== '/services');

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeView, setActiveView] = useState('services');
  const [form, setForm] = useState(emptyService);

  const [categoryEditor, setCategoryEditor] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [categoryError, setCategoryError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [serviceRows, categoryRows] = await Promise.all([
        serviceService.getServices(),
        serviceService.getServiceCategories()
      ]);
      setServices(serviceRows);
      setCategories(categoryRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isEdit || !id || !services.length) return;
    const service = services.find((item)=>item.id===id);
    if (!service) return;
    setForm({
      code: service.code || '',
      name: service.name || '',
      category: service.category || '',
      categoryId: service.categoryId || categories.find((category)=>category.name===service.category)?.id || '',
      pricingType: service.pricingType || 'Fixed',
      price: service.price ?? '',
      durationMinutes: service.durationMinutes ?? '',
      status: service.status || 'active',
      description: service.description || '',
      checklistText: Array.isArray(service.checklist)
        ? service.checklist.join('\n')
        : service.checklistText || '',
      hsnSac: service.hsnSac || '', taxRate: service.taxRate ?? '18',
      taxTreatment: service.taxTreatment || 'taxable', unit: service.unit || 'Job'
    });
  }, [isEdit, id, services, categories]);

  useEffect(() => {
    if (isNew && !form.categoryId && categories.length) {
      setForm((current)=>({
        ...current,
        categoryId: categories[0].id,
        category: categories[0].name
      }));
    }
  }, [isNew, categories, form.categoryId]);

  const categoryTree = useMemo(() => buildCategoryTreeRows(categories), [categories]);

  const selectedService = useMemo(
    () => services.find((service)=>service.id===id) || null,
    [services, id]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => {
      const queryMatch = !q || [service.code, service.name, service.category, service.description]
        .some((value)=>String(value || '').toLowerCase().includes(q));
      const categoryMatch = categoryFilter === 'All' || service.category === categoryFilter;
      const statusMatch = statusFilter === 'All' || String(service.status).toLowerCase() === statusFilter.toLowerCase();
      return queryMatch && categoryMatch && statusMatch;
    });
  }, [services, query, categoryFilter, statusFilter]);

  const metrics = useMemo(() => ({
    total: services.length,
    active: services.filter((service)=>String(service.status).toLowerCase()==='active').length,
    categories: categories.length,
    averagePrice: services.length
      ? services.reduce((sum, service)=>sum+Number(service.price || 0),0) / services.length
      : 0
  }), [services, categories]);

  const saveService = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price || 0),
        durationMinutes: Number(form.durationMinutes || 0),
        checklist: form.checklistText
          .split('\n')
          .map((item)=>item.trim())
          .filter(Boolean)
      };

      if (isEdit && id) {
        await serviceService.updateService(id, payload);
        navigate(`/services/${id}`);
      } else {
        const created = await serviceService.createService(payload);
        navigate(created?.id ? `/services/${created.id}` : '/services');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteService = async (service) => {
    if (!await appConfirm(`Delete service ${service.name}?`)) return;
    await serviceService.deleteService(service.id);
    await load();
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setCategoryError('');
    setSubmitting(true);
    try {
      if (categoryEditor?.id) {
        await serviceService.updateServiceCategory(categoryEditor.id, categoryForm);
      } else {
        await serviceService.createServiceCategory(categoryForm);
      }
      setCategoryEditor(null);
      setCategoryForm(emptyCategory);
      await load();
    } catch (error) {
      setCategoryError(error?.message || 'Unable to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!await appConfirm(`Delete category ${category.name}?`)) return;
    try {
      await serviceService.deleteServiceCategory(category.id);
      await load();
    } catch (error) {
      appAlert(error?.message || 'Unable to delete category.');
    }
  };

  if (loading) return <div className="service-empty">Loading services...</div>;

  if (isNew) {
    return (
      <ServiceForm
        values={form}
        setValues={setForm}
        categories={categoryTree}
        onSubmit={saveService}
        onCancel={()=>navigate('/services')}
        submitting={submitting}
        title="Add Service"
      />
    );
  }

  if (isEdit) {
    if (!selectedService) return <div className="service-empty">Service not found.</div>;
    return (
      <ServiceForm
        values={form}
        setValues={setForm}
        categories={categoryTree}
        onSubmit={saveService}
        onCancel={()=>navigate(`/services/${id}`)}
        submitting={submitting}
        title="Edit Service"
      />
    );
  }

  if (isDetail) {
    if (!selectedService) return <div className="service-empty">Service not found.</div>;
    const checklist = Array.isArray(selectedService.checklist) ? selectedService.checklist : [];

    return (
      <div className="service-management-page service-detail-page cg-services">
        <header className="service-detail-header">
          <div>
            <span>{selectedService.code}</span>
            <h1>{selectedService.name}</h1>
            <p>{selectedService.category} · {selectedService.pricingType || 'Fixed'}</p>
          </div>
          <div className="service-detail-actions">
            <button onClick={()=>navigate(`/services/${selectedService.id}/edit`)}><Edit3 size={14}/> Edit</button>
            <button className="is-danger" onClick={async()=>{await deleteService(selectedService);navigate('/services');}}><Trash2 size={14}/> Delete</button>
          </div>
        </header>

        <div className="service-detail-kpis">
          <div><IndianRupee size={16}/><span>Labour Charge</span><strong>{money.format(selectedService.price || 0)}</strong></div>
          <div><Clock3 size={16}/><span>Duration</span><strong>{durationLabel(selectedService.durationMinutes)}</strong></div>
          <div><Layers3 size={16}/><span>Category</span><strong>{selectedService.category}</strong></div>
          <div><Activity size={16}/><span>Status</span><strong>{selectedService.status || 'active'}</strong></div>
        </div>

        <div className="service-two-column">
          <section className="service-panel">
            <div className="service-section-header">
              <div>
                <h2>Service Details</h2>
                <p>Workshop scope and default pricing setup.</p>
              </div>
            </div>
            <div className="service-info-grid">
              <div><span>Code</span><strong>{selectedService.code}</strong></div>
              <div><span>Pricing Type</span><strong>{selectedService.pricingType || 'Fixed'}</strong></div>
              <div><span>Category</span><strong>{selectedService.category}</strong></div>
              <div><span>Duration</span><strong>{durationLabel(selectedService.durationMinutes)}</strong></div>
              <div><span>Labour Charge</span><strong>{money.format(selectedService.price || 0)}</strong></div>
              <div><span>Status</span><strong>{selectedService.status || 'active'}</strong></div>
            </div>

            <div className="service-description-box">
              {selectedService.description || 'No service description added yet.'}
            </div>
          </section>

          <section className="service-panel">
            <div className="service-section-header">
              <div>
                <h2>Technician Checklist</h2>
                <p>Standard work steps for this service.</p>
              </div>
            </div>

            <div className="service-checklist">
              {checklist.length ? checklist.map((item,index)=>(
                <div key={`${item}-${index}`}>
                  <span>{index+1}</span>
                  <strong>{item}</strong>
                </div>
              )) : <div className="service-empty">No checklist items configured.</div>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="service-management-page cg-services service-dashboard">
      <ServicesHeader onAdd={()=>navigate('/services/new')} />

      <ServiceOverviewStats
        metrics={metrics}
        formatMoney={(value)=>money.format(value || 0)}
      />

      <ServiceCatalogTabs
        activeView={activeView}
        onChange={setActiveView}
      />

      {activeView === 'services' ? (
        <>
          <ServiceFilterToolbar
            query={query}
            onQueryChange={setQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categories={categoryTree}
          />

          <ServiceCatalogGrid
            services={filtered}
            formatMoney={(value)=>money.format(value || 0)}
            durationLabel={durationLabel}
            onView={(service)=>navigate(`/services/${service.id}`)}
            onEdit={(service)=>navigate(`/services/${service.id}/edit`)}
            onDelete={deleteService}
          />
        </>
      ) : (
        <ServiceCategoriesPanel
          categories={categories}
          services={services}
          onAdd={(parentId = null)=>{
            setCategoryEditor({});
            setCategoryForm({ ...emptyCategory, parentId: parentId || '' });
          }}
          onEdit={(category)=>{
            setCategoryEditor(category);
            setCategoryForm({
              name:category.name,
              description:category.description || '',
              status:category.status || 'active',
              parentId:category.parentId || ''
            });
          }}
          onDelete={deleteCategory}
        />
      )}

      <ResponsiveModalSheet
        isOpen={categoryEditor !== null}
        onClose={()=>{
          setCategoryEditor(null);
          setCategoryForm(emptyCategory);
          setCategoryError('');
        }}
        title={categoryEditor?.id ? 'Edit Service Category' : 'Add Service Category'}
        maxWidth="560px"
      >
        <form className="service-category-form" onSubmit={saveCategory}>
          {categoryError ? <div className="service-form-error">{categoryError}</div> : null}
          <Field label="Category Name">
            <input
              required
              value={categoryForm.name}
              onChange={(e)=>setCategoryForm({...categoryForm,name:e.target.value})}
            />
          </Field>
          <Field label="Parent Category">
            <select value={categoryForm.parentId || ''}
              onChange={event => setCategoryForm({...categoryForm, parentId: event.target.value})}>
              <option value="">Main Category (root)</option>
              {categoryTree.filter(cat => !categoryEditor?.id ||
                (String(cat.id) !== String(categoryEditor.id) &&
                  !categoryIsDescendantOf(categoryEditor.id, cat.id, categories))
              ).map(cat => <option key={cat.id} value={cat.id}>
                {'— '.repeat(Math.min(cat.depth, 10)) + cat.name}
              </option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              rows="4"
              value={categoryForm.description}
              onChange={(e)=>setCategoryForm({...categoryForm,description:e.target.value})}
            />
          </Field>
          <Field label="Status">
            <select
              value={categoryForm.status}
              onChange={(e)=>setCategoryForm({...categoryForm,status:e.target.value})}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <div className="service-form-actions">
            <button type="button" onClick={()=>setCategoryEditor(null)}>Cancel</button>
            <button className="is-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </ResponsiveModalSheet>
    </div>
  );
};

export default ServiceList;
