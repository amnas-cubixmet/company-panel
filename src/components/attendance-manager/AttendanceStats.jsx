
import { Clock3, UserCheck, Users, UserX, CalendarDays, ClipboardCheck } from 'lucide-react';

export const AttendanceStats = ({ stats, pending = 0 }) => {
  const cards = [
    { label: 'Total Staff', value: stats.total, icon: Users },
    { label: 'Present', value: stats.present, icon: UserCheck },
    { label: 'Absent', value: stats.absent, icon: UserX },
    { label: 'Late', value: stats.late, icon: Clock3 },
    { label: 'On Leave', value: stats.leave, icon: CalendarDays },
    { label: 'Pending Approvals', value: pending, icon: ClipboardCheck },
  ];

  return (
    <section className="am-dashboard-stats">
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="am-dashboard-stat-card">
          <div className="am-dashboard-stat-top">
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <i><Icon size={15} /></i>
          </div>
        </article>
      ))}
    </section>
  );
};
