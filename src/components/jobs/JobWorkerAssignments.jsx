import { appConfirm } from '../common/appDialogs';
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, UsersRound } from 'lucide-react';
import { payrollService } from '../../services/payroll.service';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

export const JobWorkerAssignments = ({ jobId, staff = [], onChanged, focusToken = 0 }) => {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'jobs.edit');
  const [rows, setRows] = useState([]);
  const staffSelectRef = useRef(null);
  useEffect(() => {
    if (focusToken > 0) staffSelectRef.current?.focus();
  }, [focusToken]);
  const [staffId, setStaffId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await payrollService.getJobTimerAssignments(jobId);
      setRows(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(err?.message || 'Cannot load assigned mechanics.');
    }
  };

  useEffect(() => { if (jobId) load(); }, [jobId]);

  const add = async (event) => {
    event.preventDefault();
    if (!staffId || saving) return;
    setSaving(true);
    setError('');
    try {
      await payrollService.createJobTimerAssignment(jobId, staffId);
      setStaffId('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Cannot assign mechanic.');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!await appConfirm('Unassign this worker from the Job Card?')) return;
    setSaving(true);
    setError('');
    try {
      await payrollService.deleteJobTimerAssignment(id);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Cannot unassign mechanic.');
    } finally { setSaving(false); }
  };

  return (
    <section className="job-payroll-assignments">
      <header className="job-payroll-assignments__head">
        <div>
          <UsersRound size={18} />
          <div>
            <strong>Internal Staff Assignments</strong>
            <span>Assign mechanics for this Job Card</span>
          </div>
        </div>
        <strong>{rows.length} assigned</strong>
      </header>

      <div className="job-worker-assignment-list">
        {rows.map((row) => (
          <div key={row.id} className="job-worker-assignment-item">
            <div><strong>{row.staffName}</strong><span>{row.role || 'Workshop staff'}</span></div>
            {canEdit && (
              <button type="button" onClick={() => remove(row.id)} disabled={saving}
                aria-label={`Unassign ${row.staffName}`}><Trash2 size={15}/> Remove</button>
            )}
          </div>
        ))}
        {!rows.length && <div className="job-payroll-empty">No staff assigned yet.</div>}
      </div>

      {canEdit && (
        <form className="job-worker-assignment-add" onSubmit={add}>
          <label>
            Add staff member
            <select ref={staffSelectRef} required value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Select existing staff member</option>
              {staff.filter((person) => !rows.some((row) => String(row.staffId) === String(person.id))).map((person) => (
                <option key={person.id} value={person.id}>{person.name} · {person.designation || 'Worker'}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving || !staffId}><Plus size={15}/>{saving ? 'Adding…' : 'Assign Worker'}</button>
        </form>
      )}
      {error && <p className="job-payroll-error" role="alert">{error}</p>}
    </section>
  );
};
