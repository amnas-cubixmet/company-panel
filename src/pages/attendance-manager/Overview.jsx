import { useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import {
  AttendanceAttentionPanel,
  AttendanceQuickActions,
  AttendanceStats,
  ProductivityPanel,
} from '../../components/attendance-manager';
import { attendanceManagerService } from '../../services/attendanceManager.service';

export const AttendanceOverview = () => {
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([
      attendanceManagerService.getTeamAttendance(),
      attendanceManagerService.getApprovals(),
    ])
      .then(([teamData, approvalData]) => {
        if (!active) return;
        setTeam(Array.isArray(teamData) ? teamData : []);
        setApprovals(Array.isArray(approvalData) ? approvalData : []);
      })
      .catch((cause) => { if (active) setError(cause?.message || 'Unable to load attendance.'); })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const count = (status) => team.filter((item) => item.status === status).length;
    return {
      total: team.length,
      present: team.filter((item) =>
        ['Present', 'Missing Clock Out'].includes(item.status),
      ).length,
      absent: count('Absent'),
      late: team.filter((item) => Number(item.lateMinutes || 0) > 0).length,
      halfDay: count('Half Day'),
      leave: count('On Leave'),
    };
  }, [team]);

  const productive = team.reduce(
    (sum, item) => sum + Number(item.productiveHours || 0),
    0,
  );
  const idle = team.reduce(
    (sum, item) => sum + Number(item.idleHours || 0),
    0,
  );
  const pending = approvals.filter((item) => item.status === 'Pending').length;
  const missingPunch = team.filter(
    (item) => item.missingPunch || item.status === 'Missing Clock Out',
  ).length;

  if (loading) {
    return <div className="am-dashboard-loading">Loading attendance overview…</div>;
  }
  if (error) return <div className="am-loading-state" role="alert">{error}</div>;

  return (
    <div className="attendance-manager-module attendance-manager-overview">
      <AttendanceStats stats={stats} pending={pending} />

      <section className="am-dashboard-bottom-grid">
        <ProductivityPanel
          team={team}
          productive={productive}
          idle={idle}
          onOpenEmployee={(item) =>
            navigate(`/attendance-manager/team-review/${item.staffId}/${item.date || new Date().toISOString().slice(0, 10)}`)
          }
        />

        <AttendanceAttentionPanel
          halfDay={stats.halfDay}
          pending={pending}
          missingPunch={missingPunch}
          onOpenDaily={() => navigate('/attendance-manager/daily')}
          onOpenLeave={() => navigate('/attendance-manager/leave-requests')}
        />

        <AttendanceQuickActions onNavigate={navigate} />
      </section>
    </div>
  );
};
