
import { dashboardText, repairStages, statusClass } from './dashboard.utils';

export const JobDetailPanel = ({ selectedBooking, jobProgress, advisorName, onViewJob }) => (
  <div className="job-detail-pane">
    {selectedBooking ? (
      <div className="job-detail">
        <div className="job-detail-head">
          <div>
            <div className="job-id-row">
              <strong>{dashboardText(selectedBooking.id)}</strong>
              <span className={`status-pill ${statusClass(dashboardText(selectedBooking.status, 'Pending'))}`}>{dashboardText(selectedBooking.status, 'Pending')}</span>
            </div>
            <span>{dashboardText(selectedBooking.vehicle)}</span>
          </div>
          <button type="button" className="text-link" onClick={onViewJob}>View Job</button>
        </div>

        <div className="job-meta-grid">
          <div><small>Customer</small><strong>{dashboardText(selectedBooking.customer)}</strong></div>
          <div><small>Service</small><strong>{dashboardText(selectedBooking.service, 'Not specified')}</strong></div>
          {selectedBooking.time && dashboardText(selectedBooking.time) !== 'Walk-in' &&
            <div><small>Booking</small><strong>{dashboardText(selectedBooking.time)}</strong></div>}
        </div>

        <details className="dashboard-stages-disclosure">
          <summary>Workshop Job Stages <span>View counts</span></summary>
          <div className="progress-card">
            <div className="progress-title-row"><strong>Stage Overview</strong><span>Job counts by stage</span></div>
            <div className="progress-grid">
              {repairStages.map((stage, index) => (
                <div key={stage.key} className="progress-stage">
                  <span className="progress-circle" aria-hidden="true">{index + 1}</span>
                  <small>{stage.label}</small>
                  <strong>{jobProgress?.[stage.key] ?? 0} jobs</strong>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    ) : (
      <div className="empty-job">No booking selected</div>
    )}
  </div>
);
