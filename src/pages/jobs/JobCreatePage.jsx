import { appAlert } from '../../components/common/appDialogs';
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, History, Eye, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../../services/job.service';
import { vehiclePhotoService } from '../../services/vehiclePhoto.service';
import { VehicleCameraQueue } from '../../components/vehicles/VehicleCameraQueue';
import { staffService } from '../../services/staff.service';
import { payrollService } from '../../services/payroll.service';
import { JobBreadcrumbs } from '../../components/jobs/JobBreadcrumbs';
import { JobCustomerPicker } from '../../components/jobs/JobCustomerPicker';
import { customerService } from '../../services/customer.service';
import { branchService } from '../../services/branch.service';
import { JobComplaintEntries } from '../../components/jobs/JobComplaintEntries';
import { JobCardReview } from '../../components/jobs/JobCardReview';
import { JOB_COUNTRY_CODES, splitInternationalPhone, joinInternationalPhone, validInternationalPhone, splitVehicleMakeModel, newComplaint, buildJobComplaints } from '../../utils/jobCreateAdapters';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import '../../styles/job-create-professional.css';
import { showFormFieldError, showServerFormErrors } from '../../utils/formValidation';

const nowLocal = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export const JobCreatePage = () => {
  const navigate = useNavigate();
  const { can } = useFeatureAccess();
  const maySelectBranch = can('company.manage') || can('branches.manage');
  const formRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [createdJob, setCreatedJob] = useState(null);
  const [review, setReview] = useState(false);
  const [jobMode, setJobMode] = useState('simple');
  const [complaints, setComplaints] = useState(() => [newComplaint()]);
  const [complaintErrors, setComplaintErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [savedJobId, setSavedJobId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [staff, setStaff] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [form, setForm] = useState({
    jobDateTime: nowLocal(),
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    vehicleReg: '',
    vehicleInfo: '',
    vehicleMake: '',
    vehicleModel: '',
    fuelType: '',
    vehicleDetailsUpdate: false,
    vin: '',
    kilometre: '',
    fuelLevel: '50%',
    serviceType: 'General Service',
    complaint: '',
    assignedEmployeeId: '',
    assignedEmployeeName: '',
    serviceAdvisor: '',
    priority: 'Medium',
    status: 'New',
    branch: '',
    branchId: '',
    serviceAdvisorEmployeeId: '',
    notes: ''
  });

  const chooseCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSelectedVehicleId('');
    setCustomerVehicles([]);
    setHistory([]);
    setError('');
    setForm((old) => ({
      ...old,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || '',
      customerAddress: customer?.address || '',
      vehicleReg: '', vehicleInfo: '', vehicleMake: '', vehicleModel: '',
      fuelType: '', vin: '', kilometre: '', vehicleDetailsUpdate: false
    }));
  };

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerVehicles([]);
      setSelectedVehicleId('');
      return;
    }
    let active = true;
    setVehiclesLoading(true);
    customerService.getCustomerVehicles(selectedCustomer.id)
      .then((response) => {
        if (!active) return;
        const vehicles = Array.isArray(response) ? response : response?.results || [];
        setCustomerVehicles(vehicles);
      })
      .catch(() => {
        if (active) {
          setCustomerVehicles([]);
          setError('Customer selected, but vehicle list could not be loaded. You can enter registration manually.');
        }
      })
      .finally(() => { if (active) setVehiclesLoading(false); });
    return () => { active = false; };
  }, [selectedCustomer?.id]);

  const chooseVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    const found = customerVehicles.find((item) => String(item.id) === String(vehicleId));
    if (!found) {
      setForm((old) => ({ ...old, vehicleReg: '', vehicleInfo: '', vehicleMake: '',
        vehicleModel: '', fuelType: '', vin: '', kilometre: '', vehicleDetailsUpdate: false }));
      return;
    }
    const names = splitVehicleMakeModel(found);
    setForm((old) => ({
      ...old,
      vehicleReg: (found.regNo || found.registration || found.licensePlate || '').toUpperCase(),
      vehicleMake: names.make,
      vehicleModel: names.model,
      vehicleInfo: [names.make, names.model].filter(Boolean).join(' '),
      fuelType: found.fuelType || found.fuel_type || '',
      fuelLevel: found.fuelLevel || old.fuelLevel,
      vin: found.vin || '',
      kilometre: String(found.kilometres ?? found.odometer ?? ''),
      vehicleDetailsUpdate: false
    }));
  };

  useEffect(() => {
    if (!maySelectBranch) return undefined;
    let mounted = true;
    branchService.getBranches()
      .then((rows) => { if (mounted) setBranches((Array.isArray(rows) ? rows : rows?.results || [])
        .filter((item) => item.is_active !== false)); })
      .catch(() => { if (mounted) setBranches([]); });
    return () => { mounted = false; };
  }, [maySelectBranch]);

  useEffect(() => {
    let mounted = true;
    staffService.getStaff()
      .then((data) => {
        if (mounted) setStaff((Array.isArray(data) ? data : data?.results || []).filter((item) => item.employmentStatus === 'Active'));
      })
      .catch(() => { if (mounted) setStaff([]); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (form.vehicleReg.trim().length < 5) {
        setHistory([]);
        return;
      }

      setHistoryLoading(true);
      try {
        const rows = await jobService.getVehicleHistory(form.vehicleReg);
        const matched = selectedCustomer?.id
          ? rows.filter((row) => String(row.customerId || '') === String(selectedCustomer.id))
          : rows;
        setHistory(matched);

        if (matched.length) {
          const latest = matched[0];
          setForm((old) => ({
            ...old,
            customerName: selectedCustomer ? old.customerName : old.customerName || latest.customerName || '',
            customerPhone: selectedCustomer ? old.customerPhone : old.customerPhone || latest.customerPhone || '',
            customerEmail: selectedCustomer ? old.customerEmail : old.customerEmail || latest.customerEmail || '',
            vehicleInfo: old.vehicleInfo || latest.vehicleInfo || '',
            vehicleMake: old.vehicleMake || splitVehicleMakeModel(latest).make,
            vehicleModel: old.vehicleModel || splitVehicleMakeModel(latest).model,
            fuelType: old.fuelType || latest.fuelType || latest.vehicle?.fuelType || '',
            kilometre: old.kilometre || String(latest.kilometre || latest.odometer || ''),
            vin: old.vin || latest.vin || latest.vehicle?.vin || ''
          }));
        }
      } catch (historyError) {
        console.error('Vehicle history lookup unavailable', historyError);
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.vehicleReg, selectedCustomer?.id]);

  const set = (key, value) => {
    setError('');
    setReview(false);
    if (key === 'vehicleMake' || key === 'vehicleModel') {
      setForm((old) => {
        const next = { ...old, [key]: value };
        next.vehicleInfo = [next.vehicleMake, next.vehicleModel].filter(Boolean).join(' ');
        return next;
      });
      return;
    }
    if (key === 'vehicleReg') {
      const normalized = (number) => String(number || '').replace(/\s+/g, '').toUpperCase();
      const matched = customerVehicles.find((vehicle) =>
        normalized(vehicle.regNo || vehicle.registration || vehicle.licensePlate) === normalized(value)
      );
      setSelectedVehicleId(matched?.id || '');
      setForm((old) => {
        const names = matched ? splitVehicleMakeModel(matched) : null;
        return {
          ...old, vehicleReg: value,
          vehicleInfo: matched ? [names.make, names.model].filter(Boolean).join(' ') : old.vehicleInfo,
          vehicleMake: matched ? names.make : old.vehicleMake,
          vehicleModel: matched ? names.model : old.vehicleModel,
          fuelType: matched ? matched.fuelType || matched.fuel_type || '' : old.fuelType,
          kilometre: matched ? String(matched.kilometres ?? matched.odometer ?? '') : old.kilometre,
          vin: matched ? matched.vin || '' : old.vin,
          vehicleDetailsUpdate: false,
        };
      });
      return;
    }
    setForm((old) => ({ ...old, [key]: value }));
  };

  const assignStaff = (id) => {
    const selected = staff.find((item) => item.id === id);
    setForm((old) => ({
      ...old,
      assignedEmployeeId: id,
      assignedEmployeeName: selected?.name || ''
    }));
  };

  const validateBeforeReview = () => {
    const required = [
      ['jobDateTime', form.jobDateTime?.trim(), 'Select the Job Card date and time.'],
      ['customerName', form.customerName.trim(), 'Enter the customer name.'],
      ['customerPhone', validInternationalPhone(form.customerPhone), 'Enter a valid international phone number with country code.'],
      ['vehicleReg', form.vehicleReg.trim(), 'Enter the registration number.'],
    ];
    const missing = required.find(([, value]) => !value);
    if (missing) {
      const shownInline = showFormFieldError(formRef.current, missing[0], missing[2]);
      setError(shownInline ? '' : missing[2]);
      return false;
    }
    if (form.kilometre && (!/^\d+$/.test(form.kilometre) || Number(form.kilometre) > 999999999)) {
      showFormFieldError(formRef.current, 'kilometre', 'Enter a valid non-negative KM reading.');
      return false;
    }
    const errors = Object.fromEntries(complaints.filter((item) => !item.description.trim())
      .map((item) => [item.id, 'Enter this complaint or remove the empty row.']));
    setComplaintErrors(errors);
    if (Object.keys(errors).length) {
      const first = complaints.findIndex((item) => errors[item.id]);
      showFormFieldError(formRef.current, 'complaint-' + first, errors[complaints[first].id]);
      return false;
    }
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!savedJobId && !validateBeforeReview()) return;
    if (!review && !savedJobId) {
      setReview(true);
      setError('');
      window.requestAnimationFrame(() => formRef.current?.querySelector('#job-card-review')?.scrollIntoView({
        behavior: 'smooth', block: 'start'
      }));
      return;
    }

    setSaving(true);
    setError('');
    let createdId = savedJobId;
    try {
      const normalizedComplaints = buildJobComplaints(complaints);
      const created = createdId ? { id: createdId, ...(createdJob || {}) } : await jobService.createJob({
        ...form,
        ...(selectedCustomer?.id ? { customer: selectedCustomer.id } : {}),
        checkInTime: form.jobDateTime,
        vehicleInfo: [form.vehicleMake, form.vehicleModel].filter(Boolean).join(' '),
        customerComplaints: normalizedComplaints,
        complaints: normalizedComplaints,
        vehicle: selectedVehicleId || {
          registration: form.vehicleReg,
          make: form.vehicleMake,
          model: form.vehicleModel,
          fuelType: form.fuelType,
          makeModel: [form.vehicleMake, form.vehicleModel].filter(Boolean).join(' '),
          vin: form.vin,
        },
        services: [],
        partsUsed: [],
        outsidePurchases: [],
        labourRecords: [],
        estimates: [],
        workUpdates: [],
        photos: [],
        additionalApprovals: [],
        billing: { advancePaid: 0, paidAmount: 0, outstandingBalance: 0 }
      });

      if (!created?.id) throw new Error('Job Card could not be saved.');
      createdId = created.id;
      setSavedJobId(created.id);
      setCreatedJob(created);
      if (!savedJobId && form.assignedEmployeeId) {
        try {
          await payrollService.createJobTimerAssignment(created.id, form.assignedEmployeeId);
        } catch (assignmentError) {
          console.warn('Job created; worker assignment needs confirmation.', assignmentError);
          appAlert('Job Card created. Please verify worker assignment in Work & Labour.');
        }
      }

      for (let i = 0; i < pendingPhotos.length; i += 1) {
        const photo = pendingPhotos[i];
        setUploadProgress(i + 1);
        await vehiclePhotoService.upload({ jobId: created.id, ...photo });
        setPendingPhotos((items) => items.filter((entry) => entry.id !== photo.id));
      }
      setUploadProgress(0);
      setReview(true);
    } catch (err) {
      const shownInline = createdId ? false : showServerFormErrors(formRef.current, err, {
        customer_name: 'customerName', customer_phone: 'customerPhone',
        registration: 'vehicleReg', vehicle_registration: 'vehicleReg',
        fuelType: 'fuelType', vehicleInfo: 'vehicleMake', branchId: 'branchId',
        kilometre: 'kilometre', serviceAdvisorEmployeeId: 'serviceAdvisorEmployeeId',
        assignedEmployeeId: 'assignedEmployeeId',
      });
      const message = createdId
        ? 'Job Card was saved, but some photos could not be uploaded. Retry remaining photos; no duplicate Job Card will be created.'
        : err?.message || 'Unable to create Job Card.';
      setError(shownInline ? '' : message);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const inputClass = 'mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm font-normal text-content outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10';
  const labelClass = 'text-xs font-semibold text-secondary';

  return (
    <div className="job-management-page job-create-page flex w-full min-w-0 flex-col gap-4">
      <JobBreadcrumbs current="New Job Card" />
      <header className="job-create-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Create Job Card</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Add customer and vehicle details, then create a Job Card to start inspection.</p>
          <div className="job-create-steps" aria-label="Job setup steps">
            <span><b>01</b> Customer</span><span><b>02</b> Vehicle</span><span><b>03</b> Assignment</span>
          </div>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-600">{error}</div> : null}

      <form ref={formRef} onSubmit={submit} className="job-create-form flex flex-col gap-4">
        <section className="job-create-section rounded-2xl border border-line bg-surface p-4 md:p-5">
          <div className="job-create-section-heading">
            <div>
              <h2 className="text-base font-extrabold text-content"><span className="job-create-title-step">01</span> Customer & Job Details</h2>
              <p>Select an existing customer or add a new one. Contact details fill automatically.</p>
            </div>
          </div>
          <JobCustomerPicker selectedCustomer={selectedCustomer} onSelect={chooseCustomer}
            disabled={saving} />
          <div className="job-create-fields-grid mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>Date / Time *
              <input name="jobDateTime" type="datetime-local" required value={form.jobDateTime} onChange={(e) => set('jobDateTime', e.target.value)} className={inputClass}/>
            </label>
            <label className={labelClass}>Customer Name *
              <input name="customerName" required readOnly={Boolean(selectedCustomer)} autoComplete="name" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Customer name" className={inputClass}/>
            </label>
            <label className={labelClass}>Phone *
              <input name="customerPhone" required readOnly={Boolean(selectedCustomer)} type="tel" autoComplete="tel" inputMode="tel" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+91..." className={inputClass}/>
            </label>
            <label className={labelClass}>Email
              <input name="customerEmail" readOnly={Boolean(selectedCustomer)} type="email" autoComplete="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} placeholder="Optional" className={inputClass}/>
            </label>
            <label className={labelClass}>Customer Address
              <input name="customerAddress" readOnly={Boolean(selectedCustomer)} value={form.customerAddress}
                onChange={(e) => set('customerAddress', e.target.value)} placeholder="Optional" className={inputClass}/>
            </label>
            <label className={labelClass}>Branch
              <select value={form.branch} onChange={(e) => set('branch', e.target.value)} className={inputClass}>
                <option>Main Garage Branch</option><option>Kochi South Branch</option>
              </select>
            </label>
            <label className={labelClass}>Service Type
              <select value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)} className={inputClass}>
                {['General Service','Running Repair','Breakdown','Insurance Repair','Body Shop','AC Service','Electrical','Engine Work','Periodic Maintenance'].map((item)=><option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="job-create-section rounded-2xl border border-line bg-surface p-4 md:p-5">
          <div className="job-create-section-heading">
            <div>
              <h2 className="text-base font-extrabold text-content"><span className="job-create-title-step">02</span> Vehicle Details</h2>
              <p>Choose a saved vehicle or enter registration and vehicle information.</p>
            </div>
          </div>

          {selectedCustomer && (
            <div className="job-customer-vehicles">
              <label className={labelClass} htmlFor="job-new-vehicle-select">Select Customer Vehicle</label>
              <select id="job-new-vehicle-select" value={selectedVehicleId} disabled={vehiclesLoading || saving}
                className={inputClass} onChange={(event) => chooseVehicle(event.target.value)}>
                <option value="">{vehiclesLoading ? 'Loading vehicles…' : 'New vehicle / Enter registration below'}</option>
                {customerVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.regNo || vehicle.registration || vehicle.licensePlate} — {vehicle.makeModel || [vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
              <p>{customerVehicles.length ? customerVehicles.length + ' vehicle(s) linked to this customer.' : 'No saved vehicles. Enter a new registration below.'}</p>
            </div>
          )}
          <div className="job-create-fields-grid mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>Registration Number *
              <input name="vehicleReg" required autoCapitalize="characters" autoComplete="off" value={form.vehicleReg} onChange={(e) => set('vehicleReg', e.target.value.toUpperCase())} placeholder="KL 07 AB 1234" className={inputClass}/>
            </label>
            <label className={labelClass}>Make / Model
              <input value={form.vehicleInfo} onChange={(e) => set('vehicleInfo', e.target.value)} placeholder="Toyota Innova 2.5V" className={inputClass}/>
            </label>
            <label className={labelClass}>VIN / Chassis
              <input value={form.vin} onChange={(e) => set('vin', e.target.value.toUpperCase())} placeholder="VIN / chassis number" className={inputClass}/>
            </label>
            <label className={labelClass}>KM Reading
              <input inputMode="numeric" value={form.kilometre} onChange={(e) => set('kilometre', e.target.value.replace(/[^0-9]/g,''))} placeholder="52400" className={inputClass}/>
            </label>
            <label className={labelClass}>Fuel Level
              <select value={form.fuelLevel} onChange={(e) => set('fuelLevel', e.target.value)} className={inputClass}>
                {['Empty','10%','25%','50%','75%','Full'].map((item)=><option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {historyLoading ? <div className="mt-3 text-xs text-muted">Checking vehicle history…</div> : history.length ? (
            <div className="job-create-history mt-4 rounded-xl border border-primary/20 bg-primary-soft p-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-primary"><History size={15}/>{history.length} previous job card{history.length > 1 ? 's' : ''} found</div>
              <div className="mt-2 text-[11px] text-secondary">
                Last visit: <strong className="text-content">{history[0].createdDate}</strong> · {history[0].status} · {history[0].customerName}
              </div>
            </div>
          ) : null}
        </section>

        <section className="job-create-section rounded-2xl border border-line bg-surface p-4 md:p-5">
          <div className="job-create-section-heading">
            <div>
              <h2 className="text-base font-extrabold text-content"><span className="job-create-title-step">03</span> Complaint & Assignment</h2>
              <p>Describe the issue and optionally assign workshop staff.</p>
            </div>
          </div>
          <div className="job-create-fields-grid job-create-assignment-grid mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className={labelClass + ' md:col-span-2'}>Customer Complaint
              <textarea rows={4} value={form.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Record the customer's words separately..." className="mt-1 min-h-28 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm text-content outline-none focus:border-primary"/>
            </label>
            <label className={labelClass}>Assigned Technician
              <select value={form.assignedEmployeeId} onChange={(e) => assignStaff(e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {staff.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.designation}</option>)}
              </select>
            </label>
            <label className={labelClass}>Service Advisor
              <select value={form.serviceAdvisor} onChange={(e) => set('serviceAdvisor', e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {staff.map((item)=><option key={item.id} value={item.name}>{item.name} · {item.designation}</option>)}
              </select>
            </label>
            <label className={labelClass}>Priority
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className={inputClass}>
                <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
              </select>
            </label>
            <label className={labelClass}>Initial Status
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
                <option>New</option><option>Inspection</option>
              </select>
            </label>
            <label className={labelClass + ' md:col-span-2'}>Internal Notes
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm text-content outline-none focus:border-primary"/>
            </label>
          </div>
        </section>

        <section className="job-create-section rounded-2xl border border-line bg-surface p-4 md:p-5">
          <VehicleCameraQueue photos={pendingPhotos} onChange={setPendingPhotos} disabled={saving} uploading={uploadProgress}/>
        </section>

        <div className="job-create-actions sticky bottom-0 z-20 flex gap-2 border-t border-line bg-surface/95 p-3 backdrop-blur md:static md:justify-end md:border-0 md:bg-transparent md:p-0" aria-label="Job Card form actions">
          <button type="button" className="h-11 flex-1 rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-content md:flex-none" onClick={() => navigate('/jobs')}>Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-0 bg-primary px-5 text-sm font-bold text-white md:flex-none">
            <CheckCircle2 size={17}/>{saving ? 'Creating…' : 'Create Job Card'}
          </button>
        </div>
      </form>
    </div>
  );
};
