import { useEffect, useRef, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { roleService } from '../../services/role.service';
import { staffService } from '../../services/staff.service';
import { branchService } from '../../services/branch.service';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';
import { showFormFieldError, showServerFormErrors } from '../../utils/formValidation';

const employmentStatuses = ['Active', 'Probation', 'Notice Period', 'Inactive', 'Suspended', 'Resigned', 'Terminated'];
const consentSources = [
  { value: '', label: 'Select how consent was given' },
  { value: 'Staff consented in person during onboarding', label: 'Staff agreed in person' },
  { value: 'Signed staff WhatsApp consent form', label: 'Signed consent form' },
  { value: 'Staff consented through approved digital form', label: 'Approved digital consent' },
];

export const StaffAddPage = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { user } = useAuth();
  const canManageLogins = hasPermission(user, 'company.manage');
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    name: '', phone: '', designation: '', branchId: '',
    roleId: '', role: '', employmentStatus: 'Active',
    loginAccessEnabled: canManageLogins,
    whatsappConsent: false, whatsappConsentSource: '',
  });
  const set = (key, value) => {
    setError('');
    setForm(current => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([roleService.getAssignableRoles(), branchService.getBranches()])
      .then(([roleRows, branchRows]) => {
        if (!mounted) return;
        const availableRoles = (Array.isArray(roleRows) ? roleRows : [])
          .filter(role => role.status !== 'Inactive' && !role.isProtected && !role.is_system);
        const availableBranches = (Array.isArray(branchRows) ? branchRows : [])
          .filter(branch => branch.is_active !== false);
        setRoles(availableRoles);
        setBranches(availableBranches);
        setForm(current => ({
          ...current,
          // Require explicit role selection; never silently grant the first role.
          roleId: current.roleId || '',
          role: current.role || '',
          branchId: current.branchId || availableBranches[0]?.id || '',
        }));
      })
      .catch(requestError => {
        if (mounted) setError(requestError?.message || 'Could not load company roles or branches.');
      })
      .finally(() => { if (mounted) setLoadingOptions(false); });
    return () => { mounted = false; };
  }, []);

  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      showFormFieldError(formRef.current, 'name', 'Full name is required.');
      return;
    }
    if (!/^\+[\d\s().-]{8,22}$/.test(form.phone.trim())) {
      showFormFieldError(formRef.current, 'phone', 'Use a mobile with country code, e.g. +919876543210.');
      return;
    }
    if (!form.roleId) {
      showFormFieldError(formRef.current, 'role', 'Select a company role.');
      setError('Select a company role before saving staff.');
      return;
    }
    if (form.loginAccessEnabled && !canManageLogins) {
      setError('Only the company administrator can create login accounts.');
      return;
    }
    if (form.whatsappConsent && !form.whatsappConsentSource) {
      setError('Select the recorded source of WhatsApp consent.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await staffService.createStaff({
        ...form, name: form.name.trim(), phone: form.phone.trim(),
      });
      const destination = created?.id
        ? `/staff-management/staff/${created.id}` : '/staff-management/staff';
      // A fallback bearer link is transferred only to the authorized staff
      // profile view, not embedded in URL query parameters or error messages.
      const manual = ['manual', 'failed'].includes(created?.whatsappInviteStatus);
      navigate(destination, {
        replace: true,
        state: {
          whatsappInviteStatus: created?.whatsappInviteStatus || '',
          ...(manual && created?.setupLink ? { setupLink: created.setupLink } : {}),
        },
      });
    } catch (requestError) {
      showServerFormErrors(formRef.current, requestError, {
        roleId: 'role', role: 'role', phone: 'phone', name: 'name',
      });
      setError(requestError?.message || 'Unable to save staff. Please check the fields.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} className="staff-add-page" onSubmit={submit}>
      <section className="staff-add-page__header">
        <div>
          <h2>Add Staff</h2>
          <p>Create a staff profile with mobile login and WhatsApp password setup.</p>
        </div>
        <button className="staff-save-button" type="submit" disabled={saving || loadingOptions}>
          <Save size={15}/>{saving ? 'Saving…' : 'Save Staff'}
        </button>
      </section>

      {error && <div className="staff-directory-message is-error" role="alert">{error}</div>}
      <div className="staff-add-layout">
        <div className="staff-add-main">
          <section className="staff-form-panel">
            <div className="staff-form-panel__title"><UserPlus size={16}/>Staff Details</div>
            <div className="staff-form-grid">
              <label>Full Name *
                <input name="name" required autoComplete="name" value={form.name}
                  onChange={event => set('name', event.target.value)} placeholder="Full name"/>
              </label>
              <label>Mobile Number with Country Code *
                <input name="phone" type="tel" required autoComplete="tel"
                  inputMode="tel" value={form.phone} onChange={event => set('phone', event.target.value)}
                  placeholder="+919876543210"/>
              </label>
              <label>Designation
                <input name="designation" value={form.designation}
                  onChange={event => set('designation', event.target.value)} placeholder="e.g. Mechanic"/>
              </label>
              <label>Branch
                <select name="branchId" value={form.branchId} onChange={event => set('branchId', event.target.value)}>
                  <option value="">Unassigned</option>
                  {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label>Company Role *
                <select name="role" required value={form.roleId}
                  onChange={event => {
                    const role = roles.find(row => String(row.id) === event.target.value);
                    setForm(current => ({ ...current, roleId: role?.id || '', role: role?.name || '' }));
                  }}>
                  <option value="">Choose role</option>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
              <label>Employment Status
                <select name="employmentStatus" value={form.employmentStatus}
                  onChange={event => set('employmentStatus', event.target.value)}>
                  {employmentStatuses.map(status => <option key={status}>{status}</option>)}
                </select>
              </label>
            </div>
            {!loadingOptions && !roles.length &&
              <p className="staff-directory-message" role="status">No assignable company role exists. Create one under Roles &amp; Permissions first.</p>}
          </section>

          <section className="staff-form-panel">
            <div className="staff-form-panel__title">Staff Login Access</div>
            <label className="staff-login-invite-hint" style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44 }}>
              <input type="checkbox" checked={form.loginAccessEnabled} disabled={!canManageLogins}
                onChange={event => set('loginAccessEnabled', event.target.checked)}/>
              Enable Mobile Number + Password Login
            </label>
            {form.loginAccessEnabled && (
              <div className="staff-form-grid">
                <label className="staff-login-invite-hint" style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44 }}>
                  <input type="checkbox" checked={form.whatsappConsent}
                    onChange={event => {
                      setForm(current => ({
                        ...current,
                        whatsappConsent: event.target.checked,
                        whatsappConsentSource: event.target.checked ? current.whatsappConsentSource : '',
                      }));
                    }}/>
                  Staff has agreed to receive password setup messages on WhatsApp
                </label>
                {form.whatsappConsent && <label>Consent Source *
                  <select value={form.whatsappConsentSource} required
                    onChange={event => set('whatsappConsentSource', event.target.value)}>
                    {consentSources.map(source => <option key={source.value} value={source.value}>{source.label}</option>)}
                  </select>
                </label>}
              </div>
            )}
            {form.loginAccessEnabled && (
              <p className="staff-login-invite-hint">
                Secure setup invitation is queued automatically when official workshop WhatsApp is available and consented.
              </p>
            )}
          </section>
        </div>

      </div>
    </form>
  );
};
