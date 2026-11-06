import { useEffect, useRef, useState } from "react";
import { Save } from 'lucide-react';
import { ResponsiveModalSheet } from '../common/ResponsiveModalSheet';
import { clearFieldValidation, showFormFieldError, showServerFormErrors } from '../../utils/formValidation';

export const StaffProfileEditSheet = ({
  open,
  onClose,
  staff,
  roles,
  teams,
  shifts,
  skills,
  onSave,
  canAssignRole = false,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);
  const [form, setForm] = useState({});
  const [skillIds, setSkillIds] = useState([]);

  useEffect(() => {
    if (!open || !staff) return;
    setError('');
    setForm({
      name: staff.name || '',
      phone: staff.phone || '',
      role: staff.role || '',
      roleId: staff.roleId || (roles.filter(role => role.name === staff.role).length === 1 ? roles.find(role => role.name === staff.role).id : ''),
      teamId: staff.teamId || '',
      shiftId: staff.shiftId || '',
      employmentStatus: staff.employmentStatus || 'Active',
      whatsappConsent: Boolean(staff.whatsappConsent),
      whatsappConsentSource: staff.whatsappConsentSource || '',
      emergencyContact: staff.emergencyContact || '',
      address: staff.address || '',
      notes: staff.notes || '',
    });

    const currentNames = new Set(staff.skills || []);
    setSkillIds(
      skills
        .filter((skill) => currentNames.has(skill.name))
        .map((skill) => String(skill.id)),
    );
  }, [open, staff, skills, roles]);

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleSkill = (skill) => {
    const id = String(skill.id);
    setSkillIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      showFormFieldError(formRef.current, 'name', 'Full name is required.');
      return;
    }
    if (canAssignRole && form.whatsappConsent && !form.whatsappConsentSource?.trim()) {
      showFormFieldError(formRef.current, 'whatsappConsentSource', 'Select how WhatsApp consent was recorded.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...Object.fromEntries(Object.entries(form).filter(([key]) => canAssignRole || !['role', 'roleId', 'whatsappConsent', 'whatsappConsentSource'].includes(key))),
        teamId: form.teamId || null,
        shiftId: form.shiftId || null,
        skillIds: skills
          .filter((skill) => skillIds.includes(String(skill.id)))
          .map((skill) => skill.id),
        skills: skills
          .filter((skill) => skillIds.includes(String(skill.id)))
          .map((skill) => skill.name),
      });
      onClose();
    } catch (cause) {
      showServerFormErrors(formRef.current, cause, {
        roleId: 'role', role: 'role', phone: 'phone', name: 'name',
        employmentStatus: 'employmentStatus',
        whatsappConsentSource: 'whatsappConsentSource',
      });
      setError(cause?.message || 'Unable to update staff.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModalSheet
      isOpen={open}
      onClose={onClose}
      title="Edit Staff Profile"
      maxWidth="680px"
    >
      <form ref={formRef} className="staff-profile-edit-form" noValidate onSubmit={submit}
        onChange={event => clearFieldValidation(event.target)}>
        {error && <div className="staff-directory-message is-error" role="alert">{error}</div>}
        <div className="staff-profile-edit-grid">
          <label>Full Name *<input name="name" required value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></label>
          <label>Mobile Number<input name="phone" type="tel" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
          <label>
            Company Role
            <select name="role" disabled={!canAssignRole} value={form.roleId || ''} onChange={(e) => { const role = roles.find(item => String(item.id) === e.target.value); setForm(current => ({...current,roleId:role?.id || '',role:role?.name || ''})); }}>
              <option value="">Choose role</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>

          <label>
            Team
            <select value={form.teamId || ''} onChange={(e) => set('teamId', e.target.value)}>
              <option value="">Unassigned</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>

          <label>
            Shift
            <select value={form.shiftId || ''} onChange={(e) => set('shiftId', e.target.value)}>
              <option value="">Unassigned</option>
              {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
            </select>
          </label>

          <label>
            Status
            <select name="employmentStatus" value={form.employmentStatus || 'Active'} onChange={(e) => set('employmentStatus', e.target.value)}>
              {['Active','Probation','Notice Period','Suspended','Resigned','Terminated','Inactive'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>

          <label>Emergency Contact<input value={form.emergencyContact || ''} onChange={(e) => set('emergencyContact', e.target.value)} /></label>

          <label className="is-wide">Address<textarea rows={3} value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></label>
          <label className="is-wide">Notes<textarea rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
        </div>

        {canAssignRole && (
          <div className="staff-profile-edit-grid" style={{ marginTop: 12 }}>
            <label className="is-wide" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={Boolean(form.whatsappConsent)}
                onChange={(event) => set('whatsappConsent', event.target.checked)} />
              WhatsApp Consent
            </label>
            {form.whatsappConsent && (
              <label className="is-wide">Consent Source *
                <select name="whatsappConsentSource" value={form.whatsappConsentSource || ''}
                  onChange={(event) => set('whatsappConsentSource', event.target.value)}>
                  <option value="">Choose source</option>
                  <option value="Staff consented in person during onboarding">In person</option>
                  <option value="Signed staff WhatsApp consent form">Signed consent form</option>
                  <option value="Staff consented through approved digital form">Approved digital form</option>
                </select>
              </label>
            )}
          </div>
        )}

        <p className="staff-profile-edit-pay-note">
          Pay type and rates are managed in the staff profile's Payroll tab.
          Use Change Pay Configuration there to preserve effective-dated payroll history.
        </p>

        <div className="staff-profile-edit-skills">
          <span>Skills</span>
          <div>
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                className={skillIds.includes(String(skill.id)) ? 'is-selected' : ''}
                onClick={() => toggleSkill(skill)}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>

        <div className="staff-profile-edit-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="is-primary" disabled={saving}>
            <Save size={13} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ResponsiveModalSheet>
  );
};
