
import { Search } from 'lucide-react';

export const VehicleSearchToolbar = ({ query, onQueryChange, resultCount }) => (
  <section className="vehicle-dashboard-toolbar">
    <label className="vehicle-dashboard-search">
      <Search size={14} />
      <input
        aria-label="Search vehicles"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search registration, VIN, make/model, customer or phone"
        aria-label="Search vehicles"
      />
    </label>

    <div className="vehicle-dashboard-result-count">
      <span>Showing</span>
      <strong>{resultCount}</strong>
    </div>
  </section>
);
