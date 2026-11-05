
import { AlertTriangle, ClockAlert, UserRoundMinus } from 'lucide-react';

export const AttendanceAttentionPanel = ({
  halfDay,
  pending,
  missingPunch,
  onOpenDaily,
  onOpenLeave,
}) => {
  const rows = [
    { label: 'Pending Requests', value: pending, icon: AlertTriangle },
    { label: 'Missing Punch', value: missingPunch, icon: ClockAlert },
    { label: 'Half Day', value: halfDay, icon: UserRoundMinus },
  ];

  return (
    <article className="am-dashboard-panel">
      <header className="am-dashboard-panel-title">
        <div>
          <h2>Pending Actions</h2>
        </div>
        <AlertTriangle size={15} />
      </header>

      <div className="am-dashboard-attention-list">
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <span className="am-dashboard-attention-icon"><Icon size={13} /></span>
            <span><strong>{label}</strong></span>
            <b>{value}</b>
          </div>
        ))}
      </div>

      <div className="am-dashboard-panel-actions">
        <button type="button" className="is-primary" onClick={onOpenDaily}>Daily Attendance</button>
        <button type="button" onClick={onOpenLeave}>Review Requests</button>
      </div>
    </article>
  );
};
