import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveModalSheet } from '../common/ResponsiveModalSheet';
import { jobService } from '../../services/job.service';
import { USE_MOCK_API } from '../../api/apiConfig';
import { JOB_FUEL_LEVELS, JOB_SERVICE_TYPES } from './jobOverviewOptions';

const fieldLabel = 'grid min-w-0 gap-1.5 text-sm font-semibold text-content';
const fieldInput = 'min-h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-base text-content';
const secondaryAction = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-content';

export function JobOverviewDetailsEditor({ job, canEditJob, canEditCustomer, canEditVehicle, onClose, onSaved }) {
  const [initial] = useState(() => ({
    serviceType: job.serviceType || 'General Service',
    odometer: String(job.kilometre ?? job.odometer ?? 0),
    fuel_level: job.fuelLevel ?? job.fuel_level ?? '',
  }));
  const [details, setDetails] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const formRef = useRef(null);
  const close = () => { if (!saving) onClose(); };
  const patch = Object.fromEntries(Object.entries(details).filter(([key, value]) => initial[key] !== value));
  const update = (name, value) => {
    setDetails(current => ({ ...current, [name]: value }));
    setFieldErrors(current => ({ ...current, [name]: '' }));
    setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!canEditJob || saving || !Object.keys(patch).length) return;
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const updated = await jobService.updateJob(job.id, USE_MOCK_API ? {
        ...patch,
        ...(patch.odometer !== undefined && { kilometre: Number(patch.odometer) }),
        ...(patch.fuel_level !== undefined && { fuelLevel: patch.fuel_level }),
      } : patch);
      onSaved(updated);
    } catch (cause) {
      const errors = cause?.fieldErrors || {};
      setFieldErrors(errors);
      setError(cause?.message || 'Could not save the Job Card details.');
      const firstInvalid = ['serviceType', 'odometer', 'fuel_level'].find(name => errors[name]);
      if (firstInvalid) requestAnimationFrame(() => formRef.current?.elements.namedItem(firstInvalid)?.focus());
    } finally {
      setSaving(false);
    }
  };
  const profileState = { returnToJob: job.id };
  return (
    <ResponsiveModalSheet isOpen onClose={close} title="Edit Customer & Vehicle" maxWidth="520px">
      <div className="grid gap-4">
        {canEditJob && (
          <form ref={formRef} className="grid gap-3" onSubmit={submit}>
            <label className={fieldLabel}>
              <span id="job-service-type-label">Service type</span>
              <select name="serviceType" aria-labelledby="job-service-type-label" className={fieldInput}
                value={details.serviceType} disabled={saving} aria-invalid={Boolean(fieldErrors.serviceType)}
                aria-describedby={fieldErrors.serviceType ? 'job-service-type-error' : undefined}
                onChange={event => update('serviceType', event.target.value)}>
                {JOB_SERVICE_TYPES.map(type => <option key={type}>{type}</option>)}
                {!JOB_SERVICE_TYPES.includes(initial.serviceType) && <option>{initial.serviceType}</option>}
              </select>
            </label>
            {fieldErrors.serviceType && <p id="job-service-type-error" className="text-sm text-danger">{fieldErrors.serviceType}</p>}
            <label className={fieldLabel}>
              KM reading
              <input name="odometer" className={fieldInput} type="number" min="0" max="2147483647" step="1"
                inputMode="numeric" required value={details.odometer} disabled={saving} aria-invalid={Boolean(fieldErrors.odometer)}
                aria-describedby={fieldErrors.odometer ? 'job-odometer-error' : undefined}
                onChange={event => update('odometer', event.target.value)}/>
            </label>
            {fieldErrors.odometer && <p id="job-odometer-error" className="text-sm text-danger">{fieldErrors.odometer}</p>}
            <label className={fieldLabel}>
              <span id="job-fuel-level-label">Fuel level</span>
              <select name="fuel_level" aria-labelledby="job-fuel-level-label" className={fieldInput}
                value={details.fuel_level} disabled={saving} aria-invalid={Boolean(fieldErrors.fuel_level)}
                aria-describedby={fieldErrors.fuel_level ? 'job-fuel-level-error' : undefined}
                onChange={event => update('fuel_level', event.target.value)}>
                <option value="">Not recorded</option>
                {JOB_FUEL_LEVELS.map(level => <option key={level}>{level}</option>)}
                {initial.fuel_level && !JOB_FUEL_LEVELS.includes(initial.fuel_level) &&
                  <option value={initial.fuel_level}>{initial.fuel_level}</option>}
              </select>
            </label>
            {fieldErrors.fuel_level && <p id="job-fuel-level-error" className="text-sm text-danger">{fieldErrors.fuel_level}</p>}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={secondaryAction} onClick={close} disabled={saving}>Cancel</button>
              <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                disabled={saving || !Object.keys(patch).length}>{saving ? 'Saving…' : 'Save Job Details'}</button>
            </div>
          </form>
        )}
        {(canEditCustomer || canEditVehicle) && <div className="grid gap-2 border-t border-line pt-3">
          <p className="text-sm text-muted">Profile changes apply to all Job Cards linked to that profile.</p>
          <div className="flex flex-wrap gap-2">
            {canEditCustomer && !saving && <Link className={secondaryAction} state={profileState}
              to={'/customers/' + encodeURIComponent(job.customerId) + '/edit'}>Edit Customer Profile</Link>}
            {canEditVehicle && !saving && <Link className={secondaryAction} state={profileState}
              to={'/vehicles/' + encodeURIComponent(job.vehicleId) + '/edit'}>Edit Vehicle Profile</Link>}
          </div>
        </div>}
      </div>
    </ResponsiveModalSheet>
  );
}
