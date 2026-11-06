
import { AlertTriangle, CalendarClock, Car, ClipboardList } from 'lucide-react';

export const VehicleOverviewStats = ({ metrics }) => {
  const cards = [
    {
      label: 'Total Vehicles',
      value: metrics.total,
      icon: Car,
    },
    {
      label: 'Open Jobs',
      value: metrics.openJobs,
      icon: ClipboardList,
    },
    {
      label: 'Service Due',
      value: metrics.serviceDue,
      icon: CalendarClock,
      tone: 'warning',
    },
    {
      label: 'Insurance Due',
      value: metrics.insuranceDue,
      icon: AlertTriangle,
      tone: 'warning',
    },
  ];

  return (
    <section className="vehicle-dashboard-stats">
      {cards.map(({ label, value, icon: Icon, tone = 'primary' }) => (
        <article key={label} className="vehicle-dashboard-stat-card">
          <div className="vehicle-dashboard-stat-top">
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <i className={`is-${tone}`}><Icon size={15} /></i>
          </div>
        </article>
      ))}
    </section>
  );
};
