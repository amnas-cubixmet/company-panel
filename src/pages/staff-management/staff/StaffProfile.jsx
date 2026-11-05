import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  FilePlus2,
  FileText,
  Gauge,
  Lock,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  Star,
  Unlock,
  User,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  StaffAttendanceCalendar,
  StaffAvatar,
  StaffDocumentAddSheet,
  StaffProfileEditSheet,
} from '../../../components/staff-management';
import { getEmployeeLabel } from '../../../components/staff-management/staffDisplay';
import { useAuth } from '../../../hooks/useAuth';
import { useFeatureAccess } from '../../../context/FeatureAccessContext';
import { staffInviteDeliveryMessage, staffInviteErrorMessage, staffInviteStatusLabel } from '../../../utils/staffInviteDelivery';
import { attendanceManagerService } from '../../../services/attendanceManager.service';
import { jobService } from '../../../services/job.service';
import { roleService } from '../../../services/role.service';
import { staffService } from '../../../services/staff.service';
import '../../../styles/staff-mobile-onboarding.css';
import { staffManagementService } from '../../../services/staffManagement.service';

const staffManualWhatsAppUrl = (phone, setupLink) => {
  if (!setupLink) return '';
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if ((!raw.startsWith('+') && digits.length < 11) || !/^[1-9]\d{7,14}$/.test(digits)) return '';
  const draft = `Welcome to CubeGears. Set your workshop password within 24 hours: ${setupLink}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(draft)}`;
};

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const currentMonthValue = () => new Date().toISOString().slice(0, 7);

const displayText = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => displayText(item, ''))
      .filter(Boolean)
      .join(', ');
    return text || fallback;
  }

  if (typeof value === 'object') {
    const preferredKeys = [
      'description',
      'name',
      'title',
      'label',
      'code',
      'status',
      'value',
    ];

    for (const key of preferredKeys) {
      const candidate = value[key];
      if (
        candidate !== null &&
        candidate !== undefined &&
        candidate !== '' &&
        (typeof candidate === 'string' || typeof candidate === 'number')
      ) {
        return String(candidate);
      }
    }

    const primitiveValues = Object.values(value)
      .filter(
        (item) =>
          item !== null &&
          item !== undefined &&
          item !== '' &&
          (typeof item === 'string' || typeof item === 'number'),
      )
      .map(String);

    return primitiveValues.join(' · ') || fallback;
  }

  return String(value);
};


const TABS = [
  ['Overview', User],
  ['Attendance', CalendarDays],
  ['Assigned Work', BriefcaseBusiness],
  ['Performance', Gauge],
  ['Payroll', WalletCards],
  ['Documents', FileText],
  ['Activity History', Activity],
];

const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="staff360-info-item">
    {Icon ? <Icon size={14} /> : null}
    <div>
      <span>{label}</span>
      <strong>{displayText(value)}</strong>
    </div>
  </div>
);

const normalizeDocument = (document = {}) => ({
  ...document,
  name: document.name || document.title || 'Document',
  type: document.type || document.document_type || 'Document',
  uploadedDate:
    document.uploadedDate ||
    document.created_at?.slice?.(0, 10) ||
    '—',
  uploadedBy: document.uploadedBy || document.uploaded_by || 'Admin',
  fileUrl: document.fileUrl || document.file_url || '',
  expiryDate: document.expiryDate || document.expiry_date || '',
  staffId:
    document.staffId ||
    document.employee ||
    document.employeeId ||
    document.employee_id,
});

const normalizeActivity = (item = {}) => ({
  ...item,
  actor: displayText(item.actorName || item.actor, 'System'),
  timestamp:
    item.created_at ||
    item.timestamp ||
    '',
  details: displayText(
    item.details ||
      [item.oldValue, item.newValue].filter(Boolean).join(' → '),
    '',
  ),
});

