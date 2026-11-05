import { useEffect, useMemo, useRef, useState } from "react";
import { Save, UserPlus, WalletCards, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { roleService } from '../../services/role.service';
import { staffService } from '../../services/staff.service';
import { staffManagementService } from '../../services/staffManagement.service';
import { branchService } from '../../services/branch.service';
import { BranchCreateSheet } from '../../components/staff-management/BranchCreateSheet';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';
import { showFormFieldError, showServerFormErrors } from '../../utils/formValidation';
import { isValidEmail, normalizeEmail } from '../../utils/validation';

const statusOptions = [
  'Active',
  'Probation',
  'Notice Period',
  'Suspended',
  'Resigned',
  'Terminated',
  'Inactive',
];

const today = () => new Date().toISOString().slice(0, 10);

export const StaffAddPage = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { user } = useAuth();
  const canManageBranches = hasPermission(user, 'company.manage');
  const canManagePayroll = hasPermission(user, 'payroll.edit');
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const [setSalaryNow, setSetSalaryNow] = useState(canManagePayroll);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    loginAccessEnabled: canManageBranches,
    whatsappConsent: false,
    whatsappConsentSource: '',
    designation: '',
    role: '',
    roleId: '',
    teamId: '',
    shiftId: '',
    branchId: '',
    joiningDate: today(),
    employmentStatus: 'Active',
    emergencyContact: '',
    address: '',
    notes: '',
  });

  const [salary, setSalary] = useState({ dailyWageRate: '', effectiveDate: today() });

  useEffect(() => {
    let alive = true;

    Promise.allSettled([
      roleService.getAssignableRoles(),
      staffManagementService.getTeams(),
      staffManagementService.getShifts(),
      branchService.getBranches(),
    ])
      .then((results) => {
        const [roleRows, teamRows, shiftRows, branchRows] = results.map(result => result.status === 'fulfilled' ? result.value : []);
        if (!alive) return;

        if (results[0].status === 'rejected') setError(results[0].reason?.message || 'Could not load company-created staff roles.');
        const activeRoles = (Array.isArray(roleRows) ? roleRows : []).filter(
          (role) => role.status !== 'Inactive' && !role.isProtected && !role.is_system,
        );
        const nextTeams = Array.isArray(teamRows) ? teamRows : [];
        const nextShifts = Array.isArray(shiftRows) ? shiftRows : [];
        const nextBranches = (Array.isArray(branchRows) ? branchRows : []).filter(
          (item) => item.is_active !== false,
        );

        setRoles(activeRoles);
        setTeams(nextTeams);
        setShifts(nextShifts);
        setBranches(nextBranches);

        setForm((current) => ({
          ...current,
          role: current.role || activeRoles[0]?.name || '',
          roleId: current.roleId || activeRoles[0]?.id || '',
          teamId: current.teamId || nextTeams[0]?.id || '',
          shiftId: current.shiftId || nextShifts[0]?.id || '',
          branchId: current.branchId || nextBranches[0]?.id || '',
        }));
      })
      .catch((requestError) => {
        if (alive) {
          setError(requestError?.message || 'Unable to load staff setup options.');
        }
      })
      .finally(() => {
        if (alive) setLoadingOptions(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === String(form.teamId)),
    [teams, form.teamId],
  );

  const selectedShift = useMemo(
    () => shifts.find((shift) => String(shift.id) === String(form.shiftId)),
    [shifts, form.shiftId],
  );

  const selectedBranch = useMemo(
    () => branches.find((item) => String(item.id) === String(form.branchId)),
    [branches, form.branchId],
  );

  const set = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim() || !form.phone.trim()) {
      showFormFieldError(formRef.current, !form.name.trim() ? 'name' : 'phone', 'This field is required.');
      setError('Enter the staff name and phone number.');
      return;
    }

    if (!/^\\+[\\d\\s().-]{8,22}$/.test(form.phone.trim())) {
      showFormFieldError(formRef.current, 'phone', 'Use a mobile with country code, e.g. +919876543210.');
      setError('Enter a valid international mobile number.');
      return;
    }
    if (form.loginAccessEnabled && form.whatsappConsent && form.whatsappConsentSource.trim().length < 3) {
      setError('Record how the staff member agreed to WhatsApp onboarding messages.');
      return;
    }
    const email = normalizeEmail(form.email);
    if (email && !isValidEmail(email)) {
      showFormFieldError(formRef.current, 'email', 'Enter a valid staff email address.');
      setError('Enter a valid email or leave it blank.');
      return;
    }
    if (form.loginAccessEnabled && !canManageBranches) {
      showFormFieldError(formRef.current, 'email', 'Only a company admin can create staff login accounts.');
      setError('Ask a company admin to create the staff login.');
      return;
    }
    if (form.loginAccessEnabled && !form.role.trim()) {
      showFormFieldError(formRef.current, 'role', 'Choose a staff role for mobile/password login.');
      setError('Select the permissions this staff account should have.');
      return;
    }

    if (canManagePayroll && setSalaryNow &&
        (!Number.isFinite(Number(salary.dailyWageRate)) || Number(salary.dailyWageRate) <= 0)) {
      showFormFieldError(formRef.current, 'dailyWageRate', 'Enter a daily wage rate greater than zero.');
      setError('A positive daily wage rate is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await staffService.createStaff({
        ...form,
        email,
        department: selectedTeam?.name || '',
        shift: '',
        teamId: form.teamId || null,
        shiftId: form.shiftId || null,
        branchId: form.branchId || null,
        setSalaryNow: canManagePayroll && setSalaryNow,
        salarySetup: canManagePayroll && setSalaryNow
          ? { dailyWageRate: Number(salary.dailyWageRate), effectiveDate: salary.effectiveDate }
          : null,
      });

      navigate(
        created?.wageSetupError && created?.id
          ? `/staff/${created.id}/wages`
          : created?.id ? `/staff-management/staff/${created.id}` : '/staff-management/staff',
        { state: {
          ...(created?.wageSetupError ? { wageSetupError: created.wageSetupError } : {}),
          ...(created?.emailDeliveryStatus ? { emailDeliveryStatus: created.emailDeliveryStatus } : {}),
        } },
      );
    } catch (requestError) {
      showServerFormErrors(formRef.current, requestError, {
        employee_name: 'name', mobile: 'phone', base_salary: 'baseSalary',
        daily_wage_rate: 'dailyWageRate',
      });
      setError(requestError?.message || 'Unable to create staff.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form ref={formRef} className="staff-add-page" onSubmit={submit}>
      <section className="staff-add-page__header">
        <div>
          <h2>Add Staff</h2>
          <p>Create profile, role access, branch, team, shift and payroll setup together.</p>
        </div>
        <button className="staff-save-button" type="submit" disabled={saving || loadingOptions}>
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Staff'}
        </button>
      </section>

      {error && <div className="staff-directory-message is-error" role="alert">{error}</div>}

      <div className="staff-add-layout">
        <div className="staff-add-main">
          <section className="staff-form-panel">
            <div className="staff-form-panel__title">
              <UserPlus size={16} />
              Personal & Employment
            </div>

            <div className="staff-form-grid">
              <label>
                Full Name *
                <input
                  required
                  name="name"
                      value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder="Staff full name"
                />
              </label>

              <label>
                Phone *
                <input
                  required
                  name="phone"
                      value={form.phone}
                  onChange={(event) => set('phone', event.target.value)}
                  placeholder="+91 ..."
                />
              </label>

              <label>
                Email (optional)
                <input
                  type="email"
                  name="email"
                      value={form.email}
                  onChange={(event) => set('email', event.target.value)}
                  placeholder="name@company.com"
                />
              </label>

              <label className="staff-login-invite-hint" style={{display:'flex',gap:'10px',alignItems:'center',minHeight:'44px'}}>
                <input type="checkbox" checked={form.loginAccessEnabled} disabled={!canManageBranches}
                  onChange={(event) => set('loginAccessEnabled', event.target.checked)}/>
                Enable mobile number + password login
              </label>
              <p className="staff-login-invite-hint">
                Email is optional. We create a secure 24-hour password link for the registered mobile.
                Without connected official workshop WhatsApp, an admin can copy/share the link securely.
              </p>
              {form.loginAccessEnabled && <>
                <label className="staff-login-invite-hint" style={{display:'flex',gap:'10px',alignItems:'center',minHeight:'44px'}}>
                  <input type="checkbox" checked={form.whatsappConsent}
                    onChange={(event) => set('whatsappConsent',event.target.checked)}/>
                  Staff explicitly agreed to WhatsApp onboarding messages
                </label>
                {form.whatsappConsent && <label>
                  Consent Source / Reference
                  <input type="text" value={form.whatsappConsentSource} maxLength={120}
                    onChange={(event) => set('whatsappConsentSource',event.target.value)}
                    placeholder="e.g. Signed employment intake form"/>
                </label>}
              </>}
              <label>
                Designation
                <input
                  value={form.designation}
                  onChange={(event) => set('designation', event.target.value)}
                />
              </label>

              <label>
                Company Role
                <select
                  name="role"
                  value={form.roleId}
                  onChange={(event) => {
                      const role = roles.find(item => String(item.id) === event.target.value);
                      setForm(current => ({...current, roleId:role?.id || '', role:role?.name || ''}));
                    }}
                >
                  <option value="">Select company-created role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              {!loadingOptions && roles.length === 0 && (
                <p className="staff-login-invite-hint">
                  No staff roles have been created for this company yet.
                  {user?.isCompanyOwner ? ' Create one in Roles & Permissions before enabling mobile login.' : ' Ask your company owner to create a role.'}
                </p>
              )}

              <label>
                Employment Status
                <select
                  value={form.employmentStatus}
                  onChange={(event) => set('employmentStatus', event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label>
                Joining Date
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(event) => set('joiningDate', event.target.value)}
                />
              </label>

              <label>
                Branch
                <div className="staff-branch-select-row">
                  <select
                    value={form.branchId}
                    onChange={(event) => set('branchId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {branches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {canManageBranches && (
                    <button
                      type="button"
                      className="staff-inline-create-button"
                      onClick={() => setBranchSheetOpen(true)}
                    >
                      + Branch
                    </button>
                  )}
                </div>
              </label>
            </div>
          </section>

          <section className="staff-form-panel">
            <div className="staff-form-panel__title">
              <Wrench size={16} />
              Workshop Assignment
            </div>

            <div className="staff-form-grid">
              <label>
                Team / Department
                <select
                  value={form.teamId}
                  onChange={(event) => set('teamId', event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Shift
                <select
                  value={form.shiftId}
                  onChange={(event) => set('shiftId', event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                      {shift.time ? ` · ${shift.time}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Weekly Off
                <input
                  value={selectedShift?.weeklyOff || 'Defined by shift'}
                  readOnly
                />
              </label>


            </div>

          </section>

          <section className="staff-form-panel">
            <div className="staff-form-panel__title">Contact & Notes</div>
            <div className="staff-form-grid">
              <label>
                Emergency Contact
                <input
                  value={form.emergencyContact}
                  onChange={(event) => set('emergencyContact', event.target.value)}
                  placeholder="Name · Phone"
                />
              </label>

              <label className="is-wide">
                Address
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(event) => set('address', event.target.value)}
                />
              </label>

              <label className="is-wide">
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => set('notes', event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="staff-form-panel">
            <div className="staff-form-panel__title">
              <WalletCards size={16} />
              Daily Wage Rate
            </div>

            {canManagePayroll ? (
              <label className="staff-salary-toggle">
                <span>
                  <strong>Set daily wage now</strong>
                  <small>Set this worker's daily wage. Full day earns 100%, half day 50%, leave and weekly off ₹0.</small>
                </span>
                <input
                  type="checkbox"
                  checked={setSalaryNow}
                  onChange={(event) => setSetSalaryNow(event.target.checked)}
                />
              </label>
            ) : (
              <div className="staff-directory-message">
                A payroll manager can configure the daily wage from this employee's Wage Account.
              </div>
            )}

            {canManagePayroll && setSalaryNow && (
              <div className="staff-form-grid staff-salary-grid">
                <label>
                  Daily Wage Rate (₹) *
                  <input name="dailyWageRate" type="number" min="0.01" step="0.01"
                    value={salary.dailyWageRate}
                    onChange={(event) => setSalary((current) => ({ ...current, dailyWageRate: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Effective From *
                  <input type="date" value={salary.effectiveDate}
                    onChange={(event) => setSalary((current) => ({ ...current, effectiveDate: event.target.value }))}
                    required
                  />
                </label>
                <p className="staff-directory-message">
                  Daily wage is credited on approved attendance. OT, extra duty and bonuses are
                  added through the employee Wage Account. Payment can be recorded on any date.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="staff-add-summary">
          <div className="staff-add-summary__avatar">
            {form.name ? form.name.slice(0, 1).toUpperCase() : 'S'}
          </div>
          <h3>{form.name || 'New Staff Member'}</h3>
          <p>{form.designation} · {selectedTeam?.name || 'Unassigned Team'}</p>

          <div className="staff-add-summary__rows">
            <div><span>Role</span><strong>{form.role || 'Not selected'}</strong></div>
            <div><span>Branch</span><strong>{selectedBranch?.name || 'Unassigned'}</strong></div>
            <div><span>Shift</span><strong>{selectedShift?.name || 'Unassigned'}</strong></div>
            <div><span>Status</span><strong>{form.employmentStatus}</strong></div>
            <div><span>Daily Wage</span><strong>{canManagePayroll && setSalaryNow ? 'To configure' : 'Later'}</strong></div>
          </div>
        </aside>
      </div>

      </form>

      <BranchCreateSheet
        isOpen={canManageBranches && branchSheetOpen}
        onClose={() => setBranchSheetOpen(false)}
        onCreate={async (data) => {
          const created = await branchService.createBranch(data);
          const next = await branchService.getBranches();
          setBranches(next.filter((item) => item.is_active !== false));
          if (created?.id) set('branchId', created.id);
        }}
      />
    </>
  );
};
