import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  BellRing,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { AttendanceModeSelector } from '../../components/attendance-manager/AttendanceModeSelector';
import { attendanceManagerService } from '../../services/attendanceManager.service';

const defaults = {
  attendanceMode: 'single',
  startTime: '09:00',
  endTime: '18:00',
  lateGraceMinutes: 15,
  overtimeAfterMinutes: 540,
  maxSessionsPerDay: 0,
  autoCheckoutGraceMinutes: 0,
  missingPunchPolicy: 'request_correction',
  locationRequired: false,
  locationTrackingEnabled: false,
  punchLocationMode: 'anywhere',
  workshopLatitude: null,
  workshopLongitude: null,
  punchRadiusMeters: 100,
  missingPunchReminderEnabled: false,
  missingPunchReminderMinutes: 15,
  leaveRequestNotifications: true,
  overtimeRequestNotifications: true,
  correctionApproval: true,
  allowSelfApproval: false,
  weekendDays: ['Sunday'],
  alternateSaturdayEnabled: false,
  alternateSaturdayPattern: '2nd & 4th Saturday',
  weekendAttendancePolicy: 'weekly_off',
  weekendEffectiveFrom: '',
};

const normalizeRules = (data = {}) => ({
  ...defaults,
  ...data,
  startTime: String(data.startTime || defaults.startTime).slice(0, 5),
  endTime: String(data.endTime || defaults.endTime).slice(0, 5),
  weekendDays: Array.isArray(data.weekendDays) ? data.weekendDays : defaults.weekendDays,
});

