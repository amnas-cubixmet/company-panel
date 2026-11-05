
import { Search, X } from 'lucide-react';
import { dashboardText, statusClass } from './dashboard.utils';

export const BookingList = ({
  bookings,
  search,
  onSearchChange,
  selectedBooking,
  onSelectBooking,
}) => (
  <div className="booking-pane">
    <div className="dashboard-search" role="search" aria-label="Filter service bookings">
      <Search size={18} className="dashboard-search-icon" aria-hidden="true" />
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && search) onSearchChange('');
        }}
        placeholder="Search customer, vehicle or job"
        aria-label="Search bookings by customer, vehicle or job"
        autoComplete="off"
        spellCheck={false}
      />
      {search && (
        <button
          className="dashboard-search-clear"
          type="button"
          onClick={() => onSearchChange('')}
          aria-label="Clear booking search"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>

    <div className="booking-list" aria-label="Service bookings">
      {bookings.length === 0 && (
        <p className="booking-list-empty" role="status">
          {search ? 'No matching jobs found.' : 'No jobs available.'}
        </p>
      )}
      {bookings.map((booking) => {
        const active = booking.id === selectedBooking?.id;
        return (
          <button
            key={booking.id}
            type="button"
            className={`booking-row ${active ? 'is-active' : ''}`}
            onClick={() => onSelectBooking(booking.id)}
            aria-pressed={active}
          >
            <div className="booking-row-top">
              <strong title={`${dashboardText(booking.id)} · ${dashboardText(booking.customer)}`}>{dashboardText(booking.id)} · {dashboardText(booking.customer)}</strong>
              <span className={`status-pill ${statusClass(dashboardText(booking.status, 'Pending'))}`} title={dashboardText(booking.status, 'Pending')}>{dashboardText(booking.status, 'Pending')}</span>
            </div>
            <span className="booking-vehicle" title={dashboardText(booking.vehicle)}>{dashboardText(booking.vehicle)}</span>
            <div className="booking-row-bottom">
              <span title={dashboardText(booking.service, 'Service not specified')}>{dashboardText(booking.service, 'Service not specified')}</span>
              {booking.time && dashboardText(booking.time) !== 'Walk-in' && <time>{dashboardText(booking.time)}</time>}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
