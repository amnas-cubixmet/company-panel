import { appPrompt } from '../common/appDialogs';
import { useEffect, useMemo, useState } from "react";
import { Play, Pause, CheckCheck, CheckCircle2, RefreshCw, Wrench } from 'lucide-react';
import { payrollService } from '../../services/payroll.service';
import { hasPermission } from '../../utils/permissions';
import { useAuth } from '../../hooks/useAuth';

const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(amount || 0));

const dateFromApi = (value) => value ? new Date(value) : null;
const elapsed = (row, tick) => {
  const base = Number(row.elapsedSeconds || 0);
  const resumed = row.status === 'Running' ? dateFromApi(row.resumedAt) : null;
  return Math.max(0, base + (resumed ? Math.floor((tick - resumed.getTime()) / 1000) : 0));
};
const duration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const errorMessage = (e) => {
  const data = e?.response?.data;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data === 'object' && data) {
    const first = Object.values(data)[0];
    if (typeof first === 'string') return first;
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  return e?.message || 'Unable to update work session.';
};

export const JobWorkTimerPanel = ({ jobId, jobStatus, labourRecords = [], onChanged }) => {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'jobs.edit');
  const canApprove = hasPermission(user, 'payroll.edit');
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [employeeAssignment, setEmployeeAssignment] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [labourCharge, setLabourCharge] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(Date.now());
  const services = useMemo(() =>
    [...new Set(labourRecords.map((row) => row.service).filter(Boolean))],
  [labourRecords]);

  const refresh = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const [assignmentData, sessionData] = await Promise.all([
        payrollService.getJobTimerAssignments(jobId),
        payrollService.getJobWorkSessions({ job: jobId }),
      ]);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : assignmentData?.results || []);
      setSessions(Array.isArray(sessionData) ? sessionData : sessionData?.results || []);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [jobId]);
  useEffect(() => {
    if (!sessions.some((item) => item.status === 'Running')) return undefined;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sessions]);

  const call = async (key, action, data) => {
    setBusy(key);
    setMessage('');
    try {
      if (action === 'start') {
        await payrollService.startJobWork(employeeAssignment, serviceName.trim(), Number(labourCharge || 0));
        setServiceName('');
        setLabourCharge('');
      } else {
        await payrollService.updateJobWorkSession(key, action, data);
      }
      await refresh();
      await onChanged?.();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const correct = async (row) => {
    const minutesInput = await appPrompt('Corrected approved work minutes:', String(row.approvedMinutes || Math.max(1, Math.ceil(Number(row.elapsedSeconds || 0) / 60))));
    if (minutesInput === null) return;
    const minutes = Number(minutesInput);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setMessage('Enter a valid whole number between 1 and 1440 minutes.');
      return;
    }
    const chargeInput = await appPrompt('Corrected eligible labour amount (₹):', String(row.labourCharge || '0'));
    if (chargeInput === null) return;
    const labourAmount = Number(chargeInput);
    if (!Number.isFinite(labourAmount) || labourAmount < 0) {
      setMessage('Enter a valid nonnegative labour amount.');
      return;
    }
    const reason = await appPrompt('Reason for supervisor correction:');
    if (!reason?.trim()) return;
    await call(row.id, 'correct', { minutes, labourCharge: labourAmount, reason: reason.trim() });
  };

  const reject = async (row) => {
    const reason = await appPrompt('Why is this work being rejected?');
    if (reason?.trim()) await call(row.id, 'reject', { reason: reason.trim() });
  };

  const hoursApproved = sessions
    .filter((item) => item.status === 'Approved')
    .reduce((sum, item) => sum + Number(item.approvedMinutes || 0), 0) / 60;

  return (
    <section className="job-work-timer-panel">
      <header className="job-work-timer-head">
        <div>
          <h3><Wrench size={17} aria-hidden="true" /> Mechanic</h3>
          <p>Work timer and approved hours</p>
        </div>
        <div className="job-work-timer-summary">
          <strong>{hoursApproved.toFixed(2)}h</strong>
          <small>Approved hours</small>
        </div>
      </header>

      {message && <p className="job-work-timer-message" role="alert">{message}</p>}

      {canEdit && (
        <form className="job-work-timer-form" onSubmit={(event) => {
          event.preventDefault();
          if (employeeAssignment && serviceName.trim()) call('start', 'start');
        }}>
          <label>Mechanic
            <select required value={employeeAssignment} onChange={(event) => setEmployeeAssignment(event.target.value)}>
              <option value="">Select assigned mechanic</option>
              {assignments.map((item) => (
                <option key={item.id} value={item.id}>{item.staffName || item.employeeName || item.staffId}</option>
              ))}
            </select>
          </label>
          <label>Service / Task
            <input required list="job-work-service-suggestions" maxLength={160} value={serviceName}
              onChange={(event) => setServiceName(event.target.value)} placeholder="Engine Oil Change"/>
            <datalist id="job-work-service-suggestions">{services.map((item) => <option key={item} value={item}/>)}</datalist>
          </label>
          <label>Customer Labour Charge (₹)
            <input min="0" step="0.01" type="number" value={labourCharge}
              onChange={(event) => setLabourCharge(event.target.value)} placeholder="500"/>
          </label>
          <button type="submit" className="is-primary" disabled={Boolean(busy) || jobStatus !== 'In Progress' || !assignments.length}>
            <Play size={14}/>{busy === 'start' ? 'Starting…' : 'Start Work'}
          </button>
        </form>
      )}

      <p className="job-work-timer-hint">
        {jobStatus !== 'In Progress'
          ? 'Start and resume controls become available when Job Card status is In Progress.'
          : 'One active timer per mechanic.'}
      </p>

      <div className="job-work-timer-list">
        {loading && <div className="job-work-timer-empty">Loading work logs…</div>}
        {!loading && !sessions.length && <div className="job-work-timer-empty">No mechanic work records yet. Assign a mechanic above to start work.</div>}
        {!loading && sessions.map((row) => (
          <article key={row.id} className="job-work-timer-row">
            <div className="job-work-timer-person">
              <strong>{row.staffName || 'Mechanic'}</strong>
              <span>{row.serviceName || 'Work'} · Customer labour: {money(row.labourCharge)}</span>
              <small>Status: {row.status === 'PendingApproval' ? 'Awaiting Supervisor Approval' : row.status}</small>
            </div>
            <div className="job-work-timer-duration">
              <strong>{duration(elapsed(row, tick))}</strong>
              {row.approvedMinutes != null && <small>Approved: {(Number(row.approvedMinutes)/60).toFixed(2)}h</small>}
            </div>
            <div className="job-work-timer-actions">
              {canEdit && row.status === 'Running' && (
                <button type="button" disabled={Boolean(busy)} onClick={() => call(row.id,'pause')}><Pause size={13}/> Pause</button>
              )}
              {canEdit && row.status === 'Paused' && jobStatus === 'In Progress' && (
                <button type="button" disabled={Boolean(busy)} onClick={() => call(row.id,'resume')}><Play size={13}/> Resume</button>
              )}
              {canEdit && ['Running','Paused'].includes(row.status) && (
                <button type="button" disabled={Boolean(busy)} onClick={() => call(row.id,'complete')}><CheckCheck size={13}/> Complete</button>
              )}
              {canApprove && ['PendingApproval','Rejected'].includes(row.status) && (
                <button type="button" disabled={Boolean(busy)} onClick={() => correct(row)}><Wrench size={13}/> Correct</button>
              )}
              {canApprove && row.status === 'PendingApproval' && (
                <>
                  <button type="button" className="is-primary" disabled={Boolean(busy)} onClick={() => call(row.id,'approve')}><CheckCircle2 size={13}/> Approve</button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => reject(row)}>Reject</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <button className="job-work-timer-refresh" type="button" onClick={refresh} disabled={loading || Boolean(busy)}>
        <RefreshCw size={13}/> Refresh mechanic records
      </button>
    </section>
  );
};
