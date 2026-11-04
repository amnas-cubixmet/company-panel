import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, LogIn, LogOut, MapPin, Repeat2 } from 'lucide-react';
import { attendanceService } from '../../services/attendance.service';

const humanize = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const durationLabel = (session, now) => {
  if (!session) return null;

  let minutes = Number(session.workedMinutes || 0);
  if (!session.clockOut && session.clockIn) {
    const start = new Date(session.clockIn);
    if (!Number.isNaN(start.getTime())) {
      minutes = Math.max(0, Math.floor((now - start.getTime()) / 60000));
    }
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const locationLabel = (location) => {
  if (!location || location.latitude == null || location.longitude == null) return null;
  return `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
};

export const AttendancePunchPanel = ({ onChanged }) => {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locationProgress, setLocationProgress] = useState('');
  const [locationProblem, setLocationProblem] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const data = await attendanceService.getAttendanceStatus();
      setState(data || null);
      setError('');
    } catch (err) {
      setState(null);
      setError(err?.message || 'Unable to load attendance status.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const sessions = useMemo(
    () => (Array.isArray(state?.record?.sessions) ? state.record.sessions : []),
    [state?.record?.sessions],
  );

  const punch = async () => {
    if (!state?.nextAction || busy) return;

    setBusy(true);
    setError('');
    setLocationProgress('');
    setLocationProblem(false);

    try {
      await attendanceService.punchAttendance(state.nextAction, {
        locationRequired: Boolean(state?.rule?.locationRequired),
        locationTrackingEnabled: Boolean(state?.rule?.locationTrackingEnabled),
        punchLocationMode: state?.rule?.punchLocationMode || 'anywhere',
        punchRadiusMeters: state?.rule?.punchRadiusMeters,
        onLocationProgress: ({ accuracy, radius }) => {
          setLocationProgress(`Checking GPS: about ${accuracy} m accuracy · ${radius} m allowed radius…`);
        },
      });
      await load();
      onChanged?.();
    } catch (err) {
      setLocationProblem(err?.code === 'LOCATION_ACCURACY_LOW' ||
        /location accuracy is too low/i.test(err?.message || ''));
      setError(err?.message || 'Attendance punch failed.');
    } finally {
      setBusy(false);
      setLocationProgress('');
    }
  };

  if (!state && !error) {
    return (
      <section className="attendance-punch-card is-loading">
        Loading attendance status...
      </section>
    );
  }

  if (!state) {
    return <section className="attendance-punch-error">{error}</section>;
  }

  const isUnavailable = state.status === 'UNAVAILABLE' || state.profileLinked === false;
  const isIn = state.status === 'CLOCKED_IN';
  const mode = state.attendanceMode || state.rule?.attendanceMode || null;
  const sessionCount = Number(state.sessionCount ?? sessions.length ?? 0);
  const autoCheckoutTime = formatTime(state.autoCheckoutAt);
  const locationEnabled = Boolean(
    state.rule?.locationTrackingEnabled || state.rule?.locationRequired,
  );
  const ActionIcon = state.nextAction === 'check_out' ? LogOut : LogIn;

  const statusLabel = isUnavailable
    ? 'Not Linked'
    : state.status
      ? humanize(state.status)
      : null;

  return (
    <section
      className={
        'attendance-punch-card ' +
        (isIn ? 'is-live' : state.nextAction ? 'is-ready' : 'is-complete')
      }
    >
      <div className="attendance-punch-main">
        <div className="attendance-punch-status">
          <span className={'attendance-live-dot ' + (isIn ? 'is-online' : '')} />
          <span>
            <small>Today</small>
            <strong>{statusLabel || '-'}</strong>
          </span>
        </div>

        <div className="attendance-punch-meta">
          {mode && (
            <div>
              <Clock3 size={13} />
              <span>
                <small>Mode</small>
                <strong>{humanize(mode)}</strong>
              </span>
            </div>
          )}

          <div>
            <Repeat2 size={13} />
            <span>
              <small>Sessions</small>
              <strong>{sessionCount}</strong>
            </span>
          </div>

          {autoCheckoutTime && (
            <div>
              <Clock3 size={13} />
              <span>
                <small>Auto Checkout</small>
                <strong>{autoCheckoutTime}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="attendance-punch-action">
        {state.nextAction && !isUnavailable ? (
          <button
            type="button"
            className={state.nextAction === 'check_out' ? 'is-checkout' : ''}
            disabled={busy}
            onClick={punch}
          >
            <ActionIcon size={14} />
            {busy
              ? 'Please wait...'
              : state.nextAction === 'check_out'
                ? 'Check Out'
                : 'Check In'}
          </button>
        ) : state.reason ? (
          <div className="attendance-punch-note">
            <CheckCircle2 size={14} />
            <span>{state.reason}</span>
          </div>
        ) : null}
      </div>

      {locationProgress && <p className="attendance-punch-gps-progress" role="status" aria-live="polite">{locationProgress}</p>}

      {sessions.length > 0 && (
        <div className="attendance-session-strip">
          {sessions.map((session, index) => {
            const inLocation = locationLabel(session.clockInLocation);
            const outLocation = locationLabel(session.clockOutLocation);
            const duration = durationLabel(session, now);

            return (
              <article
                key={session.id || `session-${index}`}
                className={session.clockOut ? '' : 'is-open'}
              >
                <div className="attendance-session-title">
                  <strong>
                    {session.sessionNumber
                      ? `Session ${session.sessionNumber}`
                      : `Session ${index + 1}`}
                  </strong>
                  {duration && (
                    <span>{session.clockOut ? duration : `Live - ${duration}`}</span>
                  )}
                </div>

                <div className="attendance-session-times">
                  <span>
                    <small>In</small>
                    <b>{formatTime(session.clockIn) || '-'}</b>
                  </span>
                  <span>
                    <small>Out</small>
                    <b>{formatTime(session.clockOut) || '-'}</b>
                  </span>
                </div>

                {locationEnabled && (inLocation || outLocation) && (
                  <div className="attendance-session-location">
                    <MapPin size={11} />
                    <span>
                      {[inLocation, outLocation].filter(Boolean).join(' -> ')}
                    </span>
                  </div>
                )}

                {session.autoClosed && (
                  <small className="attendance-session-auto">Auto checkout</small>
                )}
              </article>
            );
          })}
        </div>
      )}

      {error && <div className="attendance-punch-error" role="alert">
        <strong>{state.nextAction === 'check_out' ? 'Check Out not recorded.' : 'Check In not recorded.'}</strong>
        <p>{error}</p>
        {locationProblem && <button type="button" className="attendance-punch-retry" onClick={punch} disabled={busy}>
          Retry with Precise GPS
        </button>}
      </div>}
    </section>
  );
};
