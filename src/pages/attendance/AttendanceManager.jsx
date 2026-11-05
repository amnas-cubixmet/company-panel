
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AttendanceManagerHeader,
  AttendanceManagerTabs,
  attendanceManagerTabs,
} from '../../components/attendance-manager';
import { AttendanceReports } from '../attendance-manager/AttendanceReports';
import { DailyAttendance } from '../attendance-manager/DailyAttendance';
import { LeaveRequestsManager } from '../attendance-manager/LeaveRequestsManager';
import { MonthlyAttendanceCalendar } from '../attendance-manager/MonthlyCalendar';
import { AttendanceOverview } from '../attendance-manager/Overview';
import { RulesSettings } from '../attendance-manager/RulesSettings';
import { ShiftSettings } from '../attendance-manager/Shifts';
import '../../styles/attendance-manager.css';
import '../../styles/attendance-manager-pages.css';
import '../../styles/attendance-manager-readable.css';
import '../../styles/attendance-manager-compact.css';

export const AttendanceManager = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab =
    attendanceManagerTabs.find((tab) => location.pathname === tab.path)?.id ||
    'overview';

  return (
    <div className="attendance-manager-pages cg-attendance-manager">
      <AttendanceManagerHeader />
      <AttendanceManagerTabs activeTab={activeTab} onNavigate={navigate} />

      <main className="attendance-manager-pages-content">
        {activeTab === 'overview' && <AttendanceOverview />}
        {activeTab === 'daily' && <DailyAttendance />}
        {activeTab === 'calendar' && <MonthlyAttendanceCalendar />}
        {activeTab === 'leave-requests' && <LeaveRequestsManager />}
        {activeTab === 'shifts' && <ShiftSettings />}
        {activeTab === 'reports' && <AttendanceReports />}
        {activeTab === 'rules' && <RulesSettings />}
      </main>
    </div>
  );
};
