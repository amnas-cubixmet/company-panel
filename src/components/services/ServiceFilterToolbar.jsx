
import { Search } from 'lucide-react';

export const ServiceFilterToolbar = ({ query,onQueryChange,categoryFilter,onCategoryChange,statusFilter,onStatusChange,categories }) => (
  <section className="service-dashboard-toolbar">
    <label className="service-dashboard-search">
      <Search size={14}/>
      <input type="search" aria-label="Search services" value={query} onChange={e=>onQueryChange(e.target.value)} placeholder="Search name, code or category…"/>
    </label>
    <select aria-label="Filter by service category" value={categoryFilter} onChange={e=>onCategoryChange(e.target.value)}>
      <option>All</option>
      {categories.map(c=><option key={c.id}>{c.name}</option>)}
    </select>
    <select aria-label="Filter by service status" value={statusFilter} onChange={e=>onStatusChange(e.target.value)}>
      <option>All</option><option>Active</option><option>Inactive</option>
    </select>
  </section>
);