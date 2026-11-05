import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from 'lucide-react';
import { attendanceManagerService } from '../../services/attendanceManager.service';

export const AttendanceReports = () => {
  const [team, setTeam] = useState([]);
  const [reportType, setReportType] = useState('Daily Attendance');

  useEffect(() => {
    attendanceManagerService.getTeamAttendance().then(setTeam);
  }, []);

  const rows = useMemo(() => {
    if (reportType === 'Late Report') return team.filter((item) => Number(item.lateMinutes || 0) > 0);
    if (reportType === 'Absence Report') return team.filter((item) => item.status === 'Absent');
    if (reportType === 'OT Report') return team.filter((item) => Number(item.overtimeHours || 0) > 0);
    return team;
  }, [team, reportType]);

  const exportCsv = () => {
    const header = ['Employee','Role','Branch','Status','Check In','Check Out','Working Hours','OT Hours','Late Minutes'];
    const body = rows.map((item) => [
      item.name,item.designation,item.branch,item.status,item.clockIn || '',item.clockOut || '',
      item.worked || '',item.overtimeHours || 0,item.lateMinutes || 0
    ]);
    const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${reportType.toLowerCase().replaceAll(' ','-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="attendance-manager-module attendance-manager-reports">
      <section className="am-section-header">
        <div>
          <h2>Attendance Reports</h2>
        </div>
        <div className="am-header-actions">
          <button onClick={exportCsv} className="am-secondary-button"><Download size={14}/>Export CSV</button>
          <button onClick={() => window.print()} className="am-secondary-button"><Printer size={14}/>Print</button>
        </div>
      </section>

      <section className="am-report-filter">
        <label>
          <span>Report Type</span>
          <select value={reportType} onChange={(e)=>setReportType(e.target.value)}>
            {['Daily Attendance','Monthly Attendance','Late Report','Absence Report','OT Report','Employee-wise Report'].map((type)=><option key={type}>{type}</option>)}
          </select>
        </label>
        <div className="am-report-count"><span>Records</span><strong>{rows.length}</strong></div>
      </section>

      <div className="am-table-card am-report-table">
        <table>
          <thead>
            <tr>{['Employee','Role','Branch','Status','Check In','Check Out','Worked','OT','Late'].map((head)=><th key={head}>{head}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((item)=>(
              <tr key={item.id}>
                <td><strong>{item.name}</strong></td>
                <td>{item.designation}</td>
                <td>{item.branch}</td>
                <td><strong>{item.status}</strong></td>
                <td>{item.clockIn || '—'}</td>
                <td>{item.clockOut || '—'}</td>
                <td>{item.worked || '—'}</td>
                <td>{item.overtimeHours || 0}h</td>
                <td>{item.lateMinutes || 0}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
