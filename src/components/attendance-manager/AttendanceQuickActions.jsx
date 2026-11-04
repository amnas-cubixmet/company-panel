
import { BarChart3, CalendarDays, ClipboardCheck, Clock3, Settings } from 'lucide-react';

const actions = [
  ['Daily Attendance', '/attendance-manager/daily', ClipboardCheck],
  ['Monthly Calendar', '/attendance-manager/calendar', CalendarDays],
  ['Shift Setup', '/attendance-manager/shifts', Clock3],
  ['Attendance Reports', '/attendance-manager/reports', BarChart3],
  ['Attendance Rules', '/attendance-manager/rules', Settings],
];

export const AttendanceQuickActions = ({ onNavigate }) => (
  <article className="am-dashboard-panel">
    <header className="am-dashboard-panel-title">
      <div>
        <h2>Quick Actions</h2>
        <p>Common attendance management tools.</p>
      </div>
      <Settings size={15} />
    </header>

    <div className="am-dashboard-quick-actions">
      {actions.map(([label, path, Icon]) => (
        <button key={path} type="button" onClick={() => onNavigate(path)}>
          <span><Icon size={12} />{label}</span>
          
        </button>
      ))}
    </div>
  </article>
);
