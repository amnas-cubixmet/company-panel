
import { Activity, Car, PackageSearch } from 'lucide-react';
import { dashboardText } from './dashboard.utils';
import { jobWorkflowProgress } from './jobWorkflowProgress';

export const ActiveRepairPanel = ({ activeRepair, stockAlerts, onOpenJob, onReviewStock, canViewStock = false }) => {
  const progress = jobWorkflowProgress(activeRepair);
  return (
  <aside className="repair-pane">
    <button
      type="button"
      className="active-repair-card active-repair-clickable"
      onClick={onOpenJob}
      aria-label="Open active repair job"
    >
      <div className="vehicle-visual"><Car size={52} strokeWidth={1.1} /></div>

      <div className="active-repair-main">
        <div>
          <strong>{dashboardText(activeRepair?.vehicle, 'Vehicle')}</strong>
          <small>{dashboardText(activeRepair?.jobNumber || activeRepair?.id)}</small>
        </div>
        <span className="status-pill is-info">{dashboardText(activeRepair?.status, 'Status unavailable')}</span>
      </div>

      <div className="repair-meta">
        <div><small>Customer</small><strong>{dashboardText(activeRepair?.customer)}</strong></div>
        <div><small>Mechanic</small><strong>{dashboardText(activeRepair?.mechanic, 'Unassigned')}</strong></div>
      </div>

      <div className="overall-progress">
        <div className="overall-progress-heading">
          <span>Job Workflow Progress</span>
          <strong>{progress ? `${progress.percentage}%` : '—'}</strong>
        </div>
        <div className="progress-track" role="progressbar"
          aria-label="Completed job workflow stages"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={progress?.percentage ?? 0}
          aria-valuetext={progress
            ? `${progress.completed} of ${progress.total} stages complete`
            : 'Workflow progress not yet available'}>
          <span style={{ width: `${progress?.percentage ?? 0}%` }} />
        </div>
        <small className="overall-progress-caption">
          {progress
            ? `${progress.completed} of ${progress.total} job stages completed`
            : 'No job workflow progress available'}
        </small>
      </div>

      <div className="active-repair-open-hint">
        <span>Open Job Card</span>
        
      </div>
    </button>

    {canViewStock && <div className="insights-card">
      <div className="insights-title"><Activity size={13} /><strong>Smart Insights</strong></div>
      <div className="insight-list">
        {(stockAlerts || []).slice(0, 2).map((alert) => (
          <button key={alert.id} type="button" className="insight-item" onClick={onReviewStock}>
            <PackageSearch size={13} className={alert.priority === 'critical' ? 'danger-icon' : 'warning-icon'} />
            <span>
              <strong>{dashboardText(alert.partName)}</strong>
              <small>{dashboardText(alert.message)}. Stock {dashboardText(alert.currentStock, '0')}.</small>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="dashboard-button is-primary full-width" onClick={onReviewStock}>Review Stock</button>
    </div>}
  </aside>
  );
};
