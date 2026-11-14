import { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { FormPage } from '../../components/common/forms/FormPage';
import { FormSection } from '../../components/common/forms/FormSection';
import { StickyFormFooter } from '../../components/common/forms/StickyFormFooter';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { CountryPhoneField } from '../../components/common/CountryPhoneField';
import { validInternationalPhone } from '../../utils/jobCreateAdapters';
import { CustomerManagementTabs } from '../../components/customers/CustomerManagementTabs';
import { customerService } from '../../services/customer.service';

export const EditCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    customerType: 'Individual',
    companyName: '',
    gstNo: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    branch: 'Main Garage Branch',
    notes: '',
    status: 'Active'
  });

  useEffect(() => {
    customerService.getCustomerById(id)
      .then((customer) => {
        if (!customer) return;
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          customerType: customer.customerType || 'Individual',
          companyName: customer.companyName || '',
          gstNo: customer.gstNo || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          branch: customer.branch || 'Main Garage Branch',
          notes: customer.notes || '',
          status: customer.status || 'Active'
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, value) => setFormData((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!validInternationalPhone(formData.phone)) {
      return;
    }
    setSubmitting(true);
    try {
      await customerService.updateCustomer(id, { ...formData, whatsapp: formData.phone });
      navigate(`/customers/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="customer-empty">Loading customer profile...</div>;

  return (
    <FormPage
      title="Edit Customer"
      description="Update customer contact, account type, company details, address and workshop preferences."
    >
      <CustomerManagementTabs />

      <form onSubmit={submit} className="customer-edit-form">
        <FormSection title="Customer Information" description="Primary contact and customer classification.">
          <div className="form-grid-full">
            <Input label="Customer Name" required value={formData.name} onChange={(e)=>set('name',e.target.value)}/>
          </div>
          <CountryPhoneField label="Phone" required value={formData.phone} onChange={value => set('phone', value)}/>
          <small>The same Phone is used for manual WhatsApp sharing.</small>
          <Input label="Email" type="email" value={formData.email} onChange={(e)=>set('email',e.target.value)}/>
          <Select label="Customer Type" value={formData.customerType} onChange={(e)=>set('customerType',e.target.value)}>
            <option>Individual</option>
            <option>Company/Fleet</option>
            <option>Insurance</option>
            <option>Dealer/Partner</option>
          </Select>
          <Select label="Status" value={formData.status} onChange={(e)=>set('status',e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
            <option>Archived</option>
          </Select>

          {formData.customerType !== 'Individual' ? (
            <>
              <Input label="Company / Organization" value={formData.companyName} onChange={(e)=>set('companyName',e.target.value)}/>
              <Input label="GST Number" value={formData.gstNo} onChange={(e)=>set('gstNo',e.target.value)}/>
            </>
          ) : null}
        </FormSection>

        <FormSection title="Address & Workshop" description="Address, assigned branch and service preferences.">
          <div className="form-grid-full">
            <Textarea label="Address" rows={2} value={formData.address} onChange={(e)=>set('address',e.target.value)}/>
          </div>
          <Input label="City" value={formData.city} onChange={(e)=>set('city',e.target.value)}/>
          <Input label="State" value={formData.state} onChange={(e)=>set('state',e.target.value)}/>
          <Input label="PIN Code" value={formData.pincode} onChange={(e)=>set('pincode',e.target.value)}/>
          <Select label="Assigned Branch" value={formData.branch} onChange={(e)=>set('branch',e.target.value)}>
            <option>Main Garage Branch</option>
            <option>Kochi South Branch</option>
          </Select>
          <div className="form-grid-full">
            <Textarea label="Customer Notes" rows={3} value={formData.notes} onChange={(e)=>set('notes',e.target.value)}/>
          </div>
        </FormSection>

        <StickyFormFooter
          statusText={`Editing ${id}`}
          cancelLabel="Cancel"
          saveLabel="Update Customer"
          isSubmitting={submitting}
          onCancel={() => navigate(`/customers/${id}`)}
        />
      </form>
    </FormPage>
  );
};
