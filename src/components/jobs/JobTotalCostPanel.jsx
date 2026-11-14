import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { jobService } from '../../services/job.service';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';
import '../../styles/job-cost-margin.css';

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(Number(value) || 0);

export function JobTotalCostPanel({
  jobId, refreshVersion = 0, refreshOnTab = '', customerServiceCharges = 0,
  billedTotal = null, netSellingValue = null, salesSource = 'none',
}) {
  const { user } = useAuth();
  const permitted = ['jobs.view', 'payroll.view', 'expenses.view', 'stock.view']
    .every((code) => hasPermission(user, code));
  const [costState, setCostState] = useState({ jobId: null, data: null });
  // Never show the previous Job Card's financial figures during navigation.
  const summary = costState.jobId === jobId ? costState.data : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasBill = billedTotal !== null && billedTotal !== undefined && Number.isFinite(Number(billedTotal));
  const hasNetSales = netSellingValue !== null && netSellingValue !== undefined
    && Number.isFinite(Number(netSellingValue));
  const incompleteCosts = Boolean(summary?.unallocatedDailyWages || summary?.unapprovedMechanicWork
    || summary?.partsAtCurrentCost);
  // This is a job-level indicative gross margin, not an accounting net profit.
  // Never compare GST-inclusive invoice grand total against GST-exclusive costs.
  const grossMargin = summary && hasNetSales && !incompleteCosts
    ? Number(netSellingValue) - Number(summary.totalCost || 0) : null;

  useEffect(() => {
    if (!jobId || !permitted) {
      setCostState({ jobId: null, data: null });
      setError('');
      setLoading(false);
      return undefined;
    }

    let active = true;
    let inFlight = false;
    let lastRequestAt = 0;

    const loadCosts = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      lastRequestAt = Date.now();
      setLoading(true);
      setError('');
      try {
        const data = await jobService.getJobCostSummary(jobId);
        if (active) setCostState({ jobId, data });
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.detail || err?.message || 'Unable to update job costs.');
          // Keep the latest successful figures visible during temporary outages.
        }
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };

    // Load immediately on Job change, entering the Work tab, or after
    // Mechanic / Outside Staff / Parts mutations update refreshVersion.
    void loadCosts();

    if (refreshOnTab !== 'work') {
      return () => { active = false; };
    }

    // Sync changes made by another worker/browser while this Work page
    // is visible. No network polling when the document is in the background.
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRequestAt < 3000) return;
      void loadCosts();
    };
    const intervalId = window.setInterval(syncWhenVisible, 30000);
    window.addEventListener('focus', syncWhenVisible);
    document.addEventListener('visibilitychange', syncWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncWhenVisible);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [jobId, refreshVersion, refreshOnTab, permitted]);

  return (
    <section className="job-total-cost-panel is-global" aria-label="Job Card total cost">
      <header className="job-total-cost-heading">
        <div>
          <h3><Calculator size={18} aria-hidden="true" /> Total Cost</h3>
          <p>Workshop-only cost, customer bill and indicative margin. These figures never appear on the customer invoice.</p>
        </div>
      </header>

      {!permitted ? (
        <p className="job-total-cost-notice">
          Cost details require Jobs View, Payroll View, Expenses View and Stock View permissions.
        </p>
      ) : error && !summary ? (
        <p role="alert" className="job-total-cost-notice">{error}</p>
      ) : (
        <>
          <div className="job-total-cost-grid" aria-busy={loading}>
            {[
              { label: 'Total Cost', value: summary?.totalCost, desc: 'Direct recorded cost', primary: true },
              { label: 'Mechanic Cost', value: summary?.mechanicCost, desc: 'Approved worker charges' },
              { label: 'Outside Staff Cost', value: summary?.outsideStaffCost, desc: 'Agreed worker charges' },
              { label: 'Parts Cost', value: summary?.partsCost, desc: 'Issued stock + outside purchases' }
            ].map(({ label, value, desc, primary }) => (
              <div key={label} className={primary ? 'job-total-cost-card is-primary' : 'job-total-cost-card'}>
                <span>{label}</span>
                <strong>{summary ? money(value) : loading ? 'Loading…' : '—'}</strong>
                <small>{desc}</small>
              </div>
            ))}
          </div>
          <div className="job-total-cost-grid job-total-finance-grid" aria-label="Internal billing and margin">
            <div className="job-total-cost-card">
              <span>{salesSource === 'final_invoice' ? 'Total Invoice Bill'
                : salesSource === 'draft_invoice' ? 'Draft Invoice Total' : 'Estimated Bill'}</span>
              <strong>{hasBill ? money(billedTotal) : 'Not invoiced'}</strong>
              <small>Includes GST when applicable</small>
            </div>
            <div className="job-total-cost-card">
              <span>Customer Selling (before GST)</span>
              <strong>{hasNetSales ? money(netSellingValue) : 'Not available'}</strong>
              <small>{salesSource === 'estimate' ? 'Estimate only, not invoiced' : 'Tax-exclusive value'}</small>
            </div>
            <div className="job-total-cost-card is-margin">
              <span>Indicative Gross Margin</span>
              <strong>{grossMargin !== null ? money(grossMargin) : 'Not ready'}</strong>
              <small>{grossMargin === null
                ? incompleteCosts ? 'Direct cost records incomplete' : 'A verified selling figure is required'
                : salesSource === 'final_invoice' ? 'Excludes overhead and unallocated wages'
                  : 'Provisional; bill not yet finalized'}</small>
            </div>
          </div>
          {refreshOnTab === 'work' && (
            <div className="job-total-customer-service" aria-label="Recorded customer service charges">
              <div>
                <strong>Customer Service Charges</strong>
                <small>Added services selling value — not included in Total Cost, invoice or payment.</small>
              </div>
              <strong>{money(customerServiceCharges)}</strong>
            </div>
          )}
          {!!summary && (
            <div className="job-total-cost-footnotes">
              {Number(summary.outsidePartsCost || 0) > 0 && (
                <p>Includes outside-shop parts: <strong>{money(summary.outsidePartsCost)}</strong> (already counted in Parts Cost).</p>
              )}
              {Number(summary.outsidePending || 0) > 0 && (
                <p>Outside Staff payment pending: <strong>{money(summary.outsidePending)}</strong> (already included in total).</p>
              )}
              {(summary.unallocatedDailyWages || summary.unapprovedMechanicWork) && (
                <p>Daily-wage mechanic cost may not be allocated to this Job Card; unapproved work is excluded. Total is not a full profit calculation.</p>
              )}
              {summary.partsAtCurrentCost && (
                <p>Some older stock issues have no saved cost rate; current stock purchase prices were used as estimates.</p>
              )}
              <p>{summary.note}</p>
              {error && <p role="alert">{error}</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