export const RulesSettings = () => {
  const [initialRules, setInitialRules] = useState(null);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [locating, setLocating] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    holiday_type: 'Company',
    is_optional: false,
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const [ruleData, holidayRows] = await Promise.all([
        attendanceManagerService.getRules(),
        attendanceManagerService.getHolidays(),
      ]);
      const data = normalizeRules(ruleData);
      setRules(data);
      setInitialRules(data);
      setHolidays(Array.isArray(holidayRows) ? holidayRows : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const dirty = JSON.stringify(rules) !== JSON.stringify(initialRules);

  const change = (field, value) => {
    setRules((current) => ({ ...current, [field]: value }));
  };

  const toggleWeekend = (day) => {
    const values = new Set(rules.weekendDays || []);
    if (values.has(day)) values.delete(day);
    else values.add(day);
    change('weekendDays', Array.from(values));
  };

  const selectCurrentLocation = () => {
    setLocationStatus('');
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationStatus('Device location requires a secure HTTPS connection and browser support.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setRules((current) => ({
          ...current,
          workshopLatitude: Number(coords.latitude.toFixed(7)),
          workshopLongitude: Number(coords.longitude.toFixed(7)),
        }));
        setLocationStatus('Location selected. Check the coordinates and save the rules.');
        setLocating(false);
      },
      () => {
        setLocationStatus('Location unavailable. Allow browser permission or enter coordinates manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const save = async () => {
    if (!dirty || saving) return;
    setMessage('');
    if (rules.punchLocationMode === 'workshop') {
      const lat = Number(rules.workshopLatitude);
      const lon = Number(rules.workshopLongitude);
      const radius = Number(rules.punchRadiusMeters);
      if (rules.workshopLatitude === null || rules.workshopLatitude === '' ||
          rules.workshopLongitude === null || rules.workshopLongitude === '' ||
          !Number.isFinite(lat) || lat < -90 || lat > 90 ||
          !Number.isFinite(lon) || lon < -180 || lon > 180 ||
          !Number.isInteger(radius) || radius < 50 || radius > 5000) {
        setMessage('Set valid workshop latitude, longitude and a radius of 50–5000 metres.');
        return;
      }
    }
    setSaving(true);

    try {
      const saved = normalizeRules(await attendanceManagerService.saveRules(rules));
      setRules(saved);
      setInitialRules(saved);
      setMessage('Attendance rules saved.');
    } catch (error) {
      setMessage(error?.message || 'Unable to save attendance rules.');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async (event) => {
    event.preventDefault();
    if (!holidayForm.date || !holidayForm.name.trim()) return;
    await attendanceManagerService.createHoliday({
      ...holidayForm,
      name: holidayForm.name.trim(),
    });
    setHolidayForm({
      date: '',
      name: '',
      holiday_type: 'Company',
      is_optional: false,
    });
    setHolidays(await attendanceManagerService.getHolidays());
  };

  const removeHoliday = async (id) => {
    await attendanceManagerService.deleteHoliday(id);
    setHolidays((current) => current.filter((item) => item.id !== id));
  };

  if (loading || !rules) {
    return <div className="attendance-rules-loading">Loading attendance rules…</div>;
  }

  const autoMode = ['auto_checkout', 'hybrid'].includes(rules.attendanceMode);
  const multiMode = rules.attendanceMode === 'multi';

  return (
    <div className="attendance-rules-page">
      <header className="attendance-rules-header">
        <div>
          <h2>Attendance Rules</h2>
          <p>Choose how employees punch attendance and how missed punches are handled.</p>
        </div>

        <button
          type="button"
          className="attendance-rules-save"
          disabled={!dirty || saving}
          onClick={save}
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Rules'}
        </button>
      </header>

      {message && <div className="attendance-rules-message">{message}</div>}

      <section className="attendance-rule-section">
        <div className="attendance-rule-title">
          <Clock3 size={16} />
          <div>
            <h3>Punch Mode</h3>
            <p>Company-wide attendance behavior for check-in and check-out.</p>
          </div>
        </div>

        <AttendanceModeSelector
          value={rules.attendanceMode}
          onChange={(value) => change('attendanceMode', value)}
        />

        {multiMode && (
          <label className="attendance-rule-field">
            <span>Maximum Sessions Per Day</span>
            <small>Use 0 for unlimited sessions.</small>
            <input
              type="number"
              min="0"
              value={rules.maxSessionsPerDay}
              onChange={(event) => change('maxSessionsPerDay', Math.max(0, Number(event.target.value)))}
            />
          </label>
        )}
      </section>

      <div className="attendance-rules-columns">
        <section className="attendance-rule-section">
          <div className="attendance-rule-title">
            <Clock3 size={16} />
            <div>
              <h3>Shift Timing</h3>
              <p>Used for late calculation, overtime and automatic checkout.</p>
            </div>
          </div>

          <div className="attendance-rule-form-grid">
            <label className="attendance-rule-field">
              <span>Shift Start</span>
              <input type="time" value={rules.startTime} onChange={(e) => change('startTime', e.target.value)} />
            </label>
            <label className="attendance-rule-field">
              <span>Shift End</span>
              <input type="time" value={rules.endTime} onChange={(e) => change('endTime', e.target.value)} />
            </label>
            <label className="attendance-rule-field">
              <span>Late Grace Minutes</span>
              <input type="number" min="0" value={rules.lateGraceMinutes} onChange={(e) => change('lateGraceMinutes', Number(e.target.value))} />
            </label>
            <label className="attendance-rule-field">
              <span>Overtime After Minutes</span>
              <input type="number" min="0" value={rules.overtimeAfterMinutes} onChange={(e) => change('overtimeAfterMinutes', Number(e.target.value))} />
            </label>
            {autoMode && (
              <label className="attendance-rule-field attendance-rule-field-wide">
                <span>Auto Checkout Worker Grace</span>
                <small>System waits this many minutes before processing, but worked time closes at shift end.</small>
                <input
                  type="number"
                  min="0"
                  value={rules.autoCheckoutGraceMinutes}
                  onChange={(e) => change('autoCheckoutGraceMinutes', Number(e.target.value))}
                />
              </label>
            )}
          </div>
        </section>

        <section className="attendance-rule-section">
          <div className="attendance-rule-title">
            <TriangleAlert size={16} />
            <div>
              <h3>Missing Punch Policy</h3>
              <p>What happens if an employee forgets to check out.</p>
            </div>
          </div>

          <label className="attendance-rule-field">
            <span>Policy</span>
            <select
              value={rules.missingPunchPolicy}
              onChange={(e) => change('missingPunchPolicy', e.target.value)}
            >
              <option value="request_correction">Request Punch Correction</option>
              <option value="auto_close">Auto Close at Shift End</option>
              <option value="mark_missing">Keep as Missing Clock Out</option>
            </select>
          </label>

          <label className="attendance-rule-toggle">
            <span>
              <strong>Send Missing Punch Reminder</strong>
              <small>Notify the employee when shift end passes with an open punch.</small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(rules.missingPunchReminderEnabled)}
              onChange={(e) => change('missingPunchReminderEnabled', e.target.checked)}
            />
          </label>

          {rules.missingPunchReminderEnabled && (
            <label className="attendance-rule-field">
              <span>Reminder Delay After Shift End</span>
              <small>Minutes after scheduled shift end.</small>
              <input
                type="number"
                min="0"
                value={rules.missingPunchReminderMinutes}
                onChange={(e) => change('missingPunchReminderMinutes', Math.max(0, Number(e.target.value)))}
              />
            </label>
          )}

          <label className="attendance-rule-toggle">
            <span>
              <strong>Correction Requires Approval</strong>
              <small>Manager must approve employee punch corrections.</small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(rules.correctionApproval)}
              onChange={(e) => change('correctionApproval', e.target.checked)}
            />
          </label>

          <label className="attendance-rule-toggle">
            <span>
              <strong>Prevent Manager Self-Approval</strong>
              <small>Recommended for audit safety.</small>
            </span>
            <input
              type="checkbox"
              checked={!rules.allowSelfApproval}
              onChange={(e) => change('allowSelfApproval', !e.target.checked)}
            />
          </label>
        </section>

        <section className="attendance-rule-section">
          <div className="attendance-rule-title">
            <MapPin size={16} />
            <div>
              <h3>Punch Location</h3>
              <p>Store phone/browser GPS coordinates with check-in and check-out.</p>
            </div>
          </div>

          <label className="attendance-rule-field">
            <span>Punch Location Setting</span>
            <small>Choose whether staff may punch anywhere or only within the workshop boundary.</small>
            <select
              aria-label="Punch location setting"
              value={rules.punchLocationMode || 'anywhere'}
              onChange={(event) => {
                const mode = event.target.value;
                setRules((current) => ({
                  ...current,
                  punchLocationMode: mode,
                  locationRequired: mode === 'workshop',
                  locationTrackingEnabled: mode === 'workshop',
                }));
                setLocationStatus('');
              }}
            >
              <option value="anywhere">Allow Punch Anywhere</option>
              <option value="workshop">Only Within Workshop Radius</option>
            </select>
          </label>

          {rules.punchLocationMode === 'workshop' && (
            <div className="attendance-punch-location-settings">
              <div className="attendance-rule-form-grid">
                <label className="attendance-rule-field">
                  <span>Workshop Latitude</span>
                  <input
                    type="number" step="any" min="-90" max="90"
                    value={rules.workshopLatitude ?? ''}
                    onChange={(event) => change('workshopLatitude', event.target.value === '' ? null : Number(event.target.value))}
                    placeholder="e.g. 11.250000"
                  />
                </label>
                <label className="attendance-rule-field">
                  <span>Workshop Longitude</span>
                  <input
                    type="number" step="any" min="-180" max="180"
                    value={rules.workshopLongitude ?? ''}
                    onChange={(event) => change('workshopLongitude', event.target.value === '' ? null : Number(event.target.value))}
                    placeholder="e.g. 75.800000"
                  />
                </label>
                <label className="attendance-rule-field attendance-rule-field-wide">
                  <span>Allowed Punch Radius (metres)</span>
                  <small>Set 50 to 5000 metres from the workshop location.</small>
                  <input
                    type="number" min="50" max="5000" step="1"
                    value={rules.punchRadiusMeters}
                    onChange={(event) => change('punchRadiusMeters', event.target.value === '' ? '' : Number(event.target.value))}
                  />
                </label>
              </div>
              <button
                type="button"
                className="attendance-rules-save attendance-location-pick"
                onClick={selectCurrentLocation}
                disabled={locating || saving}
              >
                <MapPin size={15} aria-hidden="true" />
                {locating ? 'Finding location…' : 'Use Current Location'}
              </button>
              <small>Use this only when physically at the workshop. GPS permission is requested when you click the button. Save Rules to apply the boundary.</small>
              {locationStatus && <p className="attendance-location-feedback" role="status">{locationStatus}</p>}
            </div>
          )}

          <label className="attendance-rule-toggle">
            <span>
              <strong>Store Punch Location</strong>
              <small>When OFF, new punches do not store or display GPS coordinates.</small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(rules.locationTrackingEnabled)}
              disabled={rules.punchLocationMode === 'workshop'}
              onChange={(e) => {
                if (rules.punchLocationMode === 'workshop') return;
                setRules((current) => ({
                  ...current,
                  locationTrackingEnabled: e.target.checked,
                  locationRequired: e.target.checked ? current.locationRequired : false,
                }));
              }}
            />
          </label>

          <label className="attendance-rule-toggle">
            <span>
              <strong>Require Device Location</strong>
              <small>Reject the punch when location permission is unavailable.</small>
            </span>
            <input
              type="checkbox"
              disabled={!rules.locationTrackingEnabled || rules.punchLocationMode === 'workshop'}
              checked={Boolean(rules.locationRequired)}
              onChange={(e) => change('locationRequired', e.target.checked)}
            />
          </label>
        </section>

        <section className="attendance-rule-section">
          <div className="attendance-rule-title">
            <CalendarDays size={16} />
            <div>
              <h3>Weekly Off</h3>
              <p>Configure non-working days and optional attendance.</p>
            </div>
          </div>

          <div className="attendance-weekdays">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day) => (
              <button
                key={day}
                type="button"
                className={(rules.weekendDays || []).includes(day) ? 'is-selected' : ''}
                onClick={() => toggleWeekend(day)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          <label className="attendance-rule-field">
            <span>Weekly Off Attendance Policy</span>
            <select value={rules.weekendAttendancePolicy} onChange={(e) => change('weekendAttendancePolicy', e.target.value)}>
              <option value="weekly_off">Block Attendance / Weekly Off</option>
              <option value="allow">Allow Attendance</option>
              <option value="allow_overtime">Allow Attendance + Overtime</option>
            </select>
          </label>

          <label className="attendance-rule-toggle">
            <span>
              <strong>Alternate Saturday</strong>
              <small>Apply a recurring Saturday off pattern.</small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(rules.alternateSaturdayEnabled)}
              onChange={(e) => change('alternateSaturdayEnabled', e.target.checked)}
            />
          </label>

          {rules.alternateSaturdayEnabled && (
            <label className="attendance-rule-field">
              <span>Saturday Pattern</span>
              <select value={rules.alternateSaturdayPattern} onChange={(e) => change('alternateSaturdayPattern', e.target.value)}>
                <option>1st & 3rd Saturday</option>
                <option>2nd & 4th Saturday</option>
                <option>1st, 3rd & 5th Saturday</option>
                <option>All Saturdays</option>
              </select>
            </label>
          )}

          <label className="attendance-rule-field">
            <span>Effective From</span>
            <input
              type="date"
              value={rules.weekendEffectiveFrom || ''}
              onChange={(e) => change('weekendEffectiveFrom', e.target.value)}
            />
          </label>
        </section>
      </div>

      <section className="attendance-rule-section">
        <div className="attendance-rule-title">
          <BellRing size={16} />
          <div>
            <h3>Attendance Notifications</h3>
            <p>Control manager alerts for employee requests.</p>
          </div>
        </div>

        <label className="attendance-rule-toggle">
          <span>
            <strong>Leave Request Notifications</strong>
            <small>Notify attendance managers when staff submits a leave request.</small>
          </span>
          <input
            type="checkbox"
            checked={Boolean(rules.leaveRequestNotifications)}
            onChange={(e) => change('leaveRequestNotifications', e.target.checked)}
          />
        </label>

        <label className="attendance-rule-toggle">
          <span>
            <strong>Overtime Request Notifications</strong>
            <small>Notify attendance managers when staff submits overtime.</small>
          </span>
          <input
            type="checkbox"
            checked={Boolean(rules.overtimeRequestNotifications)}
            onChange={(e) => change('overtimeRequestNotifications', e.target.checked)}
          />
        </label>
      </section>

      <section className="attendance-rule-section attendance-holiday-manager">
        <div className="attendance-rule-title">
          <CalendarDays size={16} />
          <div>
            <h3>Company Holidays</h3>
            <p>Add Onam, Christmas and other non-weekend holidays to the attendance calendar.</p>
          </div>
        </div>

        <form className="attendance-holiday-form" onSubmit={addHoliday}>
          <input
            type="date"
            value={holidayForm.date}
            onChange={(e) => setHolidayForm((old) => ({ ...old, date: e.target.value }))}
            required
          />
          <input
            value={holidayForm.name}
            onChange={(e) => setHolidayForm((old) => ({ ...old, name: e.target.value }))}
            placeholder="Onam / Christmas / Company Holiday"
            required
          />
          <select
            value={holidayForm.holiday_type}
            onChange={(e) => setHolidayForm((old) => ({ ...old, holiday_type: e.target.value }))}
          >
            <option value="Company">Company Holiday</option>
            <option value="Festival">Festival</option>
            <option value="Public">Public Holiday</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={holidayForm.is_optional}
              onChange={(e) => setHolidayForm((old) => ({ ...old, is_optional: e.target.checked }))}
            />
            Optional
          </label>
          <button type="submit"><Plus size={13}/>Add Holiday</button>
        </form>

        <div className="attendance-holiday-list">
          {holidays.map((holiday) => (
            <div key={holiday.id}>
              <span>
                <strong>{holiday.name}</strong>
                <small>{holiday.date} · {holiday.holiday_type || holiday.holidayType || 'Company'}</small>
              </span>
              <button type="button" onClick={() => removeHoliday(holiday.id)} aria-label="Delete holiday">
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
          {!holidays.length && <div className="attendance-holiday-empty">No company holidays added yet.</div>}
        </div>
      </section>

      <section className="attendance-rule-note">
        <ShieldCheck size={16} />
        <span>
          Rules are enforced by the backend API, not only hidden in the UI. Employees cannot bypass punch mode restrictions by calling the endpoint directly.
        </span>
      </section>
    </div>
  );
};
