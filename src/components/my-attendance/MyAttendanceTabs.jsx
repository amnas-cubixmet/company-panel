
import { CalendarDays, ClipboardList, Clock3, FileText, PieChart } from 'lucide-react';

const tabs = [
  { id: 'calendar', label: 'Attendance', icon: CalendarDays, path: '/my-attendance/calendar' },
  { id: 'history', label: 'History & Logs', icon: ClipboardList, path: '/my-attendance/history' },
  { id: 'leave', label: 'Leave Requests', icon: FileText, path: '/my-attendance/leave' },
  { id: 'overtime', label: 'Overtime', icon: Clock3, path: '/my-attendance/overtime' },
  { id: 'summary', label: 'Summary', icon: PieChart, path: '/my-attendance/summary' },
];

export const MyAttendanceTabs = ({ activeTab, onNavigate }) => (
  <nav className="my-attendance-dashboard-tabs" aria-label="My Attendance navigation">
    {tabs.map(({ id, label, icon: Icon, path }) => (
      <button
        key={id}
        type="button"
        className={activeTab === id ? 'is-active' : ''}
        onClick={() => onNavigate(path)}
      >
        <Icon size={14} />
        <span>{label}</span>
      </button>
    ))}
  </nav>
);
