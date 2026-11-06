
import { Save } from 'lucide-react';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { clearFieldValidation } from '../../utils/formValidation';

export const RoleEditorForm = ({
  editingRole,
  formData,
  setFormData,
  modules,
  saving,
  onSubmit,
  onCancel,
  onPermissionToggle,
  onToggleModule,
  error,
}) => {
  const protectedRole = Boolean(editingRole?.isProtected);

  return (
    <form className="role-editor-form" noValidate onSubmit={onSubmit}
      onChange={event => clearFieldValidation(event.target)}>
      {error && <div className="staff-directory-message is-error" role="alert">{error}</div>}
      <section className="role-editor-card">
        <div className="role-editor-grid">
          <label className="role-editor-field">
            <span>Role Name *</span>
            <input
              type="text"
              name="name"
              required
              disabled={protectedRole}
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Workshop Supervisor"
            />
          </label>

          <label className="role-editor-field">
            <span>Role Status</span>
            <select name="status"
              value={formData.status}
              disabled={protectedRole}
              onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>

          <p className="role-editor-field is-wide" role="note">
            Company permissions apply within this workshop. Paid features require entitlement.
          </p>
        </div>
      </section>

      <RolePermissionMatrix
        modules={modules}
        permissions={formData.permissions}
        protectedRole={protectedRole}
        onToggle={onPermissionToggle}
        onToggleModule={onToggleModule}
      />

      <div className="role-editor-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="is-primary" disabled={saving || protectedRole}>
          <Save size={14} />
          {protectedRole ? 'Protected Full Access' : saving ? 'Saving…' : 'Save Role'}
        </button>
      </div>
    </form>
  );
};
