import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2,
  AlertTriangle, FileText, AlertCircle, TrendingUp, RefreshCw,
} from 'lucide-react';
import { attendanceService } from '../../services/attendance.service';
import { minutesToHours } from '../../components/my-attendance/attendance.utils';
import { buildAttendanceSummary } from './attendanceSummary.utils';

const monthKey = (date) => date.getFullYear() * 12 + date.getMonth();
const atMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const AttendanceSummary = () => {
  const navigate = useNavigate();
  const [monthDate, setMonthDate] = useState(() => atMonthStart(new Date()));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setSummary(null);

    Promise.all([
      attendanceService.getPersonalAttendanceLogs({
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear(),
      }),
      attendanceService.getCalendarEvents(monthDate.getMonth() + 1, monthDate.getFullYear()),
      attendanceService.getAttendanceStatus(),
    ]).then(([logs, events, attendanceStatus]) => {
      if (!mounted) return;
      // A failure or missing profile must never produce invented zero statistics.
      if (!attendanceStatus?.employee) {
        throw new Error('No linked employee attendance profile was returned by the server.');
      }
      setSummary(buildAttendanceSummary({ logs, events, attendanceStatus, monthDate, now: today }));
    }).catch((cause) => {
      if (mounted) setError(cause?.message || 'Unable to load attendance summary. Try again.');
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [monthDate, reloadKey, today]);

  const monthLabel = monthDate.toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
  const canGoBack = !loading && summary && monthKey(monthDate) > monthKey(summary.joiningDate);
  const canGoForward = !loading && monthKey(monthDate) < monthKey(today);
  const isCurrentMonth = monthKey(monthDate) === monthKey(today);

  const changeMonth = (offset) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    if (monthKey(next) > monthKey(today)) return;
    if (summary && monthKey(next) < monthKey(summary.joiningDate)) return;
    setMonthDate(next);
  };

  const metrics = summary?.metrics;
  const cards = metrics ? [
    { label: 'Present Days', value: metrics.presentDays, icon: CheckCircle2, tone: 'success' },
    { label: 'Absent Days', value: metrics.absentDays, icon: AlertTriangle, tone: 'danger' },
    { label: 'Leave Days', value: metrics.leaveDays, icon: FileText, tone: 'info' },
    { label: 'Holidays & Off', value: metrics.holidayDays + metrics.weeklyOffDays, icon: Calendar, tone: 'warning' },
    { label: 'Worked Hours', value: minutesToHours(metrics.workedMinutes), icon: Clock, tone: 'info' },
    { label: 'Overtime Hours', value: minutesToHours(metrics.overtimeMinutes), icon: TrendingUp, tone: 'primary' },
    { label: 'Late Days', value: metrics.lateDays, icon: AlertCircle, tone: 'warning' },
  ] : [];

  const breakdown = metrics ? [
    { label: 'Working Days', value: metrics.workingDays },
    { label: 'Present', value: metrics.presentDays },
    { label: 'Absent', value: metrics.absentDays },
    { label: 'Leave', value: metrics.leaveDays },
    { label: 'Holiday', value: metrics.holidayDays },
    { label: 'Weekly Off', value: metrics.weeklyOffDays },
  ] : [];

  return (
    <div className="my-attendance-summary-page attendance-module attendance-summary-page">
      <div className="cg-summary-month-selector" role="group" aria-label="Attendance summary month">
        <div className="cg-summary-month-navigation">
          <button type="button" className="cg-summary-nav-button" onClick={() => changeMonth(-1)}
            disabled={!canGoBack} aria-label="Previous month">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="cg-summary-month-label" aria-live="polite">{monthLabel}</span>
          <button type="button" className="cg-summary-nav-button" onClick={() => changeMonth(1)}
            disabled={!canGoForward} aria-label="Next month">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="cg-summary-current-button" disabled={isCurrentMonth}
          onClick={() => setMonthDate(atMonthStart(today))}>
          Current Month
        </button>
      </div>

      {loading && <div className="cg-summary-state" role="status">Loading attendance summary from the server…</div>}
      {!loading && error && (
        <div className="cg-summary-state cg-summary-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
            <RefreshCw size={16} aria-hidden="true" /> Retry
          </button>
        </div>
      )}
      {!loading && !error && metrics && (
        <>
          <div className="cg-summary-kpi-grid" aria-label="Attendance metrics">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <article className="cg-summary-kpi-card" key={label}>
                <div className="cg-summary-kpi-top">
                  <span>{label}</span>
                  <span className={`cg-summary-kpi-icon is-${tone}`}><Icon size={18} aria-hidden="true" /></span>
                </div>
                <strong>{value}</strong>
              </article>
            ))}
          </div>

          <section className="cg-summary-panel" aria-label="Monthly day distribution">
            <h2>Monthly Day Distribution</h2>
            <p>Only dates from your joining date through today are included.</p>
            <div className="cg-summary-list">
              {breakdown.map(({ label, value }) => (
                <div className="cg-summary-list-row" key={label}>
                  <span>{label}</span><strong>{value} {value === 1 ? 'Day' : 'Days'}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="cg-summary-panel" aria-label="Attendance flags and action items">
            <h2>Attendance Flags &amp; Action Items</h2>
            {metrics.missingClockOut > 0 ? (
              <button type="button" className="cg-summary-flag"
                onClick={() => navigate('/my-attendance/history')}>
                <span>Missing Clock Out</span>
                <strong>{metrics.missingClockOut} {metrics.missingClockOut === 1 ? 'Record' : 'Records'}</strong>
              </button>
            ) : (
              <p className="cg-summary-empty">No missing clock-outs recorded for this month.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
};
