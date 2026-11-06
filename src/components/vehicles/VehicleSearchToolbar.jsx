
import { Search, X } from 'lucide-react';

export const VehicleSearchToolbar = ({ query, onQueryChange, resultCount }) => (
  <section className="vehicle-dashboard-toolbar">
    <div className="vehicle-dashboard-search" role="search">
      <Search size={17} aria-hidden="true" />
      <input
        aria-label="Search vehicles"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search registration, VIN, make/model, customer or phone"
      />
      {query && <button type="button" className="vehicle-dashboard-clear-search" aria-label="Clear vehicle search" onClick={() => onQueryChange('')}><X size={17} aria-hidden="true"/></button>}
    </div>

    <div className="vehicle-dashboard-result-count">
      <strong>{resultCount}</strong> <span>vehicles</span>
    </div>
  </section>
);
