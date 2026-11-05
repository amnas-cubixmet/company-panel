
import { Car, ChevronRight, User, Wrench } from 'lucide-react';
import { jobDisplayLabel, statusClass } from './jobs.utils';
import { JobCustomerContactActions } from './JobCustomerContactActions';

export const JobRecordsPanel = ({
  jobs,
  totalCount = jobs.length,
  loading,
  status,
  searchTerm = '',
  hasActiveFilters = false,
  onOpenJob,
}) => (
  <section className="jobs-records-panel">
    <header className="jobs-records-head">
      <div>
        <span>Job Records</span>
        <h2>{status === 'All' ? 'All Job Cards' : status}</h2>
      </div>
      <strong aria-live="polite">{totalCount} record{totalCount === 1 ? '' : 's'}</strong>
    </header>

    {loading ? (
      <div className="jobs-state">Loading job cards…</div>
    ) : jobs.length === 0 ? (
      <div className="jobs-state is-empty">
        {hasActiveFilters || searchTerm || status !== 'All' ? 'No jobs match these filters. Adjust a filter or reset to view all jobs.' : 'No Job Cards yet. Create your first Job Card to begin.'}
      </div>
    ) : (
      <>
        <div className="jobs-table-wrap">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job Card</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Technician</th>
                <th>Status</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <button className="jobs-table-job-link" type="button" onClick={() => onOpenJob(job.id)}>{jobDisplayLabel(job)}</button>
                    <span>{job.createdDate || job.serviceType || 'Workshop service'}</span>
                  </td>
                  <td>
                    <strong>{job.vehicleReg || 'No registration'}</strong>
                    <span>{job.vehicleInfo || 'Vehicle'}</span>
                  </td>
                  <td>
                    <strong>{job.customerName || 'Walk-in customer'}</strong>
                    <span>{job.customerPhone || '—'}</span>
                    <JobCustomerContactActions job={job} />
                  </td>
                  <td><strong>{job.assignedEmployeeName || 'Unassigned'}</strong></td>
                  <td>
                    <span className={`jobs-status-chip is-${statusClass(job.status)}`}>
                      {job.status || 'New'}
                    </span>
                    {job.inspection?.status === 'Skipped' && (
                      <span className="jobs-inspection-skip-tag" title={job.inspection.skipReason || 'Vehicle inspection skipped'}>Inspection skipped</span>
                    )}
                  </td>
                  <td><button type="button" className="jobs-table-open" onClick={() => onOpenJob(job.id)} aria-label={`Open ${jobDisplayLabel(job)}`}><ChevronRight size={17} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="jobs-mobile-list">
          {jobs.map((job) => (
            <article key={job.id} className="jobs-mobile-card">
              <div className="jobs-mobile-card-head">
                <div>
                  <strong>{jobDisplayLabel(job)}</strong>
                  <span>{job.vehicleReg || 'No registration'}</span>
                </div>
                <span className={`jobs-status-chip is-${statusClass(job.status)}`}>
                  {job.status || 'New'}
                </span>
              </div>

              {job.inspection?.status === 'Skipped' && (
                <span className="jobs-inspection-skip-tag" title={job.inspection.skipReason || 'Vehicle inspection skipped'}>Inspection skipped</span>
              )}
              <div className="jobs-mobile-card-meta">
                <span><Car size={12} />{job.vehicleInfo || 'Vehicle'}</span>
                <span><User size={12} />{job.customerName || 'Walk-in customer'}</span>
                <span><Wrench size={12} />{job.assignedEmployeeName || 'Unassigned'}</span>
              </div>

              <JobCustomerContactActions job={job} />
              <div className="jobs-mobile-card-footer">
                <span>{job.createdDate || '—'}</span>
                <button className="jobs-mobile-view-job" type="button" onClick={() => onOpenJob(job.id)}
                  aria-label={`Open ${jobDisplayLabel(job)}`}>View Job <ChevronRight size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      </>
    )}
  </section>
);
