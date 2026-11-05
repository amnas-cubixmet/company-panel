import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Package, Phone, Plus, Search, ShoppingBag, Truck } from 'lucide-react';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import { supplierService } from '../../services/supplier.service';
import { supplierFinanceService } from '../../services/supplierFinance.service';
import { ResponsiveModalSheet } from '../../components/common/ResponsiveModalSheet';
import { USE_MOCK_API } from '../../api/apiConfig';
import '../../styles/suppliers-workspace.css';

const asText = value => String(value ?? '').trim();
const formFields = ['name', 'contact_person', 'phone', 'email', 'gstNo', 'address'];
const money = value => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(Number(value) || 0);
const status = item => item?.is_active === false ? 'Inactive' : 'Active';
const supplierIdOf = row => String(typeof row?.supplier === 'object' ? row.supplier?.id : row?.supplier || row?.supplierId || '');
const initialForm = supplier => ({
  name:asText(supplier?.name),
  contact_person:asText(supplier?.contact_person || supplier?.contactPerson),
  phone:asText(supplier?.phone),
  email:asText(supplier?.email),
  gstNo:asText(supplier?.gstNo || supplier?.gstin),
  address:asText(supplier?.address),
  is_active:supplier?.is_active !== false,
});

function SupplierEditor({ supplier, onClose, onSaved }) {
  const access = useFeatureAccess();
  const canWrite = access.can(supplier ? 'stock.edit' : 'stock.create') && !USE_MOCK_API;
  const [form, setForm] = useState(() => initialForm(supplier));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setField = (key, value) => setForm(prev => ({ ...prev, [key]:value }));
  const submit = async event => {
    event.preventDefault();
    if (!canWrite || busy) return;
    if (!form.name.trim()) { setError('Supplier Name is required.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { ...form, name:form.name.trim(), email:form.email.trim() };
      const saved = supplier
        ? await supplierService.update(supplier.id, payload)
        : await supplierService.create(payload);
      onSaved(saved);
    } catch (cause) {
      const data = cause?.response?.data;
      setError(asText(data?.name?.[0] || data?.gstNo?.[0] || data?.phone?.[0] || data?.detail || data?.message || cause?.message || 'Unable to save supplier.'));
    } finally { setBusy(false); }
  };
  const labels = {
    name:'Supplier Name *', contact_person:'Contact Person', phone:'Phone',
    email:'Email', gstNo:'GSTIN', address:'Address',
  };
  return <ResponsiveModalSheet isOpen onClose={() => !busy && onClose()} title={supplier ? 'Edit Supplier' : 'Add Supplier'} maxWidth="590px">
    <form className="cg-supplier-form" onSubmit={submit}>
      {formFields.map(key => <label key={key} className="cg-supplier-floating">
        {key === 'address'
          ? <textarea rows={2} placeholder=" " value={form[key]} onChange={e => setField(key,e.target.value)} />
          : <input placeholder=" " required={key==='name'} type={key==='email'?'email':key==='phone'?'tel':'text'}
              maxLength={key==='name'?180:key==='contact_person'?120:key==='phone'?30:key==='gstNo'?20:254}
              value={form[key]} onChange={e => setField(key,e.target.value)} />}
        <span>{labels[key]}</span>
      </label>)}
      {supplier && <label className="cg-supplier-toggle">
        <input type="checkbox" checked={form.is_active} onChange={e=>setField('is_active',e.target.checked)}/>
        <span>Active Supplier</span>
      </label>}
      {error && <p role="alert" className="cg-supplier-error">{error}</p>}
      {USE_MOCK_API && <p className="cg-supplier-note">Saving requires the Django backend.</p>}
      <div className="cg-supplier-modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="primary" disabled={!canWrite||busy}>
          {busy ? 'Saving…' : 'Save Supplier'}
        </button>
      </div>
    </form>
  </ResponsiveModalSheet>;
}

export default function SuppliersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const access = useFeatureAccess();
  const canCreate = access.can('stock.create') && !USE_MOCK_API;
  const canEdit = access.can('stock.edit') && !USE_MOCK_API;
  const canViewFinance = access.can('payments.view') && access.can('stock.view');
  const canDelete = access.can('stock.delete') && !USE_MOCK_API;
  const [suppliers, setSuppliers] = useState([]);
  const [creditBalances, setCreditBalances] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const statusFilter = params.get('status') || 'all';
  const search = params.get('q') || '';

  useEffect(() => {
    let active=true;
    setLoading(true);setError('');
    supplierService.list()
      .then(rows => { if(active)setSuppliers(rows); })
      .catch(cause => { if(active)setError(cause?.message || 'Could not load suppliers.'); })
      .finally(() => { if(active)setLoading(false); });
    return()=>{active=false};
  }, []);

  useEffect(() => {
    if (!id) { setSupplier(null);setOrders([]);setProducts([]);setDetailsLoading(false);return undefined; }
    let active=true;
    setDetailsLoading(true);setSupplier(null);setError('');
    Promise.all([supplierService.get(id), supplierService.purchaseOrders(), supplierService.products()])
      .then(([found,purchases,stock]) => {
        if(!active)return;
        setSupplier(found);
        setOrders(purchases.filter(row=>supplierIdOf(row)===String(id)));
        setProducts(stock.filter(row=>supplierIdOf(row)===String(id)));
      }).catch(cause=>{if(active)setError(cause?.message || 'Unable to load supplier details.');})
      .finally(()=>{if(active)setDetailsLoading(false);});
    return()=>{active=false};
  }, [id]);

  useEffect(() => {
    if (!canViewFinance || USE_MOCK_API) return undefined;
    let active = true;
    // SupplierBill is the authoritative posted payable, not a draft PO or an expense.
    supplierFinanceService.getBills().then(rows => {
      if (!active) return;
      const balances = new Map();
      for (const bill of rows) {
        if (bill.postingStatus !== 'Posted') continue;
        const key = String(bill.supplierId);
        balances.set(key, (balances.get(key) || 0) + Number(bill.outstanding || 0));
      }
      setCreditBalances(balances);
    }).catch(() => { if (active) setCreditBalances(null); });
    return () => { active = false; };
  }, [canViewFinance]);

  const matches = useMemo(() => {
    const needle=search.trim().toLowerCase();
    return suppliers.filter(row =>
      (statusFilter === 'all' || status(row).toLowerCase() === statusFilter) &&
      [row.name, row.phone, row.contact_person, row.contactPerson, row.gstNo, row.gstin, row.email]
        .some(value=>asText(value).toLowerCase().includes(needle))
    );
  },[search,suppliers,statusFilter]);

  async function deactivateSupplier() {
    if (!supplier || !canEdit || actionBusy) return;
    setActionBusy(true); setError('');
    try {
      const changed = await supplierService.update(supplier.id, { is_active: false });
      setSupplier(changed);
      setSuppliers(rows => rows.map(x => String(x.id) === String(changed.id) ? changed : x));
    } catch (cause) {
      setError(cause?.response?.data?.message || cause?.message || 'Could not deactivate supplier.');
    } finally { setActionBusy(false); }
  }

  async function deleteSupplier() {
    if (!supplier || !canDelete || actionBusy || !window.confirm(
      'Delete this supplier? Suppliers with stock or purchase history cannot be deleted.'
    )) return;
    setActionBusy(true); setError('');
    try {
      await supplierService.remove(supplier.id);
      setSuppliers(rows => rows.filter(x => String(x.id) !== String(supplier.id)));
      navigate('/suppliers');
    } catch (cause) {
      setError(cause?.response?.data?.message || cause?.message || 'Cannot delete this supplier. Deactivate it instead.');
    } finally { setActionBusy(false); }
  }

  function onSaved(saved) {
    setEditor(null);
    setSuppliers(rows => {
      const exists=rows.some(row=>String(row.id)===String(saved.id));
      return exists ? rows.map(row=>String(row.id)===String(saved.id)?saved:row) : [saved,...rows];
    });
    if(id) setSupplier(saved);
    else navigate('/suppliers/'+encodeURIComponent(saved.id));
  }

  return <div className="cg-suppliers-page">
    <div className="cg-suppliers-head">
      <div>
        {id&&<Link className="cg-suppliers-back" to="/suppliers"><ArrowLeft size={16}/> All Suppliers</Link>}
        <h1>{id ? (supplier?.name || 'Supplier Details') : 'Suppliers'}</h1>
      </div>
      {id ? canEdit && supplier && <button type="button" className="cg-supplier-button" onClick={()=>setEditor(supplier)}>Edit Supplier</button>
        : canCreate && <button type="button" className="cg-supplier-button primary" onClick={()=>setEditor({create:true})}><Plus size={17}/> Add Supplier</button>}
    </div>

    {error&&<div className="cg-supplier-error" role="alert">{error} <button type="button" onClick={()=>window.location.reload()}>Retry</button></div>}

    {!id&&<>
      <div className="cg-supplier-toolbar">
        <label className="cg-supplier-search"><Search size={18} aria-hidden="true"/>
          <input aria-label="Search suppliers" value={search} placeholder="Search name, phone or GSTIN"
            onChange={e=>{const p=new URLSearchParams(params);if(e.target.value)p.set('q',e.target.value);else p.delete('q');setParams(p,{replace:true});}}/>
        </label>
        <label className="cg-supplier-filter">
          <span className="sr-only">Filter suppliers</span>
          <select aria-label="Filter suppliers" value={statusFilter} onChange={event => {
            const p = new URLSearchParams(params);
            if (event.target.value === 'all') p.delete('status'); else p.set('status', event.target.value);
            setParams(p, { replace: true });
          }}>
            <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </label>
        <span>{matches.length} suppliers</span>
      </div>
      {loading?<p role="status" className="cg-supplier-empty">Loading suppliers…</p>:
        matches.length?<div className="cg-suppliers-list">
          {matches.map(row=><Link className="cg-supplier-list-item" to={'/suppliers/'+encodeURIComponent(row.id)} key={row.id}>
            <span className="cg-supplier-avatar"><Truck size={21}/></span>
            <span className="cg-supplier-summary">
              <strong>{row.name}</strong>
              <small>{[row.contact_person||row.contactPerson,row.phone].filter(Boolean).join(' · ')||'Contact details not added'}</small>
              {canViewFinance && <small>Credit outstanding: {creditBalances ? money(creditBalances.get(String(row.id)) || 0) : 'Unavailable'}</small>}
            </span>
            <span className={row.is_active===false?'cg-supplier-status inactive':'cg-supplier-status'}>{status(row)}</span>
          </Link>)}
        </div>:<p className="cg-supplier-empty">{search?'No suppliers match your search.':'No suppliers added yet.'}</p>}
    </>}

    {id&&!detailsLoading&&supplier&&<>
      <section className="cg-supplier-profile">
        <div className="cg-supplier-profile-head"><Building2 size={20}/><h2>Supplier Information</h2>
          <span className={supplier.is_active===false?'cg-supplier-status inactive':'cg-supplier-status'}>{status(supplier)}</span>
        </div>
        <div className="cg-supplier-fields">
          <div><span>Contact Person</span><strong>{supplier.contact_person||supplier.contactPerson||'—'}</strong></div>
          <div><span>Phone</span><strong>{supplier.phone||'—'}</strong></div>
          <div><span>Email</span><strong>{supplier.email||'—'}</strong></div>
          <div><span>GSTIN</span><strong>{supplier.gstNo||'—'}</strong></div>
          <div className="full"><span>Address</span><strong>{supplier.address||'—'}</strong></div>
        </div>
        {canViewFinance && <div style={{ marginTop: 10, fontSize: 14 }}>
          Credit outstanding: <strong>{creditBalances ? money(creditBalances.get(String(supplier.id)) || 0) : 'Unavailable'}</strong>
          <Link to="/suppliers/credits" style={{ marginLeft: 12, color: 'var(--primary)' }}>Credit Management</Link>
        </div>}
        <div className="cg-supplier-contacts">
          {supplier.phone&&<a href={'tel:'+String(supplier.phone).replace(/[^\d+]/g,'')}><Phone size={15}/> Call</a>}
          {supplier.email&&<a href={'mailto:'+supplier.email}><Mail size={15}/> Email</a>}
          <Link to={'/stock?supplier='+encodeURIComponent(supplier.id)}><Package size={15}/> Inventory</Link>
          {supplier.is_active !== false && canEdit && <button type="button" disabled={actionBusy}
            onClick={deactivateSupplier} className="cg-supplier-button">Deactivate</button>}
          {canDelete && <button type="button" disabled={actionBusy}
            onClick={deleteSupplier} className="cg-supplier-button">Delete Supplier</button>}
        </div>
      </section>
      <div className="cg-supplier-details-grid">
        <section className="cg-supplier-profile">
          <div className="cg-supplier-profile-head"><ShoppingBag size={20}/><h2>Purchase Orders</h2><span>{orders.length} loaded</span></div>
          {orders.length? orders.map(order=><div className="cg-supplier-record" key={order.id}>
            <div><strong>{order.purchaseNo||order.number||'Purchase Order'}</strong><small>{order.status||'—'}</small></div>
            <b>{money(order.total)}</b>
          </div>):<p className="cg-supplier-empty">No purchase orders found.</p>}
        </section>
        <section className="cg-supplier-profile">
          <div className="cg-supplier-profile-head"><Package size={20}/><h2>Supplied Products</h2><span>{products.length} loaded</span></div>
          {products.length? products.map(item=><div className="cg-supplier-record" key={item.id}>
            <div><strong>{item.partName||item.name}</strong><small>{item.sku||'—'}</small></div>
            <span>{item.onHand??'—'} in stock</span>
          </div>):<p className="cg-supplier-empty">No products linked yet.</p>}
        </section>
      </div>
    </>}
    {id&&detailsLoading&&<p role="status" className="cg-supplier-empty">Loading supplier details…</p>}
    {id&&!detailsLoading&&!supplier&&!error&&<p className="cg-supplier-empty">Supplier not found.</p>}
    {editor&&<SupplierEditor key={editor.id||'new'} supplier={editor.create?null:editor}
      onClose={()=>setEditor(null)} onSaved={onSaved}/>}
  </div>;
}
