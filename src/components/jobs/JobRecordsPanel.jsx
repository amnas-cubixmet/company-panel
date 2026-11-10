
import { Car, ChevronRight, User, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jobInvoiceFinance, jobInvoiceGST } from '../../utils/jobGstFinance';
import { jobDisplayLabel, statusClass } from './jobs.utils';
import { JobCustomerContactActions } from './JobCustomerContactActions';

export const JobRecordsPanel = ({
  jobs,
  totalCount = jobs.length,
  loading,
  status,
  searchTerm = '',
  hasActiveFilters = false,
  invoiceByJob = new Map(),
  showBilling = false,
  invoicesLoading = false,
  canViewGST = false,
  canViewPayments = false,
  canCollectPayments = false,
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
                {showBilling && <th>GST / Invoice</th>}
                {showBilling && <th>Payment / Finance</th>}
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const invoice = invoiceByJob.get(String(job.id));
                const finance = jobInvoiceFinance(invoice);
                const gst = finance.posted ? jobInvoiceGST(invoice) : null;
                return <tr key={job.id}>
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
                  {showBilling && <td>
                    {invoicesLoading ? <span className="jobs-finance-muted">Loading invoice…</span> : invoice ? (
                      <div className="jobs-gst-finance-cell">
                        <Link to={'/invoices/' + encodeURIComponent(invoice.id)}>{invoice.number || 'Invoice'}</Link>
                        <small>{invoice.status || 'Draft'} · {invoice.invoiceType === 'gst'
                          ? gst ? 'GST ₹' + gst.tax.toFixed(2) : 'GST pending finalization'
                          : 'No GST'}</small>
                        {canViewGST && finance.gstrUrl &&
                          <Link to={finance.gstrUrl}>GSTR-1</Link>}
                      </div>
                    ) : <span className="jobs-finance-muted">Not invoiced</span>}
                  </td>}
                  {showBilling && <td>
                    {!invoice || invoicesLoading
                      ? <span className="jobs-finance-muted">—</span>
                      : <div className="jobs-gst-finance-cell">
                        <small>{finance.posted
                          ? finance.outstanding > 0 ? 'Payment due' : 'Paid'
                          : 'Invoice not finalized'}</small>
                        {canViewPayments && finance.posted &&
                          <strong>{finance.outstanding > 0 ? 'Due ₹' + finance.outstanding.toFixed(2) : 'Settled'}</strong>}
                        {canCollectPayments && finance.paymentUrl &&
                          <Link className="jobs-finance-receive" to={finance.paymentUrl}>Receive Payment</Link>}
                        {canViewPayments && finance.historyUrl &&
                          <Link to={finance.historyUrl}>Transactions</Link>}
                      </div>}
                  </td>}
                  <td><button type="button" className="jobs-table-open" onClick={() => onOpenJob(job.id)} aria-label={`Open ${jobDisplayLabel(job)}`}><ChevronRight size={17} /></button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="jobs-mobile-list">
          {jobs.map((job) => {
            const invoice = invoiceByJob.get(String(job.id));
            const finance = jobInvoiceFinance(invoice);
            const gst = finance.posted ? jobInvoiceGST(invoice) : null;
            return <article key={job.id} className="jobs-mobile-card">
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
              {showBilling && <div className="jobs-mobile-gst-finance">
                <div>
                  <span>Invoice / GST</span>
                  {invoice && !invoicesLoading
                    ? <><Link to={'/invoices/' + encodeURIComponent(invoice.id)}>{invoice.number || 'Invoice'}</Link>
                      <small>{finance.posted && gst ? 'GST ₹' + gst.tax.toFixed(2)
                        : invoice.invoiceType === 'gst' ? 'Draft / GST pending' : 'Non-GST invoice'}</small></>
                    : <strong>{invoicesLoading ? 'Loading…' : 'Not invoiced'}</strong>}
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{finance.posted ? finance.outstanding > 0 ? 'Due' : 'Paid' : 'Not finalized'}</strong>
                  {canViewPayments && finance.posted &&
                    <small>{finance.outstanding > 0 ? '₹' + finance.outstanding.toFixed(2) : 'Settled'}</small>}
                </div>
                <nav aria-label={'Financial links for ' + jobDisplayLabel(job)}>
                  {canViewGST && finance.gstrUrl && <Link to={finance.gstrUrl}>GSTR-1</Link>}
                  {canViewPayments && finance.historyUrl && <Link to={finance.historyUrl}>Transactions</Link>}
                  {canCollectPayments && finance.paymentUrl &&
                    <Link className="jobs-finance-receive" to={finance.paymentUrl}>Receive Payment</Link>}
                </nav>
              </div>}
              <div className="jobs-mobile-card-footer">
                <span>{job.createdDate || '—'}</span>
                <button className="jobs-mobile-view-job" type="button" onClick={() => onOpenJob(job.id)}
                  aria-label={`Open ${jobDisplayLabel(job)}`}>View Job <ChevronRight size={15} /></button>
              </div>
            </article>;
          })}
        </div>
      </>
    )}
  </section>
);
