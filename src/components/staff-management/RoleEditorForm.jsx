import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { clearFieldValidation } from '../../utils/formValidation';
import { buildRoleAccessPreset } from '../../config/rolePermissions';

export const RoleEditorForm = ({
  id,
  editingRole,
  formData,
  setFormData,
  modules,
  onSubmit,
  onPermissionToggle,
  onToggleModule,
  error,
}) => {
  const protectedRole = Boolean(editingRole?.isProtected);
  const [mode, setMode] = useState('custom');
  const [advanced, setAdvanced] = useState(Boolean(editingRole));

  useEffect(() => {
    // Never overwrite existing saved permissions merely by opening Edit.
    setMode('custom');
    setAdvanced(Boolean(editingRole));
  }, [editingRole?.id]);

  const selected = modules.reduce((sum, module) => sum +
    module.actions.filter(action => Boolean(formData.permissions?.[module.key]?.[action])).length, 0);

  const setPreset = (value) => {
    if (protectedRole) return;
    setMode(value);
    if (value === 'custom') {
      setAdvanced(true);
      return;
    }
    // Grant only explicitly permitted actions in visible modules.
    // Presets never grant Finance, Payroll, Delete or approval permissions.
    setFormData(current => ({
      ...current,
      permissions: {
        ...current.permissions,
        ...buildRoleAccessPreset(modules, value),
      },
    }));
    setAdvanced(false);
  };

  const customize = (moduleKey, actionKey) => {
    setMode('custom');
    onPermissionToggle(moduleKey, actionKey);
  };

  const customizeModule = (moduleKey, enable) => {
    setMode('custom');
    onToggleModule(moduleKey, enable);
  };

  return (
    <form id={id} className="role-editor-form role-editor-simple" noValidate onSubmit={onSubmit}
      onChange={event => clearFieldValidation(event.target)}>
      {error && <div className="staff-directory-message is-error" role="alert">{error}</div>}
      <section className="role-editor-card">
        <div className="role-editor-grid">
          <label className="role-editor-field">
            <span>Role name *</span>
            <input type="text" name="name" required disabled={protectedRole}
              value={formData.name}
              onChange={event => setFormData(current => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Service Advisor" />
          </label>
          <label className="role-editor-field">
            <span>Status</span>
            <select name="status" value={formData.status} disabled={protectedRole}
              onChange={event => setFormData(current => ({ ...current, status: event.target.value }))}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>
      {!protectedRole && (
        <label className="role-editor-field">
          <span id={`${id}-access-label`}>Access level</span>
          <select value={mode} onChange={event => setPreset(event.target.value)}
            aria-labelledby={`${id}-access-label`}
            aria-describedby={mode === 'standard' ? `${id}-access-hint` : undefined}>
            <option value="custom">Custom permissions</option>
            <option value="viewer">View only</option>
            <option value="standard">Workshop access</option>
          </select>
          {mode === 'standard' && (
            <small id={`${id}-access-hint`} className="role-access-hint">For customer, vehicle and job card work, with personal attendance where available.</small>
          )}
        </label>
      )}
      <section className="role-permission-choice">
        <button type="button" className="role-permission-expand" aria-expanded={advanced}
          aria-controls="role-permission-details" onClick={() => setAdvanced(value => !value)}>
          <span>{advanced ? 'Hide permissions' : 'Show permissions'}</span>
          <span><small>{selected} selected</small><ChevronDown size={16} aria-hidden="true" /></span>
        </button>
        {advanced && (
          <div id="role-permission-details">
            <RolePermissionMatrix modules={modules} permissions={formData.permissions}
              protectedRole={protectedRole} onToggle={customize}
              onToggleModule={customizeModule} />
          </div>
        )}
      </section>
    </form>
  );
};
