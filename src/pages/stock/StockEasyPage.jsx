import { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, History, PackageMinus, PackagePlus, Plus, RefreshCw, Search, ShoppingCart, Wrench } from 'lucide-react';
import { ResponsiveModalSheet } from '../../components/common/ResponsiveModalSheet';
import { stockCatalogService } from '../../services/stockCatalog.service';
import '../../styles/stock-easy.css';
import '../../styles/stock-form-polish.css';

const cash = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(value) || 0);
const number = (value) => Number(value) || 0;
const list = (result) => Array.isArray(result) ? result : (result?.results || []);
const initialPart = { partName: '', sku: '', brand: '', category: '', unit: 'Piece',
  costPrice: '', sellingPrice: '', minimumStock: '5', location: '' };
const initialMove = { mode: 'in', itemId: '', quantity: '1', invoiceNo: '', notes: '', costPrice: '', sellingPrice: '', priceMode: '' };

function stockState(item) {
  const available = number(item.available ?? (number(item.onHand) - number(item.reserved)));
  if (available <= 0) return { label: 'Out of stock', tone: 'out' };
  if (available <= number(item.minimumStock)) return { label: 'Low stock', tone: 'low' };
  return { label: 'Available', tone: 'ok' };
}

export default function StockEasyPage() {
  const [items, setItems] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [partOpen, setPartOpen] = useState(false);
  const [part, setPart] = useState(initialPart);
  const [partLookup, setPartLookup] = useState('');
  const [partMode, setPartMode] = useState('find');
  const [moveLookup, setMoveLookup] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const [move, setMove] = useState(initialMove);

  const reload = async () => {
    setLoading(true);
    try {
      const loaded = await stockCatalogService.getItems();
      setItems(list(loaded));
      const [stats, movements, groups] = await Promise.allSettled([
        stockCatalogService.getStockDashboard(),
        stockCatalogService.getLedger(),
        stockCatalogService.getCategories(),
      ]);
      setDashboard(stats.status === 'fulfilled' ? stats.value : null);
      setLedger(movements.status === 'fulfilled' ? list(movements.value) : []);
      setCategories(groups.status === 'fulfilled' ? list(groups.value) : []);
      setError('');
    } catch (exception) {
      setError(exception?.message || 'Could not load stock. Check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const search = [item.partName, item.name, item.sku, item.barcode, item.brand]
      .join(' ').toLowerCase().includes(query.trim().toLowerCase());
    return search && (filter === 'all' || stockState(item).tone === filter);
  }), [items, query, filter]);

  const lowCount = items.filter((item) => stockState(item).tone === 'low').length;
  const outCount = items.filter((item) => stockState(item).tone === 'out').length;
  const totalValue = dashboard?.totalValue ?? items.reduce(
    (total, item) => total + number(item.onHand) * number(item.costPrice), 0
  );
  const selected = items.find((item) => String(item.id) === String(move.itemId));
  const selectedAvailable = selected ? number(selected.available ?? (number(selected.onHand) - number(selected.reserved))) : 0;
  const matchingParts = useMemo(() => items.filter((item) =>
    [item.partName, item.sku, item.barcode, item.brand].join(' ').toLowerCase().includes(partLookup.trim().toLowerCase())
  ).slice(0, 8), [items, partLookup]);
  const receiptMatches = useMemo(() => items.filter((item) =>
    [item.partName, item.sku, item.barcode, item.brand].join(' ').toLowerCase().includes(moveLookup.trim().toLowerCase())
  ).slice(0, 12), [items, moveLookup]);
  const receiptPricesDiffer = selected && move.mode === 'in' &&
    (Number(move.costPrice) !== number(selected.costPrice) || Number(move.sellingPrice) !== number(selected.sellingPrice));
  const selectMovePart = (item) => {
    setMove((current) => ({ ...current, itemId: String(item.id),
      costPrice: String(item.costPrice ?? '0'), sellingPrice: String(item.sellingPrice ?? '0'), priceMode: '' }));
    setMoveLookup(item.partName || item.name || item.sku || '');
    setError('');
  };
  const openPartDialog = (lookup = '') => {
    setError(''); setPart(initialPart); setPartMode('find'); setPartLookup(lookup); setPartOpen(true);
  };

  const beginMove = (mode, itemId = '', partItem = null) => {
    setError('');
    const item = partItem || items.find((row) => String(row.id) === String(itemId));
    setMove({ ...initialMove, mode, itemId: String(itemId || ''),
      costPrice: item ? String(item.costPrice ?? 0) : '',
      sellingPrice: item ? String(item.sellingPrice ?? 0) : '' });
    setMoveLookup(item?.partName || item?.name || '');
    setMoveOpen(true);
  };

  const savePart = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!part.partName.trim() || !part.sku.trim() ||
        part.costPrice === '' || part.sellingPrice === '' ||
        !Number.isFinite(Number(part.costPrice)) || Number(part.costPrice) < 0 ||
        !Number.isFinite(Number(part.sellingPrice)) || Number(part.sellingPrice) < 0) {
      setError('Enter a part name, SKU, valid purchase cost and selling price.'); return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await stockCatalogService.createItem({
        ...part, onHand: 0, reserved: 0, reorderLevel: number(part.minimumStock),
        costPrice: number(part.costPrice), sellingPrice: number(part.sellingPrice),
        minimumStock: number(part.minimumStock),
      });
      setPartOpen(false);
      setPart(initialPart);
      setPartLookup('');
      setPartMode('find');
      setSuccess('Part created. Enter quantity and confirm receipt to add stock.');
      await reload();
      if (created?.id) beginMove('in', created.id, created);
    } catch (exception) {
      setError(exception?.message || 'Unable to add part.');
    } finally { setSaving(false); }
  };

  const saveMovement = async (event) => {
    event.preventDefault();
    if (saving) return;
    const quantity = Number(move.quantity);
    if (!selected || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Select a part and enter a valid quantity.'); return;
    }
    if (move.mode === 'out' && quantity > selectedAvailable) {
      setError('Not enough available stock for this issue.'); return;
    }
    if (move.mode === 'in') {
      if (move.costPrice === '' || move.sellingPrice === '' ||
          ![move.costPrice, move.sellingPrice].every((value) =>
            Number.isFinite(Number(value)) && Number(value) >= 0 &&
            /^\d+(\.\d{1,2})?$/.test(String(value)))) {
        setError('Enter valid purchase cost and selling price (maximum 2 decimals).'); return;
      }
      if (receiptPricesDiffer && !['keep_existing', 'apply_new'].includes(move.priceMode)) {
        setError('Choose whether old stock and new stock should use the same prices.'); return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        itemId: selected.id, quantity: move.quantity,
        notes: move.notes.trim(),
        ...(move.mode === 'in' ? { invoiceNo: move.invoiceNo.trim(),
          costPrice: move.costPrice, sellingPrice: move.sellingPrice,
          priceMode: receiptPricesDiffer ? move.priceMode : 'keep_existing' } : {}),
      };
      if (move.mode === 'in') await stockCatalogService.stockIn(payload);
      else await stockCatalogService.stockOut(payload);
      setMoveOpen(false);
      setMove(initialMove);
      setSuccess(move.mode === 'in' ? 'Stock received successfully.' : 'Internal use recorded.');
      await reload();
    } catch (exception) {
      setError(exception?.message || 'Unable to save stock movement.');
    } finally { setSaving(false); }
  };

  return (
    <div className="cg-easy-stock">
      <header className="cg-easy-head">
        <div>
          <h1>Stock</h1>
          <p>Find parts, receive stock and track what your workshop uses.</p>
        </div>
        <div className="cg-easy-actions">
          <button type="button" className="cg-easy-secondary" onClick={reload} disabled={loading}><RefreshCw size={16}/> Refresh</button>
          <button type="button" className="cg-easy-primary" onClick={() => openPartDialog()}><Plus size={16}/> Add New Part</button>
        </div>
      </header>

      {error && !partOpen && !moveOpen && <div className="cg-easy-alert" role="alert">{error}</div>}
      {success && <div className="cg-easy-success" role="status">{success}<button type="button" onClick={() => setSuccess('')}>Dismiss</button></div>}

      <section className="cg-easy-metrics" aria-label="Inventory summary">
        {[
          { label: 'Total parts', value: dashboard?.totalItems ?? items.length, icon: Boxes },
          { label: 'Stock value', value: cash(totalValue), icon: ShoppingCart },
          { label: 'Low stock', value: dashboard?.lowStock ?? lowCount, icon: AlertTriangle },
          { label: 'Out of stock', value: dashboard?.outOfStock ?? outCount, icon: PackageMinus },
        ].map(({ label, value, icon: Icon }) => (
          <article className="cg-easy-metric" key={label}>
            <div><span>{label}</span><strong>{loading ? '—' : value}</strong></div><Icon size={19}/>
          </article>
        ))}
      </section>

      <section className="cg-easy-shortcuts" aria-label="Quick actions">
        <button type="button" onClick={() => beginMove('in')}><PackagePlus size={19}/><span>Receive Stock</span></button>
        <button type="button" onClick={() => beginMove('out')}><PackageMinus size={19}/><span>Internal Use</span></button>
        <Link to="/jobs"><Wrench size={19}/><span>Job Card Parts</span></Link>
        <a href="#stock-history"><History size={19}/><span>Stock History</span></a>
      </section>

      <section className="cg-easy-panel">
        <div className="cg-easy-panel-header">
          <div><h2>Parts & Products</h2><p>Choose a part to receive stock. For vehicle jobs, issue parts from the Job Card.</p></div>
        </div>
        <div className="cg-easy-filters">
          <label className="cg-easy-search"><Search size={18}/><input aria-label="Search stock" placeholder="Search part name, SKU, barcode or brand" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
          <div className="cg-easy-filter-buttons" aria-label="Stock status filter">
            {[['all', 'All'], ['low', 'Low Stock'], ['out', 'Out of Stock']].map(([value, label]) => (
              <button key={value} className={filter === value ? 'is-active' : ''} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="cg-easy-empty">Loading stock...</div>
          : filtered.length === 0 ? <div className="cg-easy-empty">No matching parts. <button type="button" className="cg-easy-inline-add" onClick={() => openPartDialog(query)}><Plus size={15}/> Add New Part</button></div>
          : (
            <div className="cg-easy-table-wrap">
              <table className="cg-easy-table">
                <thead><tr><th>Part</th><th>Available</th><th>Cost</th><th>Selling</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{filtered.map((item) => {
                  const state = stockState(item);
                  return <tr key={item.id}>
                    <td data-label="Part"><strong>{item.partName || item.name}</strong><small>{item.sku}{item.brand ? ' · ' + item.brand : ''}</small></td>
                    <td data-label="Available">{number(item.available ?? (number(item.onHand) - number(item.reserved)))} {item.unit || 'PCS'}</td>
                    <td data-label="Cost">{cash(item.costPrice)}</td>
                    <td data-label="Selling">{cash(item.sellingPrice)}</td>
                    <td data-label="Status"><span className={'cg-easy-status is-' + state.tone}>{state.label}</span></td>
                    <td data-label="Action"><button type="button" onClick={() => beginMove('in', item.id)}>Receive</button></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        <footer className="cg-easy-footer"><span>{filtered.length} parts shown</span></footer>
      </section>

      <section className="cg-easy-bottom" id="stock-history">
        <div className="cg-easy-panel-header"><div><h2>Recent movements</h2><p>Received and issued stock history</p></div></div>
        <div className="cg-easy-history">{ledger.length ? ledger.slice(0, 5).map((entry) => (
          <div key={entry.id} className="cg-easy-history-row"><div><strong>{entry.partName || entry.itemName || 'Stock Item'}</strong><small>{entry.type || entry.movement_type || 'Movement'}</small></div><b>{number(entry.quantity ?? entry.qty) > 0 ? '+' : ''}{number(entry.quantity ?? entry.qty)}</b></div>
        )) : <p>No stock movements yet.</p>}</div>
      </section>

      <ResponsiveModalSheet isOpen={partOpen} onClose={() => !saving && setPartOpen(false)} title="Add New Part" maxWidth="600px">
        {partMode === 'find' ? (
          <div className="cg-easy-form">
            <p className="cg-easy-hint">Search the product catalogue first. Select an existing part to receive stock without creating a duplicate.</p>
            <label>Search part name / SKU / barcode
              <div className="cg-easy-picker-search"><Search size={17}/><input autoFocus placeholder="Search existing products..." value={partLookup} onChange={(event) => setPartLookup(event.target.value)} /></div>
            </label>
            <div className="cg-easy-pick-list">
              {matchingParts.length ? matchingParts.map((item) => (
                <button key={item.id} type="button" onClick={() => { setPartOpen(false); beginMove('in', item.id, item); }}>
                  <span><strong>{item.partName || item.name}</strong><small>{item.sku || 'No SKU'} · {item.available} available</small></span>
                  <span>Receive </span>
                </button>
              )) : <p className="cg-easy-hint">No existing products matched your search.</p>}
            </div>
            <button type="button" className="cg-easy-new-product" onClick={() => {
              const exists = matchingParts.some((item) =>
                (item.partName || item.name || '').toLowerCase() === partLookup.trim().toLowerCase());
              if (exists) { setError('This part already exists. Select it from the list above.'); return; }
              setError(''); setPart({ ...initialPart, partName: partLookup.trim() }); setPartMode('new');
            }}><Plus size={17}/> Add as New Product</button>
            {error && <p className="cg-easy-alert" role="alert">{error}</p>}
          </div>
        ) : (
          <form className="cg-easy-form" onSubmit={savePart}>
            <button type="button" className="cg-easy-back-picker" onClick={() => { setPartMode('find'); setError(''); }}>← Search Existing Products</button>
            {error && <p className="cg-easy-alert" role="alert">{error}</p>}
            <label>Part name *<input required value={part.partName} onChange={(e) => setPart({ ...part, partName: e.target.value })}/></label>
            <label>SKU / Part number *<input required value={part.sku} onChange={(e) => setPart({ ...part, sku: e.target.value })}/></label>
            <div className="cg-easy-fields"><label>Brand<input value={part.brand} onChange={(e) => setPart({ ...part, brand: e.target.value })}/></label>
              <label>Unit<select value={part.unit} onChange={(e) => setPart({ ...part, unit: e.target.value })}>{['Piece', 'Set', 'Pair', 'Litre', 'Can', 'Box'].map((x) => <option key={x}>{x}</option>)}</select></label></div>
            <label>Category<select value={part.category} onChange={(e) => setPart({ ...part, category: e.target.value })}><option value="">Uncategorized</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <div className="cg-easy-fields">
              <label>Purchase Cost / Unit (₹) *<input required type="number" min="0" step="0.01" value={part.costPrice} onChange={(e) => setPart({ ...part, costPrice: e.target.value })}/></label>
              <label>Selling Price / Unit (₹) *<input required type="number" min="0" step="0.01" value={part.sellingPrice} onChange={(e) => setPart({ ...part, sellingPrice: e.target.value })}/></label>
            </div>
            <div className="cg-easy-fields"><label>Minimum stock<input type="number" min="0" step="0.01" value={part.minimumStock} onChange={(e) => setPart({ ...part, minimumStock: e.target.value })}/></label>
              <label>Rack / location<input value={part.location} onChange={(e) => setPart({ ...part, location: e.target.value })}/></label></div>
            <p className="cg-easy-hint">Save the product with zero stock. The Receive Stock form opens next to enter the initial quantity.</p>
            <div className="cg-easy-form-actions"><button type="button" onClick={() => setPartOpen(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Product & Receive Stock'}</button></div>
          </form>
        )}
      </ResponsiveModalSheet>

      <ResponsiveModalSheet isOpen={moveOpen} onClose={() => !saving && setMoveOpen(false)} title={move.mode === 'in' ? 'Receive Stock' : 'Internal Use — Stock Out'} maxWidth="590px">
        <form className="cg-easy-form" onSubmit={saveMovement}>
          {error && <p className="cg-easy-alert" role="alert">{error}</p>}
          {move.mode === 'out' && <p className="cg-easy-hint">For customer vehicle repairs, issue stock on the Job Card Parts page instead. This action records internal workshop consumption only.</p>}
          <label>Search Part / Product *
            <div className="cg-easy-picker-search"><Search size={17}/><input placeholder="Search by part name, SKU, barcode or brand" value={moveLookup} onChange={(event) => { setMoveLookup(event.target.value); if(selected) setMove({ ...move, itemId: '', priceMode: '' }); }} /></div>
          </label>
          {(!selected || !moveLookup || ![selected.partName, selected.name].includes(moveLookup)) && (
            <div className="cg-easy-pick-list">
              {receiptMatches.map((item) => (
                <button key={item.id} type="button" onClick={() => selectMovePart(item)}>
                  <span><strong>{item.partName || item.name}</strong><small>{item.sku || 'No SKU'} · {item.available} available</small></span>
                  <span>Select </span>
                </button>
              ))}
              {!receiptMatches.length && <p className="cg-easy-hint">No part found. Add the product first.</p>}
            </div>
          )}
          {selected ? <div className="cg-easy-selected-product">
            <strong><PackagePlus size={16}/> {selected.partName || selected.name}</strong>
            <span>Old stock: {number(selected.onHand)} {selected.unit || 'PCS'} · Purchase {cash(selected.costPrice)} · Selling {cash(selected.sellingPrice)}</span>
            <button type="button" onClick={() => { setMove({ ...move, itemId: '', priceMode: '' }); setMoveLookup(''); }}>Change</button>
          </div> : <button type="button" className="cg-easy-new-product" onClick={() => { setMoveOpen(false); openPartDialog(moveLookup); }}><Plus size={16}/> Add New Product</button>}
          <label>Quantity *<input required type="number" min="0.01" step="0.01" value={move.quantity} onChange={(e) => setMove({ ...move, quantity: e.target.value })}/></label>
          {move.mode === 'in' && selected && (
            <>
              <div className="cg-easy-fields">
                <label>New Purchase Cost / Unit (₹) *<input required type="number" min="0" step="0.01" value={move.costPrice} onChange={(e) => setMove({ ...move, costPrice: e.target.value, priceMode: '' })}/></label>
                <label>New Selling Price / Unit (₹) *<input required type="number" min="0" step="0.01" value={move.sellingPrice} onChange={(e) => setMove({ ...move, sellingPrice: e.target.value, priceMode: '' })}/></label>
              </div>
              {receiptPricesDiffer && (
                <fieldset className="cg-easy-price-choice">
                  <legend>Use the same prices for old stock and new stock? *</legend>
                  <p>Existing: Purchase {cash(selected.costPrice)}, Selling {cash(selected.sellingPrice)}. New: Purchase {cash(move.costPrice)}, Selling {cash(move.sellingPrice)}.</p>
                  <label className={move.priceMode === 'apply_new' ? 'is-checked' : ''}>
                    <input type="radio" name="receipt-price-choice" required checked={move.priceMode === 'apply_new'} onChange={() => setMove({ ...move, priceMode: 'apply_new' })} />
                    <span><strong>Yes — Apply new prices to all stock</strong><small>Update the product catalogue purchase cost and selling price for old and new quantities.</small></span>
                  </label>
                  <label className={move.priceMode === 'keep_existing' ? 'is-checked' : ''}>
                    <input type="radio" name="receipt-price-choice" checked={move.priceMode === 'keep_existing'} onChange={() => setMove({ ...move, priceMode: 'keep_existing' })} />
                    <span><strong>No — Keep existing product prices</strong><small>Save new purchase and selling prices in receipt history; current catalogue prices remain the same. Separate batch selling prices require separate product SKUs.</small></span>
                  </label>
                </fieldset>
              )}
              <div className="cg-easy-receipt-total"><span>Total Purchase Cost</span><strong>{cash(number(move.quantity) * number(move.costPrice))}</strong></div>
              <label>Purchase invoice (optional)<input value={move.invoiceNo} onChange={(e) => setMove({ ...move, invoiceNo: e.target.value })}/></label>
            </>
          )}
          <label>Reason / Notes {move.mode === 'out' ? '*' : ''}<textarea rows="2" required={move.mode === 'out'} value={move.notes} onChange={(e) => setMove({ ...move, notes: e.target.value })}/></label>
          {selected && <p className="cg-easy-hint">Available now: {selectedAvailable} {selected.unit || 'PCS'}</p>}
          <div className="cg-easy-form-actions"><button type="button" onClick={() => setMoveOpen(false)}>Cancel</button><button type="submit" disabled={saving || !selected || (receiptPricesDiffer && !move.priceMode)}>{saving ? 'Saving...' : (move.mode === 'in' ? 'Confirm Stock In' : 'Confirm Internal Use')}</button></div>
        </form>
      </ResponsiveModalSheet>
    </div>
  );
}
