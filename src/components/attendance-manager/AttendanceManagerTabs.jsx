
import { useEffect, useRef } from 'react';
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

export const attendanceManagerTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/attendance-manager/overview' },
  { id: 'daily', label: 'Daily', icon: ClipboardCheck, path: '/attendance-manager/daily' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/attendance-manager/calendar' },
  { id: 'leave-requests', label: 'Leave', icon: CalendarRange, path: '/attendance-manager/leave-requests' },
  { id: 'shifts', label: 'Shifts', icon: Clock3, path: '/attendance-manager/shifts' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/attendance-manager/reports' },
  { id: 'rules', label: 'Rules', icon: Settings, path: '/attendance-manager/rules' },
];

export const AttendanceManagerTabs = ({ activeTab, onNavigate }) => {
  const navRef = useRef(null);
  useEffect(() => {
    const selected = navRef.current?.querySelector('[aria-current="page"]');
    selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);
  return <nav ref={navRef} className="attendance-manager-dashboard-tabs" aria-label="Attendance Manager navigation">
    {attendanceManagerTabs.map(({ id, label, icon: Icon, path }) => (
      <button
        key={id}
        type="button"
        className={activeTab === id ? 'is-active' : ''}
        aria-current={activeTab === id ? 'page' : undefined}
        onClick={() => onNavigate(path)}
      >
        <Icon size={16} aria-hidden="true" />
        <span>{label}</span>
      </button>
    ))}
  </nav>;
};
