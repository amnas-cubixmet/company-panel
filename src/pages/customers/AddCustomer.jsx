import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { FormPage } from '../../components/common/forms/FormPage';
import { FormSection } from '../../components/common/forms/FormSection';
import { StickyFormFooter } from '../../components/common/forms/StickyFormFooter';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { PhoneInput } from '../../components/common/PhoneInput';
import { Checkbox } from '../../components/common/Checkbox';
import { customerService } from '../../services/customer.service';
import { CustomerManagementTabs } from '../../components/customers/CustomerManagementTabs';
import { User, Mail, Building, CheckCircle2 } from "lucide-react";

export const AddCustomer = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    customerType: 'Individual',
    companyName: '',
    gstNo: '',
    address: '',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682031',
    branch: 'Main Garage Branch',
    notes: '',
    sendWhatsappUpdate: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await customerService.createCustomer({
        ...formData,
        whatsapp: formData.whatsapp || formData.phone
      });
      setToastMsg('Customer created successfully.');
      setTimeout(() => navigate('/customers/all'), 1000);
    } catch (err) {
      console.error("Error creating customer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPage
      title="Add Customer"
      
    >
      <CustomerManagementTabs />

      {toastMsg && (
        <div style={{ backgroundColor: 'var(--success)', color: '#ffffff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      <form className="customer-add-form cg-customers" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* BASIC INFORMATION */}
        <FormSection
          title="Basic Information"
          
        >
          <div className="form-grid-full">
            <Input
              label="Customer Name"
              required
              icon={User}
              placeholder="e.g. Rahul Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <PhoneInput
            label="Phone Number"
            required
            placeholder="98765 43210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <PhoneInput
            label="WhatsApp Number"
            placeholder="98765 43210"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          />

          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="rahul.k@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Select
            label="Customer Type"
            value={formData.customerType}
            onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
          >
            <option value="Individual">Individual</option>
            <option value="Company/Fleet">Company / Fleet</option>
            <option value="Insurance">Insurance</option>
            <option value="Dealer/Partner">Dealer / Partner</option>
          </Select>

          {formData.customerType !== 'Individual' && (
            <>
              <Input
                label="Company Name"
                icon={Building}
                placeholder="Apex Logistics Ltd"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
              <Input
                label="GST Number"
                placeholder="32AAAAA0000A1Z5"
                value={formData.gstNo}
                onChange={(e) => setFormData({ ...formData, gstNo: e.target.value })}
              />
            </>
          )}
        </FormSection>

        {/* ADDRESS DETAILS */}
        <FormSection
          title="Address Details"
          
        >
          <div className="form-grid-full">
            <Textarea
              label="Street Address"
              rows={2}
              placeholder="Building name, street details..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />

          <Input
            label="State"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />

          <Input
            label="PIN Code"
            placeholder="682031"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
          />

          <Select
            label="Assigned Branch"
            value={formData.branch}
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          >
            <option value="Main Garage Branch">Main Garage Branch</option>
            <option value="Kochi South Branch">Kochi South Branch</option>
          </Select>
        </FormSection>

        {/* ADDITIONAL PREFERENCES */}
        <FormSection
          title="Additional Preferences"
          
        >
          <div className="form-grid-full">
            <Textarea
              label="Customer Notes & Instructions"
              rows={3}
              placeholder="e.g. Prefers evening delivery, call before replacing parts..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="form-grid-full" style={{ marginTop: '8px' }}>
            <Checkbox
              label="Send automated WhatsApp updates & receipts to customer"
              checked={formData.sendWhatsappUpdate}
              onChange={(e) => setFormData({ ...formData, sendWhatsappUpdate: e.target.checked })}
            />
          </div>
        </FormSection>

        {/* STICKY FOOTER */}
        <StickyFormFooter
          statusText="New Customer Profile"
          cancelLabel="Cancel"
          saveLabel="Save Customer"
          isSubmitting={submitting}
          onCancel={() => navigate('/customers/all')}
        />
      </form>
    </FormPage>
  );
};
