
import { Filter, Search } from 'lucide-react';

export const InvoiceFilterToolbar = ({
  query,
  onQueryChange,
  status,
  onStatusChange,
  statuses,
  resultCount,
  placeholder = 'Search invoice number, customer, phone, vehicle or job',
}) => (
  <section className="invoice-dashboard-toolbar">
    <label className="invoice-dashboard-search">
      <Search size={14} />
      <input
        type="search"
        aria-label="Search billing records"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>

    <label className="invoice-dashboard-status-filter">
      <Filter size={13} />
      <select aria-label="Filter documents by status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="All">All Statuses</option>
        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>

    <div className="invoice-dashboard-result-count">
      <span>Matches</span>
      <strong>{resultCount}</strong>
    </div>
  </section>
);
