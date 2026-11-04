
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

    <div className="booking-list">
      {bookings.map((booking) => {
        const active = booking.id === selectedBooking?.id;
        return (
          <button
            key={booking.id}
            type="button"
            className={`booking-row ${active ? 'is-active' : ''}`}
            onClick={() => onSelectBooking(booking.id)}
          >
            <div className="booking-row-top">
              <strong>{dashboardText(booking.id)} · {dashboardText(booking.customer)}</strong>
              <span className={`status-pill ${statusClass(dashboardText(booking.status, 'Pending'))}`}>{dashboardText(booking.status, 'Pending')}</span>
            </div>
            <span className="booking-vehicle">{dashboardText(booking.vehicle)}</span>
            <div className="booking-row-bottom">
              <span>{dashboardText(booking.service, 'Service not specified')}</span>
              <time>{dashboardText(booking.time)}</time>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
