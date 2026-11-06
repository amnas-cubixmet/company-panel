// Shared presentation validation only. Django remains the source of truth.
const fieldAliases = {
  registration: 'regNo', reg_no: 'regNo', licensePlate: 'regNo',
  customer: 'customerId', customer_id: 'customerId',
  engine_no: 'engineNo', chassis_number: 'vin', vin_number: 'vin',
  fuel_type: 'fuelType', last_service_date: 'lastServiceDate',
  next_service_due: 'nextServiceDue', insurance_expiry: 'insuranceExpiry',
};

const knownFields = new Set([
  'customerId', 'regNo', 'make', 'model', 'variant', 'year',
  'fuelType', 'transmission', 'color', 'odometer', 'vin', 'engineNo',
  'lastServiceDate', 'nextServiceDue', 'insuranceExpiry', 'notes', 'status',
]);

export const extractVehicleFieldErrors = (error) => {
  const payload = error?.response?.data || error?.data || {};
  const result = {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return result;
  for (const [field, message] of Object.entries(payload)) {
    const normalized = fieldAliases[field] || field;
    if (knownFields.has(normalized)) {
      result[normalized] = Array.isArray(message) ? String(message[0]) : String(message);
    }
  }
  return result;
};

export const requiredVehicleFields = (values, customers) => {
  const errors = {};
  if (!values.customerId || !customers.some((customer) => String(customer.id) === String(values.customerId))) {
    errors.customerId = 'Select an existing customer.';
  }
  if (!String(values.regNo || '').trim()) errors.regNo = 'Registration number is required.';
  if (!String(values.make || '').trim()) errors.make = 'Make is required.';
  if (!String(values.model || '').trim()) errors.model = 'Model is required.';
  return errors;
};

export const focusFirstVehicleError = (form, errors) => {
  const firstField = Object.keys(errors)[0];
  if (!form || !firstField) return;
  const field = form.querySelector(`[data-vehicle-field="${firstField}"]`);
  const control = field?.matches('input,select,textarea,[role="combobox"]')
    ? field : field?.querySelector('input,select,textarea,[role="combobox"]');
  control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  control?.focus({ preventScroll: true });
};
