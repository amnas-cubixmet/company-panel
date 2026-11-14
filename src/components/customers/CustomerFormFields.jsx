import { Users, Mail, Building2 } from 'lucide-react';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { CountryPhoneField } from '../common/CountryPhoneField';
import { normalizeCustomerType } from '../../utils/customerFormModel';
import '../../styles/customer-unified-fields.css';

/** One customer create/edit UI across the directory modal and standalone pages.
 * Only one phone input is presented. The same saved number supports
 * optional manual WhatsApp links; no automatic message is ever sent.
 */
export function CustomerFormFields({
  values, onChange, errors = {}, branches = [], branchError = '',
  disabled = false, showStatus = false,
}) {
  const set = field => value => onChange(field, value);
  const fieldProps = field => ({
    'data-customer-field': field,
    error: errors[field] || '',
    disabled,
  });
  const isBusiness = normalizeCustomerType(values.customerType) === 'Business / Company';
  const preferredBranch = String(values.branch || branches[0]?.id || '');
  return <div className="cg-customer-unified-fields">
    <section className="cg-customer-unified-section" aria-label="Customer contact details">
      <div className="cg-customer-unified-section-heading">
        <strong>Contact Details</strong>
        <span>Only name and phone are required.</span>
      </div>
      <Input label="Customer Name" required icon={Users} autoComplete="name"
        {...fieldProps('name')} value={values.name || ''}
        placeholder="Customer full name" onChange={e => set('name')(e.target.value)} />
      <div className="cg-customer-contact-row">
        <div className="cg-customer-unified-phone">
          <CountryPhoneField label="Phone Number" required
            {...fieldProps('phone')} value={values.phone || ''}
            onChange={set('phone')}/>
          <p className="cg-customer-contact-hint">
            One contact number for calls and optional manual WhatsApp sharing.
          </p>
        </div>
        <Input label="Email Address" type="email" icon={Mail}
          autoComplete="email" {...fieldProps('email')} value={values.email || ''}
          placeholder="Email (optional)" onChange={e => set('email')(e.target.value)} />
      </div>
    </section>

    <section className="cg-customer-unified-section" aria-label="Customer classification">
      <div className="cg-customer-unified-section-heading">
        <strong>Customer Details</strong>
        <span>Business and branch details.</span>
      </div>
      <div className="cg-customer-unified-grid customer-directory-form-grid">
        <Select label="Customer Type" {...fieldProps('customerType')}
          value={normalizeCustomerType(values.customerType)}
          onChange={e => set('customerType')(e.target.value)}>
          <option value="Individual">Individual</option>
          <option value="Business / Company">Business / Company</option>
        </Select>
        {branches.length === 1
          ? <div className="cg-customer-branch-locked">
              <span>Assigned Branch</span>
              <strong>{branches[0].name}</strong>
              <small>Assigned automatically from your staff access.</small>
            </div>
          : <Select label="Assigned Branch" {...fieldProps('branch')}
              value={preferredBranch} onChange={e => set('branch')(e.target.value)}>
              {!branches.length && <option value="">No authorized branch available</option>}
              {branches.map(branch =>
                <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>}
      </div>
      {branchError && <p className="cg-customer-unified-error" role="alert">{branchError}</p>}
      {isBusiness && <div className="cg-customer-unified-grid customer-directory-form-grid">
        <Input label="Company Name" icon={Building2}
          {...fieldProps('companyName')} value={values.companyName || ''}
          placeholder="Registered business name" onChange={e => set('companyName')(e.target.value)}/>
        <Input label="GST Number (optional)" maxLength={15}
          {...fieldProps('gstNo')} value={values.gstNo || ''}
          placeholder="GSTIN if registered" onChange={e => set('gstNo')(e.target.value.toUpperCase())}/>
      </div>}
      {showStatus && <Select label="Customer Status" value={values.status || 'active'}
        {...fieldProps('status')} onChange={e => set('status')(e.target.value)}>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </Select>}
    </section>

    <section className="cg-customer-unified-section" aria-label="Customer address and notes">
      <div className="cg-customer-unified-section-heading">
        <strong>Address & Notes</strong>
        <span>Optional invoice and service details.</span>
      </div>
      <Textarea label="Address" rows={2} {...fieldProps('address')}
        value={values.address || ''} placeholder="Building, street and address"
        onChange={e => set('address')(e.target.value)}/>
      <div className="cg-customer-pin-only">
        <Input label="PIN Code" inputMode="numeric" autoComplete="postal-code" maxLength={12}
          {...fieldProps('pincode')} value={values.pincode || ''}
          onChange={e => set('pincode')(e.target.value)}/>
      </div>
      <Textarea label="Customer Notes & Preferences" rows={2}
        {...fieldProps('notes')} value={values.notes || ''}
        placeholder="Service instructions (optional)"
        onChange={e => set('notes')(e.target.value)}/>
    </section>
  </div>;
}

export default CustomerFormFields;
