import { Search, X } from 'lucide-react';
import { STATUS_OPTIONS } from './jobs.utils';

export const JobsToolbar = ({
  query, onQueryChange, status, onStatusChange,
  branch = 'all', onBranchChange, branchOptions = [],
  technician = 'all', onTechnicianChange, technicianOptions = [],
  priority = 'all', onPriorityChange, priorityOptions = [],
  from = '', to = '', onFromChange, onToChange,
  resultCount = 0, onReset,
}) => (
  <section className="jobs-toolbar jobs-toolbar-combined" aria-label="Filter Job Cards">
    <label className="jobs-search">
      <Search size={18} aria-hidden="true" />
      <input type="search" aria-label="Search job cards" value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search job number, customer, phone or vehicle" />
      {query && <button type="button" className="jobs-search-clear"
        aria-label="Clear job search" onClick={() => onQueryChange('')}><X size={16}/></button>}
    </label>
    <label className="jobs-status-filter">
      <span className="jobs-filter-label">Status</span>
      <select aria-label="Filter job cards by status" value={status}
        onChange={(event) => onStatusChange(event.target.value)}>
        {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label className="jobs-status-filter">
      <span className="jobs-filter-label">Branch</span>
      <select aria-label="Filter job cards by branch" value={branch}
        onChange={(event) => onBranchChange(event.target.value)}>
        <option value="all">All branches</option>
        {branchOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label className="jobs-status-filter">
      <span className="jobs-filter-label">Technician</span>
      <select aria-label="Filter job cards by technician" value={technician}
        onChange={(event) => onTechnicianChange(event.target.value)}>
        <option value="all">All technicians</option>
        {technicianOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label className="jobs-status-filter">
      <span className="jobs-filter-label">Priority</span>
      <select aria-label="Filter job cards by priority" value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}>
        <option value="all">All priorities</option>
        {priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label className="jobs-status-filter">
      <span className="jobs-filter-label">From</span>
      <input type="date" aria-label="Job card created from date" value={from}
        max={to || undefined} onChange={(event) => onFromChange(event.target.value)}/>
    </label>
    <label className="jobs-status-filter">
      <span className="jobs-filter-label">To</span>
      <input type="date" aria-label="Job card created to date" value={to}
        min={from || undefined} onChange={(event) => onToChange(event.target.value)}/>
    </label>
    <div className="jobs-toolbar-actions">
      <span aria-live="polite">{resultCount} matching job{resultCount === 1 ? '' : 's'}</span>
      <button type="button" className="jobs-filter-reset" onClick={onReset}>Reset Filters</button>
    </div>
  </section>
);
