
import { permissionActionLabel } from '../../config/rolePermissions';

export const RolePermissionMatrix = ({
  modules,
  permissions,
  protectedRole,
  onToggle,
  onToggleModule,
}) => (
  <section className="role-permission-matrix">
    <div className="role-permission-matrix-head">
      <div>
        <h3>Module Permissions</h3>
        <p>Choose exactly what this role can access and manage.</p>
      </div>
    </div>

    <div className="role-permission-modules">
      {modules.map((module) => {
        const current = permissions[module.key] || {};
        const allChecked = module.actions.every((action) => Boolean(current[action]));

        return (
          <article key={module.key} className="role-permission-module">
            <header>
              <div>
                <strong>{module.label}</strong>
                <span>{module.actions.length} permission{module.actions.length === 1 ? '' : 's'}</span>
              </div>

              <button
                type="button"
                disabled={protectedRole}
                onClick={() => onToggleModule(module.key, !allChecked)}
              >
                {allChecked ? 'Deselect All' : 'Select All'}
              </button>
            </header>

            <div className="role-permission-actions">
              {module.actions.map((action) => {
                const checked = Boolean(current[action]);
                return (
                  <label key={action} className={checked ? 'is-checked' : ''}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={protectedRole}
                      onChange={() => onToggle(module.key, action)}
                    />
                    <span>{permissionActionLabel(action, module.key)}</span>
                  </label>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  </section>
);
