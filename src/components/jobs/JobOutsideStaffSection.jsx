import { useEffect, useState } from 'react';
import { HardHat, Plus, X } from 'lucide-react';
import { OutsideLabourPanel } from './OutsideLabourPanel';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

/**
 * Add external workers to a specific Job Card without creating employees.
 * Reuses Outside Labour's existing company-scoped Expenses APIs and payment rules.
 */
export function JobOutsideStaffSection({ jobId, onChanged, quickAddToken = 0 }) {
  const { user } = useAuth();
  const canView = hasPermission(user, 'expenses.view');
  const canCreate = hasPermission(user, 'expenses.create');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (quickAddToken > 0 && canView && canCreate) setFormOpen(true);
  }, [quickAddToken, canView, canCreate]);

  const addStaff = () => {
    if (!canView || !canCreate) return;
    if (formOpen) {
      setFormOpen(false);
    } else {
      setFormOpen(true);
    }
  };

  return (
    <section className="job-outside-staff" aria-label="Outside Staff">
      <header className="job-outside-staff-head">
        <span className="job-outside-staff-icon" aria-hidden="true"><HardHat size={18}/></span>
        <div className="job-outside-staff-heading">
          <h3>Outside Staff</h3>
          
        </div>
        <div className="job-outside-staff-actions">
          {canView && canCreate && (
            <button
              type="button"
              className="job-outside-staff-add"
              aria-expanded={formOpen}
              onClick={addStaff}
            >
              {formOpen ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              {formOpen ? 'Cancel' : 'Add Outside Staff'}
            </button>
          )}
        </div>
      </header>
      {!canView && (
        <p className="job-outside-staff-permission" role="status">
          Expenses View permission is required to see outside staff.
        </p>
      )}
      {canView && !canCreate && (
        <p className="job-outside-staff-permission" role="status">
          Expenses Create permission is required to add outside staff.
        </p>
      )}
      {canView && (
        <div className="job-outside-staff-content">
          <OutsideLabourPanel
            jobId={jobId}
            onChanged={onChanged}
            formOpen={formOpen}
            onFormOpenChange={setFormOpen}
            hideToolbar
            closeAfterSave
            compactJobMode
            showRecordsWhileEditing
          />
        </div>
      )}
    </section>
  );
}
