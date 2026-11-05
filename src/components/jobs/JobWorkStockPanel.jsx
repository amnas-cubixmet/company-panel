import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, PackageCheck, PackagePlus, RefreshCw, Search } from 'lucide-react';
import { stockService } from '../../services/stock.service';
import { jobService } from '../../services/job.service';
import { appConfirm } from '../common/appDialogs';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
});
const num = (value) => Number(value || 0);
const available = item => Math.max(0, num(item.available ?? (num(item.onHand) - num(item.reserved))));

/** Stock entries are issued through Django's atomic Job.issue_part action.
 * Selecting/searching a part never deducts inventory.
 */
export function JobWorkStockPanel({ jobId, issuedParts = [], onChanged, focusSearchToken = 0 }) {
  const { user } = useAuth();
  const canView = hasPermission(user, 'stock.view');
  const canIssue = hasPermission(user, 'stock.edit') && hasPermission(user, 'jobs.edit');
  const [inventory, setInventory] = useState([]);
  const searchInputRef = useRef(null);
  useEffect(() => {
    if (focusSearchToken > 0 && canIssue) searchInputRef.current?.focus();
  }, [focusSearchToken, canIssue]);
  const [lookup, setLookup] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = async () => {
    if (!canView) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockService.getStockItems();
      setInventory(Array.isArray(result) ? result : result?.results || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Unable to load stock catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedId('');
    setLookup('');
    setQuantity('1');
    setSuccess('');
    refresh();
  }, [jobId, canView]);

  const matches = useMemo(() => {
    const term = lookup.trim().toLowerCase();
    if (!term) return [];
    return inventory.filter(item => [
      item.partName, item.name, item.sku, item.barcode, item.brand,
    ].some(value => String(value || '').toLowerCase().includes(term))).slice(0, 8);
  }, [inventory, lookup]);

  const selected = inventory.find(item => String(item.id) === String(selectedId));
  const stockQty = selected ? available(selected) : 0;
  const requested = Number(quantity);
  const validQty = Number.isFinite(requested) && requested > 0 &&
    requested <= stockQty && /^\d+(?:\.\d{1,2})?$/.test(quantity);

  const issue = async (event) => {
    event.preventDefault();
    if (!canIssue || busy) return;
    if (!selected || !validQty) {
      setError('Select a stock item and enter a quantity within available stock.');
      return;
    }
    const confirmed = await appConfirm(
      `Issue ${quantity} ${selected.unit || 'units'} of ${selected.partName || selected.name} to this Job Card? Stock will be deducted.`
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await jobService.issueJobStockPart(jobId, selected.id, requested);
      setSelectedId('');
      setLookup('');
      setQuantity('1');
      setSuccess('Stock issued to this Job Card. Inventory balance updated.');
      // The issue succeeded. A refresh failure must not make it appear as
      // though nothing was issued, otherwise users might issue it twice.
      const refreshed = await Promise.allSettled([stockService.getStockItems(), onChanged?.()]);
      if (refreshed[0].status === 'fulfilled') {
        const items = refreshed[0].value;
        setInventory(Array.isArray(items) ? items : items?.results || []);
      }
      if (refreshed.some(result => result.status === 'rejected')) {
        setSuccess('Stock issued successfully. Refresh this page to update the list.');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Stock issue failed. Check quantity and permissions.');
    } finally {
      setBusy(false);
    }
  };

  if (!canView) return null;

  return (
    <section className="job-work-stock-panel" aria-label="Add stock to job work">
      <header className="job-work-stock-header">
        <div className="job-work-stock-heading">
          <span className="job-work-stock-icon" aria-hidden="true"><PackagePlus size={18}/></span>
          <div>
            <h3>Stock & Parts Used</h3>
            <p>Find a part and issue it to the Job Card</p>
          </div>
        </div>
        <button type="button" className="job-work-stock-refresh" onClick={refresh} disabled={loading || busy}>
          <RefreshCw size={16} aria-hidden="true"/> {loading ? 'Loading…' : 'Refresh Stock'}
        </button>
      </header>

      {error && <p className="job-work-stock-error" role="alert">{error}</p>}
      {success && <p className="job-work-stock-success" role="status"><CheckCircle2 size={16} aria-hidden="true"/>{success}</p>}

      {canIssue && (
        <form className="job-work-stock-form" onSubmit={issue}>
          <div className="job-work-stock-search-wrap">
            <label htmlFor="job-work-stock-search">Find Stock Item</label>
            <div className="job-work-stock-search">
              <Search size={17} aria-hidden="true"/>
              <input ref={searchInputRef} id="job-work-stock-search" autoComplete="off" value={lookup}
                disabled={busy} placeholder="Search part name, SKU, barcode or brand"
                onChange={event => { setLookup(event.target.value); setSelectedId(''); setSuccess(''); }}/>
            </div>
            {lookup.trim() && !selected && (
              <div className="job-work-stock-results" aria-label="Matching stock items">
                {matches.length ? matches.map(item => (
                  <button type="button" key={item.id} disabled={busy}
                    onClick={() => { setSelectedId(String(item.id)); setLookup(item.partName || item.name || item.sku); setError(''); }}>
                    <span><strong>{item.partName || item.name}</strong>
                      <small>{item.sku || 'No SKU'} · {item.brand || 'Stock'}</small>
                    </span>
                    <span className={available(item) > 0 ? 'is-available' : 'is-empty'}>
                      {available(item)} {item.unit || 'units'} available
                    </span>
                  </button>
                )) : <p>No matching stock product. Add it on the Stock page first.</p>}
              </div>
            )}
          </div>

          {selected && (
            <div className="job-work-stock-selected" role="status">
              <PackageCheck size={18} aria-hidden="true"/>
              <div><strong>{selected.partName || selected.name}</strong>
                <span>SKU {selected.sku || '—'} · Rack {selected.location || '—'} · {money.format(selected.sellingPrice || 0)} / {selected.unit || 'unit'}</span>
              </div>
              <b>{stockQty} available</b>
            </div>
          )}

          <div className="job-work-stock-bottom">
            <label htmlFor="job-work-stock-quantity">Issue Quantity
              <input id="job-work-stock-quantity" type="number" inputMode="decimal"
                min="0.01" max={selected ? stockQty : undefined} step="0.01" value={quantity}
                disabled={busy || !selected} onChange={event => setQuantity(event.target.value)}/>
            </label>
            <div className="job-work-stock-amount">
              <span>Stock value</span>
              <strong>{money.format(selected ? requested * num(selected.sellingPrice) || 0 : 0)}</strong>
            </div>
            <button type="submit" className="job-work-stock-issue" disabled={busy || loading || !selected || !validQty}>
              <PackageCheck size={17} aria-hidden="true"/> {busy ? 'Issuing…' : 'Issue Stock to Job'}
            </button>
          </div>
          <p className="job-work-stock-note">Stock is deducted only after confirming Issue Stock.</p>
        </form>
      )}

      <div className="job-work-stock-history">
        <div className="job-work-stock-history-head">
          <h4>Issued Parts</h4><span>{issuedParts.length} records</span>
        </div>
        {issuedParts.length ? (
          <div className="job-work-stock-history-list">
            {issuedParts.map((part, index) => (
              <div className="job-work-stock-history-item" key={part.id || index}>
                <div><strong>{part.itemName || part.partName || part.name || 'Stock Item'}</strong>
                  <small>{part.sku || 'Stock'} · Qty {num(part.quantity ?? part.qty)} · {money.format(part.unit_price ?? part.unitPrice ?? part.sellingPrice ?? 0)} / unit</small>
                </div>
                <strong>{money.format(num(part.quantity ?? part.qty) * num(part.unit_price ?? part.unitPrice ?? part.sellingPrice))}</strong>
              </div>
            ))}
          </div>
        ) : <p className="job-work-stock-empty">No stock issued for this Job Card yet.</p>}
      </div>
    </section>
  );
}