export const StaffProfile = ({ staffId: staffIdProp, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staffId: routeStaffId } = useParams();
  const staffId = staffIdProp || routeStaffId;
  const goBack = onBack || (() => navigate('/staff-management/staff'));
  const { user } = useAuth();
  const { can } = useFeatureAccess();

  const [staff, setStaff] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [inviteNotice, setInviteNotice] = useState(() => staffInviteDeliveryMessage(location.state?.whatsappInviteStatus));
  const [error, setError] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [setupLink, setSetupLink] = useState(() => location.state?.setupLink || '');
  const [inviteStatus, setInviteStatus] = useState(() => location.state?.whatsappInviteStatus || '');

  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');

  const [attendanceMonth, setAttendanceMonth] = useState(currentMonthValue());
  const [attendanceCalendar, setAttendanceCalendar] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);

  const isOwnProfile =
    Boolean(user?.employeeProfileId) &&
    String(user.employeeProfileId) === String(staffId);

  const canEdit = can('staff.edit');
  const canManageLogin = canEdit && can('company.manage');
  const canReadRoles = can('company.manage');
  const canViewJobs = can('jobs.view');
  const canManageAttendance = can('attendance.manage');
  const canViewPayroll = can('payroll.view');
  const canManagePayroll = can('payroll.edit');
  const visibleTabs = TABS.filter(([tab]) =>
    !['Assigned Work', 'Performance'].includes(tab) || canViewJobs
  ).filter(([tab]) =>
    tab !== 'Attendance' || canManageAttendance || isOwnProfile
  ).filter(([tab]) =>
    tab !== 'Payroll' || canViewPayroll || canManagePayroll || isOwnProfile
  );

  const showToast = (message) => {
    setToastMsg(message);
    window.setTimeout(() => setToastMsg(''), 2600);
  };

  const loadStaff = async () => {
    const profile = isOwnProfile
      ? await staffService.getMyStaff()
      : await staffService.getStaffById(staffId);
    setStaff(profile);
    return profile;
  };

  const loadSupportData = async (profile) => {
    const tasks = [
      roleService.getAssignableRoles(),
      staffManagementService.getTeams(),
      staffManagementService.getShifts(),
      staffManagementService.getSkills(),
      staffManagementService.getDocuments(),
      staffService.getActivities(profile.id),
    ];

    const results = await Promise.allSettled(tasks);
    const value = (index, fallback = []) =>
      results[index]?.status === 'fulfilled'
        ? results[index].value
        : fallback;

    setTeams(Array.isArray(value(0)) ? value(0) : []);
    setShifts(Array.isArray(value(1)) ? value(1) : []);
    setSkills(Array.isArray(value(2)) ? value(2) : []);

    const allDocuments = Array.isArray(value(3)) ? value(3) : [];
    setDocuments(
      allDocuments
        .map(normalizeDocument)
        .filter((document) =>
          String(document.staffId || '') === String(profile.id),
        ),
    );

    setActivities(
      (Array.isArray(value(4)) ? value(4) : []).map(normalizeActivity),
    );

  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    try {
      const profile = await loadStaff();
      await loadSupportData(profile);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load staff profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [staffId]);

  useEffect(() => {
    if (!canViewJobs && ['Assigned Work', 'Performance'].includes(activeTab)) {
      setActiveTab('Overview');
    }
  }, [activeTab, canViewJobs]);

  // Refresh provider delivery state while the official WhatsApp worker is pending.
  // Poll only this authorized staff profile, never another tenant or public URL.
  useEffect(() => {
    if (!canManageLogin || !staff?.id || !['queued', 'sending'].includes(staff.whatsappInviteStatus)) {
      return undefined;
    }
    let mounted = true;
    const timer = window.setInterval(() => {
      staffService.getStaffById(staff.id)
        .then(next => { if (mounted) setStaff(next); })
        .catch(() => {});
    }, 10000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [staff?.id, staff?.whatsappInviteStatus, canManageLogin]);

  // Roles are administrator-only; ordinary staff must not make forbidden
  // /roles/ requests on profile load.
  useEffect(() => {
    if (!staff?.id || !canReadRoles) {
      setRoles([]);
      return undefined;
    }
    let alive = true;
    roleService.getRoles()
      .then((rows) => { if (alive) setRoles(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (alive) setRoles([]); });
    return () => { alive = false; };
  }, [staff?.id, canReadRoles]);

  // Jobs is a separate, optionally paid module: never request /jobs on a
  // free Staff profile. Fetch real jobs only when a permitted work tab opens.
  useEffect(() => {
    if (!staff?.id || !canViewJobs || !['Assigned Work', 'Performance'].includes(activeTab)) {
      setJobs([]);
      setJobsError('');
      setJobsLoading(false);
      return undefined;
    }
    let alive = true;
    setJobs([]);
    setJobsError('');
    setJobsLoading(true);
    jobService.getJobs({ liveOnly: true })
      .then((allJobs) => {
        if (!alive) return;
        const linkedUser = staff.user;
        const matched = (Array.isArray(allJobs) ? allJobs : []).filter((job) =>
          [job.technician, job.technicianId, job.assignedEmployee,
           job.assignedEmployeeId, job.staffId].some((value) =>
            String(value || '') === String(linkedUser || staff.id)
          )
        );
        setJobs(matched);
      })
      .catch((err) => { if (alive) setJobsError(err?.message || 'Unable to load assigned work.'); })
      .finally(() => { if (alive) setJobsLoading(false); });
    return () => { alive = false; };
  }, [staff?.id, staff?.user, activeTab, canViewJobs]);

  useEffect(() => {
    if (!staff || !canManageAttendance) {
      setAttendanceCalendar(null);
      return;
    }

    const [year, month] = attendanceMonth.split('-').map(Number);
    attendanceManagerService
      .getMonthlyCalendar(month, year)
      .then(setAttendanceCalendar)
      .catch(() => setAttendanceCalendar(null));
  }, [staff?.id, attendanceMonth, canManageAttendance]);

  const attendanceEmployee = useMemo(() => {
    const rows = attendanceCalendar?.employees || [];
    return rows.find((row) =>
      String(row.employeeId || '') === String(staff?.id || '') ||
      String(row.staffId || '') === String(staff?.employeeId || ''),
    );
  }, [attendanceCalendar, staff]);

  const attendanceSummary = useMemo(() => {
    const days = Object.values(attendanceEmployee?.days || {});
    const count = (status) =>
      days.filter((day) => day.status === status).length;

    return {
      present: count('Present'),
      absent: count('Absent'),
      leave: count('On Leave'),
      late: days.filter((day) => Number(day.lateMinutes || 0) > 0).length,
      weeklyOff: count('Weekly Off'),
      holidays: count('Holiday'),
    };
  }, [attendanceEmployee]);

  const performance = useMemo(() => {
    const completed = jobs.filter((job) => job.status === 'Delivered');
    const labourRevenue = completed.reduce(
      (sum, job) =>
        sum + Number(job.labourTotal || job.labour_total || 0),
      0,
    );
    const ratings = jobs
      .map((job) => Number(job.customerRating || job.customer_rating || 0))
      .filter((rating) => rating > 0);

    return {
      jobsCompleted: completed.length,
      labourRevenue,
      productiveHours: jobs.reduce(
        (sum, job) => sum + Number(job.bookedHours || job.productiveHours || 0),
        0,
      ),
      utilization: 0,
      comebackJobs: jobs.filter((job) => job.isComeback || job.comeback).length,
      customerRating: ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0,
      averageLabourValue: completed.length
        ? labourRevenue / completed.length
        : 0,
    };
  }, [jobs, staff]);

  const handleSendInvite = async () => {
    if (inviteBusy) return;
    setInviteBusy(true);
    setInviteError('');
    setInviteNotice('');
    setSetupLink('');
    try {
      const result = await staffService.sendLoginInvite(staff.id);
      const status = result?.whatsappInviteStatus || '';
      setInviteStatus(status);
      setSetupLink(['manual', 'failed'].includes(status) ? result?.setupLink || '' : '');
      const info = staffInviteDeliveryMessage(status) || 'Password setup request recorded.';
      setInviteNotice(info);
      showToast(info);
      await refreshAll();
    } catch (requestError) {
      setInviteError(staffInviteErrorMessage(requestError));
    } finally {
      setInviteBusy(false);
    }
  };

  const handleToggleAccount = async () => {
    try {
      await staffService.setLoginAccess(staff.id, staff.loginStatus === 'Disabled' || staff.loginStatus === 'Not Invited');
      showToast(staff.loginStatus === 'Disabled' ? 'Login enabled. Send a new setup link if required.' : 'Login disabled without changing payroll or employment status.');
      setSetupLink('');
      await refreshAll();
    } catch (requestError) {
      showToast(requestError?.message || 'Unable to change login access.');
    }
  };

  const handleCopySetup = async () => {
    if (!setupLink) return;
    try {
      await navigator.clipboard.writeText(setupLink);
      setInviteNotice('Secure setup link copied. Share only with this staff member.');
    } catch {
      setInviteError('Clipboard is unavailable. Select and copy the secure URL.');
    }
  };


  const handleEdit = async (payload) => {
    await staffService.updateStaff(staff.id, payload);
    showToast('Staff profile updated.');
    await refreshAll();
  };

  const handleAddDocument = async (payload) => {
    await staffManagementService.createDocument(staff.id, payload);
    showToast('Document added.');
    await refreshAll();
  };

  if (loading) {
    return <div className="staff-workshop-empty">Loading staff profile…</div>;
  }

  if (error || !staff) {
    return (
      <div className="staff-workshop-empty">
        {error || 'Staff profile not found.'}
      </div>
    );
  }

  return (
    <div className="staff-profile staff360">
      {toastMsg && <div className="staff360-toast" role="status">{toastMsg}</div>}
      {inviteError && (
        <div className="staff-directory-message" role="alert">
          <span>{inviteError}</span>
          <button type="button" aria-label="Dismiss invite error" onClick={() => setInviteError('')}>Dismiss</button>
        </div>
      )}
      {inviteNotice && (
        <div className="staff-directory-message" role="status">
          <span>{inviteNotice}</span>
          <button type="button" aria-label="Dismiss WhatsApp invitation notice" onClick={() => setInviteNotice('')}>Dismiss</button>
        </div>
      )}

      <div className="staff-profile-topbar">
        <button type="button" onClick={goBack} aria-label="Back to staff">
          <ArrowLeft size={15} />
        </button>
        <div>
          <h2>Staff Profile</h2>
          <p>Attendance, assignments, performance, payroll, documents and activity.</p>
        </div>
      </div>

      <section className="staff-profile-hero staff360-hero">
        <div className="staff360-person">
          <StaffAvatar staff={staff} size="lg" />
          <div>
            <div className="staff360-name-row">
              <h3>{staff.name}</h3>
              <span className={'staff360-status is-' + String(staff.employmentStatus || '').toLowerCase().replaceAll(' ', '-')}>
                {staff.employmentStatus}
              </span>
            </div>
            <p>
              {getEmployeeLabel(staff)} · {displayText(staff.designation, 'Staff')} · {displayText(staff.department, 'Unassigned Team')}
            </p>
            <div className="staff360-contact-line">
              <span><Phone size={12}/>{staff.phone || 'No phone'}</span>
            </div>
          </div>
        </div>

        {(canEdit || canManagePayroll) && (
          <div className="staff360-hero-actions">
            {canManagePayroll && (
              <button type="button" className="staff360-secondary-button" onClick={() => navigate(`/staff/${staff.id}/wages`)}>
                <WalletCards size={14}/>
                Daily Wage Account
              </button>
            )}
            {canManageLogin && (
              <>
                <button type="button" className="staff360-secondary-button" onClick={() => setEditOpen(true)}>
                  <Pencil size={14}/>
                  Edit Profile
                </button>
                <button type="button" onClick={handleSendInvite} disabled={inviteBusy} className="staff360-secondary-button">
                  <Send size={14}/>
                  Resend Setup Link
                </button>
                <button type="button" onClick={handleToggleAccount} className="staff360-secondary-button">
                  {staff.loginStatus === 'Disabled' ? <Unlock size={14}/> : <Lock size={14}/>}
                  {staff.loginStatus === 'Disabled' ? 'Enable Login' : 'Disable Login'}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {canManageLogin && (
        <section className="staff-setup-link-panel" aria-label="Staff mobile login invitation">
          <h3>Mobile + Password Login</h3>
          <p><strong>Login:</strong> {staff.loginStatus || 'Not Invited'}</p>
          <p><strong>WhatsApp:</strong> {staffInviteStatusLabel(staff.whatsappInviteStatus)}</p>
          <p role="status">{staffInviteDeliveryMessage(staff.whatsappInviteStatus)}</p>
          {staff.whatsappInviteFailure && <p role="status">{staff.whatsappInviteFailure}</p>}
          {setupLink && ['manual', 'failed'].includes(inviteStatus) && <>
            <label htmlFor="staff-setup-url">Latest one-time setup URL (valid for 24 hours)</label>
            <input id="staff-setup-url" type="text" readOnly value={setupLink}
              onFocus={(event) => event.target.select()}/>
            <div className="staff-setup-link-actions">
              <button type="button" onClick={handleCopySetup}><Copy size={16}/> Copy Setup Link</button>
              {staff.whatsappConsent && staffManualWhatsAppUrl(staff.phone, setupLink) && <a href={staffManualWhatsAppUrl(staff.phone, setupLink)}
                target="_blank" rel="noreferrer"><ExternalLink size={16}/> Send via WhatsApp</a>}
            </div>
            <p>WhatsApp opens with a draft; review and press Send. Do not post this private password link in groups or public channels.</p>
          </>}
          {['manual', 'failed'].includes(inviteStatus) && !setupLink && <p role="status">To obtain a new secure link, use Resend Setup Link above. Only an authorized admin can issue it.</p>}
        </section>
      )}

      <nav className="staff-profile-tabs staff360-tabs" aria-label="Staff profile sections">
        <div className="scroll-hidden">
          {visibleTabs.map(([tab, Icon]) => (
            <button
              type="button"
              key={tab}
              className={activeTab === tab ? 'is-active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              <Icon size={12} />
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <section className="staff-profile-panel staff360-panel">
        {activeTab === 'Overview' && (
          <div className="staff360-overview">
            <div className="staff360-overview-commandbar">
              <div>
                <strong>Profile Overview</strong>
                <span>Use Edit Profile to change role, team, shift, skills or employment details.</span>
              </div>
              {canEdit && (
                <button type="button" onClick={() => setEditOpen(true)}>
                  <Pencil size={13}/>
                  Edit / Change
                </button>
              )}
            </div>

            <div className="staff360-section">
              <div className="staff360-section__title"><User size={15}/> Personal & Employment</div>
              <div className="staff360-info-grid">
                <InfoItem label="Employee Number" value={getEmployeeLabel(staff)} icon={ShieldCheck} />
                <InfoItem label="Full Name" value={staff.name} icon={User} />
                <InfoItem label="Phone" value={staff.phone} icon={Phone} />
                <InfoItem label="Joining Date" value={staff.joiningDate} icon={CalendarDays} />
                <InfoItem label="Status" value={staff.employmentStatus} icon={ShieldCheck} />
              </div>
            </div>

            <div className="staff360-section">
              <div className="staff360-section__title"><Building2 size={15}/> Workshop Assignment</div>
              <div className="staff360-info-grid">
                <InfoItem label="Role" value={staff.role} icon={ShieldCheck} />
                <InfoItem label="Team / Department" value={staff.department} icon={Building2} />
                <InfoItem label="Branch" value={staff.branch?.name || staff.branch} icon={Building2} />
                <InfoItem label="Shift" value={staff.shift} icon={Clock3} />
                <InfoItem label="Login Status" value={staff.loginStatus} icon={ShieldCheck} />
              </div>
            </div>

            <div className="staff360-section">
              <div className="staff360-section__title"><Wrench size={15}/> Skills & Specialization</div>
              <div className="staff-chip-row">
                {staff.skills?.length
                  ? staff.skills.map((skill, index) => {
                      const label = displayText(skill, 'Skill');
                      return <span key={String(skill?.id || skill?.name || label || index)}>{label}</span>;
                    })
                  : <span className="is-muted">No skills assigned</span>}
              </div>
            </div>

            <div className="staff360-quick-grid">
              {[
                ['Attendance', 'Attendance', CalendarDays],
                ['Assigned Work', 'Assigned Work', BriefcaseBusiness],
                ['Payroll', 'Payroll', WalletCards],
                ['Documents', 'Documents', FileText],
              ].map(([label, tab, Icon]) => (
                <button type="button" key={label} onClick={() => setActiveTab(tab)}>
                  <Icon size={14}/>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Attendance' && (
          <div className="staff360-tab-stack">
            {canManageAttendance ? (
              <>
                <div className="staff360-metric-grid is-six">
                  <div><span>Present</span><strong>{attendanceSummary.present}</strong></div>
                  <div><span>Absent</span><strong>{attendanceSummary.absent}</strong></div>
                  <div><span>Leave</span><strong>{attendanceSummary.leave}</strong></div>
                  <div><span>Weekly Off</span><strong>{attendanceSummary.weeklyOff}</strong></div>
                  <div><span>Holiday</span><strong>{attendanceSummary.holidays}</strong></div>
                  <div><span>Shift</span><strong>{displayText(staff.shift)}</strong></div>
                </div>

                <StaffAttendanceCalendar
                  monthValue={attendanceMonth}
                  onMonthChange={setAttendanceMonth}
                  calendar={attendanceCalendar}
                  employee={attendanceEmployee}
                  onDayOpen={(date) =>
                    navigate(
                      `/attendance-manager/team-review/${encodeURIComponent(staff.employeeId || staff.id)}/${date}`,
                    )
                  }
                />
              </>
            ) : (
              <div className="staff-workshop-empty">
                Attendance calendar is available to attendance managers.
              </div>
            )}
          </div>
        )}

        {activeTab === 'Assigned Work' && (
          <div className="staff360-tab-stack">
            {jobsLoading && <div className="staff-workshop-empty" role="status">Loading assigned work…</div>}
            {jobsError && <div className="staff-directory-message is-error" role="alert">{jobsError}</div>}
            {!jobsLoading && !jobsError && <>
            <div className="staff360-work-summary">
              <div><span>Total Assigned</span><strong>{jobs.length}</strong></div>
              <div><span>In Progress</span><strong>{jobs.filter((job) => job.status === 'In Progress').length}</strong></div>
              <div><span>Waiting Parts</span><strong>{jobs.filter((job) => job.status === 'Waiting for Parts' || job.status === 'Waiting Parts').length}</strong></div>
              <div><span>Completed</span><strong>{jobs.filter((job) => job.status === 'Delivered' || job.status === 'Completed').length}</strong></div>
            </div>

            <div className="staff360-job-list">
              {jobs.map((job) => (
                <article key={job.id} className="staff360-job-card">
                  <div>
                    <span>{job.jobNumber || job.id}</span>
                    <strong>{displayText(job.vehicle || job.vehicleReg || job.vehicleInfo, 'Vehicle')}</strong>
                    <p>{displayText(job.work || job.notes, 'Assigned workshop work')}</p>
                  </div>

                  <div className="staff360-job-side">
                    <b>{displayText(job.status, 'Assigned')}</b>
                    <span>
                      {job.bookedHours
                        ? `${job.bookedHours}h assigned`
                        : money(job.labourTotal || job.labour_total || 0) + ' labour'}
                    </span>
                  </div>

                  {Number(job.progress) >= 0 && job.progress !== undefined && (
                    <div className="staff-progress">
                      <i style={{ width: `${Math.min(100, Number(job.progress || 0))}%` }} />
                    </div>
                  )}

                  <div className="staff360-job-feedback">
                    <span>Customer Feedback</span>
                    <strong>
                      {Number(job.customerRating || job.customer_rating || 0) > 0
                        ? `${job.customerRating || job.customer_rating}/5`
                        : 'No feedback'}
                    </strong>
                    {(job.customerFeedback || job.customer_feedback) && (
                      <p>{displayText(job.customerFeedback || job.customer_feedback, '')}</p>
                    )}
                  </div>

                  {canViewJobs && (
                    <button type="button" onClick={() => navigate(`/jobs/${job.id}/overview`)}>
                      Open Job
                    </button>
                  )}
                </article>
              ))}

              {!jobs.length && (
                <div className="staff-workshop-empty">
                  No jobs are currently linked to this staff member.
                </div>
              )}
            </div>
            </>}
          </div>
        )}

        {activeTab === 'Performance' && (
          <div className="staff360-tab-stack">
            {jobsLoading && <div className="staff-workshop-empty" role="status">Loading performance data…</div>}
            {jobsError && <div className="staff-directory-message is-error" role="alert">{jobsError}</div>}
            {!jobsLoading && !jobsError && <>
            <div className="staff360-metric-grid">
              <div><span>Jobs Completed</span><strong>{performance.jobsCompleted}</strong></div>
              <div><span>Labour Revenue</span><strong>{money(performance.labourRevenue)}</strong></div>
              <div><span>Avg Labour / Job</span><strong>{money(performance.averageLabourValue || (performance.jobsCompleted ? performance.labourRevenue / performance.jobsCompleted : 0))}</strong></div>
              <div><span>Productive Hours</span><strong>{Number(performance.productiveHours || 0).toFixed(1)}h</strong></div>
              <div><span>Comeback Jobs</span><strong>{performance.comebackJobs}</strong></div>
              <div>
                <span>Customer Feedback</span>
                <strong>
                  {performance.customerRating
                    ? Number(performance.customerRating).toFixed(1)
                    : '—'} <Star size={12}/>
                </strong>
              </div>
            </div>

            <div className="staff360-note-card">
              <Gauge size={16}/>
              <div>
                <strong>Performance is work-linked</strong>
                <span>Completed jobs, labour value, comeback jobs and available customer ratings are used here.</span>
              </div>
            </div>
            </>}
          </div>
        )}

        {activeTab === 'Payroll' && (
          <div className="staff360-tab-stack">
            {canViewPayroll || isOwnProfile ? (
              <div className="staff360-pay-config-command">
                <div>
                  <WalletCards size={17}/>
                  <div>
                    <strong>Daily Wage Account</strong>
                    <span>Approved attendance, extra earnings, running balance and payment history.</span>
                  </div>
                </div>
                <button type="button" onClick={() => navigate(`/staff/${staff.id}/wages`)}>
                  <WalletCards size={14}/> Open Wage Account
                </button>
              </div>
            ) : (
              <div className="staff-workshop-empty">Payroll access is not assigned to your role.</div>
            )}
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="staff360-tab-stack">
            <div className="staff360-document-head">
              <div>
                <strong>Employment Documents</strong>
                <span>ID proof, licences, certificates, offer letters and contracts.</span>
              </div>
              <div className="staff360-document-actions">
                <span className={documents.length ? 'is-complete' : 'is-missing'}>
                  {documents.length ? `${documents.length} files` : 'No files'}
                </span>
                {canEdit && (
                  <button type="button" onClick={() => setDocumentOpen(true)}>
                    <FilePlus2 size={13}/>
                    Add Document
                  </button>
                )}
              </div>
            </div>

            {documents.length ? (
              <div className="staff360-document-list">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl || undefined}
                    target={doc.fileUrl ? '_blank' : undefined}
                    rel="noreferrer"
                    onClick={(event) => {
                      if (!doc.fileUrl) event.preventDefault();
                    }}
                  >
                    <FileText size={15}/>
                    <div>
                      <strong>{doc.name}</strong>
                      <span>
                        {doc.type} · {doc.uploadedDate}
                        {doc.expiryDate ? ` · Expires ${doc.expiryDate}` : ''}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="staff-workshop-empty">
                No staff documents added yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'Activity History' && (
          <div className="staff360-activity-list">
            {activities.length ? (
              activities.map((item) => (
                <div key={item.id}>
                  <span className="staff360-activity-icon"><Activity size={14}/></span>
                  <div>
                    <strong>{displayText(item.action, 'Activity')}</strong>
                    {item.details && <p>{displayText(item.details, '')}</p>}
                    <small>
                      {item.actor || 'System'}
                      {item.timestamp
                        ? ` · ${new Date(item.timestamp).toLocaleString('en-IN')}`
                        : ''}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className="staff-workshop-empty">No activity history available.</div>
            )}
          </div>
        )}
      </section>

      {canEdit && (
        <>
          <StaffProfileEditSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            staff={staff}
            roles={roles}
            canAssignRole={can('company.manage')}
            teams={teams}
            shifts={shifts}
            skills={skills}
            onSave={handleEdit}
          />

          <StaffDocumentAddSheet
            open={documentOpen}
            onClose={() => setDocumentOpen(false)}
            onSave={handleAddDocument}
          />
        </>
      )}
    </div>
  );
};
