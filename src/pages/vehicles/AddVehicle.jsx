import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormPage } from '../../components/common/forms/FormPage';
import { FormSection } from '../../components/common/forms/FormSection';
import { StickyFormFooter } from '../../components/common/forms/StickyFormFooter';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { SearchableSelect } from '../../components/common/forms/SearchableSelect';
import { FileUpload } from '../../components/common/forms/FileUpload';
import { customerService } from '../../services/customer.service';
import { vehicleService } from '../../services/vehicle.service';
import { vehiclePhotoService } from '../../services/vehiclePhoto.service';
import { VehicleCameraQueue } from '../../components/vehicles/VehicleCameraQueue';
import { Car, Calendar, Gauge, ShieldCheck, CheckCircle2 } from 'lucide-react';
import '../../styles/vehicle-management.css';

export const AddVehicle = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustId = searchParams.get('customerId') || '';

  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [savedVehicleId, setSavedVehicleId] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(0);

  const [formData, setFormData] = useState({
    customerId: preselectedCustId || 'CUS-0001',
    regNo: '',
    make: 'Toyota',
    model: 'Innova 2.5V',
    variant: '2.5V VX',
    year: '2021',
    fuelType: 'Diesel',
    transmission: 'Manual',
    color: 'Pearl White',
    odometer: '1,24,500 km',
    vin: '',
    engineNo: '',
    lastServiceDate: '2026-09-14',
    nextServiceDue: '2027-03-14',
    insuranceExpiry: '2027-08-30',
    notes: ''
  });

  useEffect(() => {
    customerService.getCustomers().then(setCustomers);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      let vehicleId = savedVehicleId;
      if (!vehicleId) {
        const selectedCustomer = customers.find((customer) => customer.id === formData.customerId);
        const payload = {
          ...formData,
          customerName: selectedCustomer?.name || '',
        };
        const created = await vehicleService.createVehicle(payload);
        vehicleId = created?.id;
        if (!vehicleId) throw new Error('Vehicle was saved but no vehicle reference was returned.');
        setSavedVehicleId(vehicleId);
      }

      // Do not discard captured files on validation or network failures.
      // Subsequent Save clicks resume uploads without creating duplicate vehicles.
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        setUploadingPhoto(i + 1);
        await vehiclePhotoService.upload({ vehicleId, ...photo });
        setPhotos((items) => items.filter((entry) => entry.id !== photo.id));
      }
      setUploadingPhoto(0);
      setToastMsg('Vehicle and inspection photos saved.');
      navigate(`/vehicles/${vehicleId}`);
    } catch (cause) {
      setError(cause?.message || 'Unable to save vehicle or photos. Retry to continue without duplication.');
    } finally {
      setUploadingPhoto(0);
      setSubmitting(false);
    }
  };

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name} (${c.phone}) - ID: ${c.id}`
  }));

  return (
    <div className="vehicle-form-page cg-vehicles">
    <FormPage
      title="Add Vehicle"
      description="Register a new customer vehicle for workshop service and job card creation."
    >
      {error && <div role="alert" className="vehicle-dashboard-error">{error} {savedVehicleId && 'The vehicle was saved; retry to upload remaining photos.'}</div>}
      {toastMsg && (
        <div style={{ backgroundColor: 'var(--success)', color: '#ffffff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      <form className="vehicle-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* CUSTOMER SELECTION */}
        <FormSection
          title="Select Customer Owner"
          description="Link this vehicle to an existing workshop customer."
        >
          <div className="form-grid-full">
            <SearchableSelect
              label="Customer Owner"
              required
              options={customerOptions.length ? customerOptions : [{ value: 'CUS-0001', label: 'Rahul Kumar (+91 98765 43210)' }]}
              value={formData.customerId}
              onChange={(val) => setFormData({ ...formData, customerId: val })}
              placeholder="Search customer by name or phone..."
            />
          </div>
        </FormSection>

        {/* VEHICLE INFORMATION */}
        <FormSection
          title="Vehicle Specifications"
          description="Core registration, engine, and technical details."
        >
          <div className="form-grid-full">
            <Input
              label="Registration Number"
              required
              icon={Car}
              placeholder="e.g. KL 10 AB 1234"
              value={formData.regNo}
              onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
            />
          </div>

          <Input
            label="Make / Manufacturer"
            required
            placeholder="Toyota"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
          />

          <Input
            label="Model"
            required
            placeholder="Innova 2.5V"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          />

          <Input
            label="Variant / Edition"
            placeholder="2.5V VX Seven Seater"
            value={formData.variant}
            onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
          />

          <Input
            label="Manufacturing Year"
            placeholder="2021"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          />

          <Select
            label="Fuel Type"
            value={formData.fuelType}
            onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
          >
            <option value="Diesel">Diesel</option>
            <option value="Petrol">Petrol</option>
            <option value="EV / Electric">EV / Electric</option>
            <option value="CNG / Hybrid">CNG / Hybrid</option>
          </Select>

          <Select
            label="Transmission"
            value={formData.transmission}
            onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
          >
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
          </Select>

          <Input
            label="Exterior Colour"
            placeholder="Pearl White"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />

          <Input
            label="Current Odometer Reading"
            icon={Gauge}
            placeholder="1,24,500 km"
            value={formData.odometer}
            onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
          />

          <Input
            label="VIN / Chassis Number"
            placeholder="MBJ112233445566"
            value={formData.vin}
            onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
          />

          <Input
            label="Engine Number"
            placeholder="ENG9081234"
            value={formData.engineNo}
            onChange={(e) => setFormData({ ...formData, engineNo: e.target.value })}
          />
        </FormSection>

        <FormSection title="Vehicle Inspection Camera" description="Capture multiple views before saving the vehicle. Photos remain private.">
          <VehicleCameraQueue photos={photos} onChange={setPhotos} disabled={submitting} uploading={uploadingPhoto}/>
        </FormSection>

        {/* SERVICE & INSURANCE DATES */}
        <FormSection
          title="Service & Insurance History"
          description="Maintenance tracking and policy expiry dates."
        >
          <Input
            label="Last Service Date"
            type="date"
            icon={Calendar}
            value={formData.lastServiceDate}
            onChange={(e) => setFormData({ ...formData, lastServiceDate: e.target.value })}
          />

          <Input
            label="Next Service Due Date"
            type="date"
            icon={Calendar}
            value={formData.nextServiceDue}
            onChange={(e) => setFormData({ ...formData, nextServiceDue: e.target.value })}
          />

          <Input
            label="Insurance Expiry Date"
            type="date"
            icon={ShieldCheck}
            value={formData.insuranceExpiry}
            onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
          />

          <div className="form-grid-full">
            <FileUpload label="Upload Registration RC / Insurance Document" />
          </div>

          <div className="form-grid-full">
            <Textarea
              label="Vehicle Condition & Staff Notes"
              rows={3}
              placeholder="e.g. Minor dent on left rear door, aftermarket alloy wheels..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </FormSection>

        {/* STICKY FOOTER */}
        <StickyFormFooter
          statusText="New Vehicle Registration"
          cancelLabel="Cancel"
          saveLabel="Save Vehicle"
          isSubmitting={submitting}
          onCancel={() => navigate('/vehicles')}
        />
      </form>
    </FormPage>
    </div>
  );
};
