import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { attendanceManagerService } from '../../services/attendanceManager.service';

const tone = {
  P: 'am-day--present',
  A: 'am-day--absent',
  L: 'am-day--leave',
  H: 'am-day--half',
  WO: 'am-day--off',
  HD: 'am-day--holiday',
  M: 'am-day--missing',
  '': 'am-day--empty',
};

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const MonthlyAttendanceCalendar = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState({ days: 0, employees: [], holidays: [] });
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('All');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await attendanceManagerService.getMonthlyCalendar(month, year);
      setData({
        days: Number(result?.days || new Date(year, month, 0).getDate()),
        employees: Array.isArray(result?.employees) ? result.employees : [],
        holidays: Array.isArray(result?.holidays) ? result.holidays : [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year]);

  const branches = useMemo(
    () => ['All', ...new Set(data.employees.map((item) => item.branch).filter(Boolean))],
    [data.employees],
  );

  const employees = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.employees.filter((item) => {
      const branchMatch = branch === 'All' || item.branch === branch;
      const text = `${item.name} ${item.staffId} ${item.designation} ${item.branch}`.toLowerCase();
      return branchMatch && (!search || text.includes(search));
    });
  }, [data.employees, query, branch]);

  const days = useMemo(
    () => Array.from({ length: data.days }, (_, index) => index + 1),
    [data.days],
  );
  const blocks = [days.slice(0, 15), days.slice(15)];

  const changeMonth = (offset) => {
    const next = new Date(year, month - 1 + offset, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  return (
    <div className="attendance-manager-module attendance-manager-calendar">
      <section className="am-calendar-header am-calendar-header-v2">
        <div>
          <h2>Monthly Attendance Calendar</h2>
        </div>

        <div className="am-calendar-month-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={14} />
          </button>

          <label>
            <CalendarDays size={13} />
            <select aria-label="Select month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
              ))}
            </select>
          </label>

          <select aria-label="Select year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {Array.from({ length: 7 }, (_, index) => now.getFullYear() - 4 + index).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      <section className="am-calendar-filter-card">
        <label className="am-search-field">
          <Search size={14} />
          <input
            type="search"
            aria-label="Search monthly attendance employees"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employee ID, name, role..."
          />
        </label>

        <select aria-label="Filter by branch" value={branch} onChange={(event) => setBranch(event.target.value)}>
          {branches.map((item) => <option key={item}>{item}</option>)}
        </select>
      </section>

      <div className="am-calendar-legend">
        <span><i className="am-day am-day--present">P</i> Present</span>
        <span><i className="am-day am-day--absent">A</i> Absent</span>
        <span><i className="am-day am-day--leave">L</i> Leave</span>
        <span><i className="am-day am-day--half">H</i> Half Day</span>
        <span><i className="am-day am-day--off">WO</i> Weekly Off</span>
        <span><i className="am-day am-day--holiday">HD</i> Holiday</span>
        <span><i className="am-day am-day--missing">M</i> Missing Punch</span>
      </div>

      {data.holidays.length > 0 && (
        <section className="am-calendar-holiday-strip">
          {data.holidays.map((holiday) => (
            <span key={holiday.id}>
              <strong>{holiday.name}</strong>
              <small>{holiday.date}</small>
            </span>
          ))}
        </section>
      )}

      {loading ? (
        <div className="am-loading-state">Loading monthly attendance…</div>
      ) : (
        <div className="am-calendar-blocks">
          {blocks.filter((block) => block.length).map((blockDays, blockIndex) => (
            <section key={blockIndex} className="am-calendar-block">
              <div className="am-calendar-block__title">
                Days {blockDays[0]}–{blockDays[blockDays.length - 1]}
              </div>

              <div className="am-calendar-scroll">
                <div className="am-calendar-grid" style={{ '--am-days': blockDays.length }}>
                  <div className="am-calendar-employee-head">Employee</div>
                  {blockDays.map((day) => (
                    <div key={day} className="am-calendar-day-head">{day}</div>
                  ))}

                  {employees.map((staff) => (
                    <React.Fragment key={staff.employeeId || staff.staffId}>
                      <div className="am-calendar-employee">
                        <strong>{staff.name}</strong>
                        <span>{staff.staffId}</span>
                      </div>

                      {blockDays.map((day) => {
                        const detail = staff.days?.[String(day)] || {};
                        const code = detail.code || '';
                        return (
                          <div
                            key={day}
                            title={`${staff.name} · ${day} ${monthNames[month - 1]} · ${detail.status || 'No record'}`}
                            className={`am-day ${tone[code] || tone['']}`}
                          >
                            {code || '·'}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </section>
          ))}

          {!employees.length && (
            <div className="am-empty-state">No employees matched this month and filter.</div>
          )}
        </div>
      )}
    </div>
  );
};
