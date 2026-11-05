import { appConfirm } from '../../components/common/appDialogs';
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from '../../components/common/Search';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { ResponsiveModalSheet } from '../../components/common/ResponsiveModalSheet';
import '../../styles/customer-workshop-form.css';
import { customerService } from '../../services/customer.service';
import { customerInvoiceMoney, customerStatusLabel, formatCustomerMoney } from './customerDirectoryMoney';
import { CustomerContactActions } from '../../components/customers/CustomerContactActions';
import { Users, Plus, Filter, Edit, Phone, MessageSquare, Mail, AlertTriangle, ChevronRight } from "lucide-react";

const normalizeCustomerType = (value) =>
  /business|company/i.test(String(value || '')) ? 'Business / Company' : 'Individual';

const backendCustomerType = (value) =>
  normalizeCustomerType(value) === 'Business / Company' ? 'business' : 'individual';

export const CustomerList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get('q') || '').slice(0, 120);
  const statusFilter = searchParams.get('status') || 'All';
  const branchFilter = searchParams.get('branch') || 'All';
  const typeFilter = searchParams.get('type') || 'All';
  const updateFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All') next.delete(name);
    else next.set(name, value);
    next.delete('page');
    setSearchParams(next, { replace: name === 'q' });
  };
  const setSearch = (value) => updateFilter('q', value);
  const setStatusFilter = (value) => updateFilter('status', value);
  const setBranchFilter = (value) => updateFilter('branch', value);
  const setTypeFilter = (value) => updateFilter('type', value);
  const resetFilters = () => setSearchParams(new URLSearchParams());


  // Core Data State
  const [customers, setCustomers] = useState([]);
  const [branchChoices, setBranchChoices] = useState([]);
  const [branchLoadError, setBranchLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Add / Edit Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Kochi');
  const [state, setState] = useState('Kerala');
  const [pincode, setPincode] = useState('');
  const [customerType, setCustomerType] = useState('Individual');
  const [companyName, setCompanyName] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [branch, setBranch] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicate Check Modal State
  const [duplicateFound, setDuplicateFound] = useState(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Actions Popover / Menu State
  const [activeMenuCustomer, setActiveMenuCustomer] = useState(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState('');

  // Load the directory once; filtering is local and never refetches all linked jobs on each keystroke.
  useEffect(() => {
    fetchCustomers();
    let active = true;
    customerService.getCustomerBranches()
      .then((rows) => { if (active) setBranchChoices(rows); })
      .catch((error) => {
        if (active) setBranchLoadError(error?.message || 'Unable to load workshop branches.');
      });
    return () => { active = false; };
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.getCustomers();
      const data = Array.isArray(response) ? response : (response?.results || []);

      let partialErrors = 0;
      const enriched = await Promise.all(data.map(async (customer) => {
        // Optional vehicle/job permissions or endpoint errors should never hide
        // the entire customer directory or misrepresent unpaid invoice amounts as zero.
        const [vehicleResult, jobResult, invoiceResult] = await Promise.allSettled([
          customerService.getCustomerVehicles(customer.id),
          customerService.getCustomerJobs(customer.id),
          customerService.getCustomerInvoices(customer.id),
        ]);
        const rows = (result) => {
          if (result.status !== 'fulfilled') return [];
          return Array.isArray(result.value) ? result.value
            : (Array.isArray(result.value?.results) ? result.value.results : []);
        };
        const vehicles = rows(vehicleResult);
        const jobs = rows(jobResult);
        let money = { totalSpent: null, outstanding: null, moneyAvailable: false };
        if (invoiceResult.status === 'fulfilled') {
          try {
            const invoiceRows = Array.isArray(invoiceResult.value)
              ? invoiceResult.value : invoiceResult.value?.results;
            money = customerInvoiceMoney(invoiceRows);
          } catch {
            partialErrors += 1;
          }
        } else {
          partialErrors += 1;
        }
        if (vehicleResult.status === 'rejected' || jobResult.status === 'rejected') {
          partialErrors += 1;
        }

        return {
          ...customer,
          status: customerStatusLabel(customer.status),
          customerType: customer.customerType || customer.customer_type || 'Individual',
          vehicleCount: vehicles.length,
          jobsCount: jobs.length,
          ...money,
          __vehicles: vehicles,
          __jobs: jobs,
        };
      }));

      setCustomers(enriched);
      setLoadError(partialErrors
        ? 'Some linked customer records could not load. Missing invoice balances are shown as — instead of ₹0. Please check permissions or retry.'
        : '');
    } catch (e) {
      console.error(e);
      setLoadError(e?.message || 'Could not load customers. Check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const availableBranches = useMemo(() => [...new Set(
    branchChoices.map((item) => item.name).filter(Boolean)
  )].sort(), [branchChoices]);
  const availableTypes = useMemo(() => [...new Set(
    customers.map((item) => normalizeCustomerType(item.customerType)).filter(Boolean)
  )].sort(), [customers]);
  const availableStatuses = useMemo(() => [...new Set(
    customers.map((item) => item.status).filter(Boolean)
  )].sort(), [customers]);
  const visibleCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (statusFilter !== 'All' && (customer.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (branchFilter !== 'All' && String(customer.branchName || '') !== branchFilter) return false;
      if (typeFilter !== 'All' && normalizeCustomerType(customer.customerType).toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (!q) return true;
      return [customer.name, customer.email, customer.phone, customer.whatsapp, customer.companyName]
        .some((value) => String(value || '').toLowerCase().includes(q)) ||
        customer.__vehicles?.some((vehicle) =>
          [vehicle.regNo, vehicle.vin].some((value) => String(value || '').toLowerCase().includes(q))) ||
        customer.__jobs?.some((job) =>
          [job.jobNumber, job.id, job.vehicleReg].some((value) => String(value || '').toLowerCase().includes(q)));
    });
  }, [customers, search, statusFilter, branchFilter, typeFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const openCustomer = (customer) => navigate(`/customers/${customer.id}`);
  const isInteractiveTarget = (target) => target?.closest('a, button, input, select, textarea, [role="button"]');
  const handleCustomerClick = (event, customer) => {
    if (isInteractiveTarget(event.target)) return;
    openCustomer(customer);
  };
  const handleCustomerKeyDown = (event, customer) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCustomer(customer);
    }
  };

  const openAddModal = () => {
    setEditingCustomerId(null);
    resetForm();
    setIsAddCustomerOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomerId(c.id);
    setName(c.name || '');
    setPhone(c.phone || '');
    setWhatsapp(c.whatsapp || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCity(c.city || 'Kochi');
    setState(c.state || 'Kerala');
    setPincode(c.pincode || '');
    setCustomerType(normalizeCustomerType(c.customerType));
    setCompanyName(c.companyName || '');
    setGstNo(c.gstNo || '');
    setBranch(c.branchId || c.branch || '');
    setNotes(c.notes || '');
    setIsAddCustomerOpen(true);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setCity('Kochi');
    setState('Kerala');
    setPincode('');
    setCustomerType('Individual');
    setCompanyName('');
    setGstNo('');
    setBranch('');
    setNotes('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name,
      phone,
      whatsapp: whatsapp || phone,
      email,
      address,
      city,
      state,
      pincode,
      customerType: backendCustomerType(customerType),
      companyName,
      gstNo,
      ...(branch ? { branch } : {}),
      notes
    };

    // If creating a new customer, perform duplicate check first
    if (!editingCustomerId) {
      const match = await customerService.checkDuplicateCustomer(payload);
      if (match) {
        setDuplicateFound(match);
        setIsDuplicateModalOpen(true);
        return;
      }
    }

    await saveCustomer(payload);
  };

  const saveCustomer = async (payload) => {
    if (editingCustomerId) {
      await customerService.updateCustomer(editingCustomerId, payload);
      showToast('Customer information updated.');
    } else {
      await customerService.createCustomer(payload);
      showToast('New customer created successfully.');
    }
    setIsAddCustomerOpen(false);
    setIsDuplicateModalOpen(false);
    resetForm();
    fetchCustomers();
  };

  const handleArchive = async (id) => {
    if (await appConfirm('Archive this customer profile? Customer record will remain in job history.')) {
      await customerService.archiveCustomer(id);
      showToast('Customer archived.');
      fetchCustomers();
    }
  };


  return (
    <div className="customer-directory-page cg-customers" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', paddingBottom: '70px' }}>
      
      {/* Toast Banner */}
      {toastMsg && (
        <div style={{ backgroundColor: 'var(--success)', color: '#ffffff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' }}>
          {toastMsg}
        </div>
      )}

      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Customers</h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Manage workshop customers, vehicles and service history.</p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            height: '42px',
            padding: '0 18px',
            borderRadius: '11px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: 'auto'
          }}
          className="mobile-full-width-btn"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {loadError && <div role="alert" className="customer-directory-error">{loadError} <button type="button" onClick={fetchCustomers}>Retry</button></div>}

      {/* SEARCH + FILTERS TOOLBAR */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, WhatsApp, email or vehicle..."
            />
          </div>
          
          {/* Desktop Filter Dropdowns */}
          <div className="desktop-filters-row" style={{ display: 'flex', gap: '8px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              containerStyle={{ width: '130px', marginBottom: 0 }}
            >
              <option value="All">All Status</option>
              {availableStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              containerStyle={{ width: '140px', marginBottom: 0 }}
            >
              <option value="All">All Types</option>
              {availableTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </div>

          {/* Mobile Filter Button */}
          <button
            className="mobile-filter-trigger"
            onClick={() => setIsFilterSheetOpen(true)}
            style={{ height: '44px', padding: '0 14px', borderRadius: '11px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      {/* CUSTOMER LIST: DESKTOP TABLE & MOBILE CARDS */}
      <div className="customer-directory-list-heading">
        <div><h2>All Customers</h2><p>{visibleCustomers.length} of {customers.length} customers shown</p></div>
        <button type="button" onClick={resetFilters} aria-label="Reset customer filters">Reset Filters</button>
      </div>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customers directory...</div>
      ) : visibleCustomers.length === 0 ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Users size={36} style={{ color: 'var(--text-muted)' }} />
          <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>No matching customers found.</strong>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>Try clearing filters or add a new customer.</p>
          <button onClick={openAddModal} style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', marginTop: '6px' }}>
            + Add First Customer
          </button>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="desktop-customers-table" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>
                  <th style={{ padding: '12px 14px' }}>Customer</th>
                  <th style={{ padding: '12px 14px' }}>Phone / WhatsApp</th>
                  <th style={{ padding: '12px 14px' }}>Customer Type</th>
                  <th style={{ padding: '12px 14px' }}>Vehicles</th>
                  <th style={{ padding: '12px 14px' }}>Last Visit</th>
                  <th style={{ padding: '12px 14px' }}>Outstanding</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((c) => (
                  <tr key={c.id} className="customer-directory-row" tabIndex={0} aria-label={`Open ${c.name} profile`}
                    onClick={(event) => handleCustomerClick(event, c)}
                    onKeyDown={(event) => handleCustomerKeyDown(event, c)}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{c.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email || c.phone || 'Customer'}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="customer-directory-phone">{c.phone || 'No phone number'}</div>
                      <CustomerContactActions customer={c} compact />
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{c.customerType || 'Individual'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{c.vehicleCount || 0} Vehicles</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{c.lastVisit || '—'}</td>
                    <td title={!c.moneyAvailable ? 'Invoice balance unavailable' : undefined}
                      style={{ padding: '12px 14px', fontWeight: '700', color: c.outstanding === null ? 'var(--text-muted)' : c.outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      {formatCustomerMoney(c.outstanding)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: c.status === 'Active' ? 'var(--success-soft)' : 'var(--surface-2)', color: c.status === 'Active' ? 'var(--success)' : 'var(--text-muted)' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={(event) => { event.stopPropagation(); openCustomer(c); }}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--primary)', fontWeight: '600', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}
                      >
                        View
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); openEditModal(c); }}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', cursor: 'pointer' }}
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="mobile-customers-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleCustomers.map((c) => (
              <div key={c.id} tabIndex={0} role="link" className="customer-directory-card"
                aria-label={`Open ${c.name} profile`}
                onClick={(event) => handleCustomerClick(event, c)}
                onKeyDown={(event) => handleCustomerKeyDown(event, c)}
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{c.name}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.phone || 'No phone number'}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: c.status === 'Active' ? 'var(--success-soft)' : 'var(--surface-2)', color: c.status === 'Active' ? 'var(--success)' : 'var(--text-muted)' }}>
                    {c.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--surface-2)', padding: '10px', borderRadius: '10px', fontSize: '12px' }}>
                  <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Vehicles & Jobs</span><strong>{c.vehicleCount || 0} Vehicles • {c.jobsCount || 0} Jobs</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Last Visit</span><strong>{c.lastVisit || '—'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Customer Type</span><strong>{c.customerType || 'Individual'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Outstanding</span><strong title={!c.moneyAvailable ? 'Invoice balance unavailable' : undefined}
                    style={{ color: c.outstanding === null ? 'var(--text-muted)' : c.outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>{formatCustomerMoney(c.outstanding)}</strong></div>
                </div>

                <CustomerContactActions customer={c} />
                <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                  <button
                    onClick={(event) => { event.stopPropagation(); openCustomer(c); }}
                    style={{ flex: 1, height: '38px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    View Customer <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={(event) => { event.stopPropagation(); openEditModal(c); }}
                    style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL / SHEET: ADD OR EDIT CUSTOMER */}
      <ResponsiveModalSheet
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title={editingCustomerId ? "Edit Customer Details" : "Add Workshop Customer"}
        maxWidth="540px"
      >
        <form className="customer-directory-form" onSubmit={handleFormSubmit}>
          
          <Input
            label="Customer Name"
            required
            icon={Users}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Kumar"
          />

          <div className="customer-directory-form-grid">
            <Input
              label="Phone Number"
              type="tel"
              inputMode="tel"
              required
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
            />
            <Input
              label="WhatsApp Number"
              type="tel"
              inputMode="tel"
              icon={MessageSquare}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="98765 43210"
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul.k@example.com"
          />

          {branchLoadError && <p role="alert" className="customer-directory-error">{branchLoadError}</p>}
          <div className="customer-directory-form-grid">
            <Select
              label="Customer Type"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              <option value="Individual">Individual</option>
              <option value="Business / Company">Business / Company</option>
            </Select>

            <Select
              label="Assigned Branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">Automatic branch assignment</option>
              {branchChoices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>

          {customerType === 'Business / Company' && (
            <div className="customer-directory-form-grid">
              <Input
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Logistics Ltd"
              />
              <Input
                label="GST Number"
                value={gstNo}
                onChange={(e) => setGstNo(e.target.value)}
                placeholder="32AAAAA0000A1Z5"
              />
            </div>
          )}

          <Textarea
            label="Address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, building details..."
          />

          <div className="customer-directory-location-grid">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
            <Input label="PIN Code" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="682031" />
          </div>

          <Textarea
            label="Customer Notes & Preferences"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Call before replacing additional parts..."
          />

          <div className="customer-directory-form-actions">
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(false)}
              className="customer-directory-form-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="customer-directory-form-submit"
            >
              {editingCustomerId ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </ResponsiveModalSheet>

      {/* MODAL: DUPLICATE WARNING */}
      <ResponsiveModalSheet
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Possible Existing Customer Found"
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ backgroundColor: 'var(--warning-soft)', padding: '12px', borderRadius: '10px', border: '1px solid var(--warning-soft)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
              A customer with matching phone or email already exists in your database.
            </span>
          </div>

          {duplicateFound && (
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{duplicateFound.name}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{duplicateFound.phone} • {duplicateFound.email}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setIsDuplicateModalOpen(false);
                setIsAddCustomerOpen(false);
                navigate(`/customers/${duplicateFound?.id}`);
              }}
              style={{ flex: 1, height: '44px', borderRadius: '11px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--primary)', fontWeight: '700' }}
            >
              View Existing
            </button>
            <button
              type="button"
              onClick={() => {
                const payload = { name, phone, whatsapp: whatsapp || phone, email, address, city, state, pincode, customerType: backendCustomerType(customerType), companyName, gstNo, ...(branch ? { branch } : {}), notes };
                saveCustomer(payload);
              }}
              style={{ flex: 1, height: '44px', borderRadius: '11px', border: 'none', backgroundColor: 'var(--primary)', color: '#ffffff', fontWeight: '700' }}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </ResponsiveModalSheet>

      {/* BOTTOM SHEET: MOBILE FILTERS */}
      <ResponsiveModalSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Customers"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Select
            label="Customer Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Archived">Archived</option>
          </Select>

          <Select
            label="Customer Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            {availableTypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>

          <Select
            label="Branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="All">All Branches</option>
            {availableBranches.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>

          <button
            onClick={() => setIsFilterSheetOpen(false)}
            style={{ height: '44px', borderRadius: '11px', border: 'none', backgroundColor: 'var(--primary)', color: '#ffffff', fontWeight: '700', marginTop: '6px' }}
          >
            Apply Filters
          </button>
        </div>
      </ResponsiveModalSheet>

      <style>{`
        @media (max-width: 767px) {
          .mobile-full-width-btn {
            width: 100% !important;
          }
          .desktop-filters-row {
            display: none !important;
          }
          .desktop-customers-table {
            display: none !important;
          }
          .mobile-customers-cards {
            display: flex !important;
          }
          .mobile-filter-trigger {
            display: flex !important;
          }
        }
        @media (min-width: 768px) {
          .mobile-customers-cards {
            display: none !important;
          }
          .mobile-filter-trigger {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
