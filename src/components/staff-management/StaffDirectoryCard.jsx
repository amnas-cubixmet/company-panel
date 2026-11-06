
import {
  Building2,
  CalendarDays,
  Eye,
  Power,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { StaffAvatar } from './StaffAvatar';
import { getEmployeeLabel } from './staffDisplay';

const tone = (status = '') => {
  if (status === 'Active') return 'success';
  if (['Probation', 'Notice Period'].includes(status)) return 'warning';
  return 'danger';
};

export const StaffDirectoryCard = ({
  staff,
  index,
  onOpen,
  onToggleStatus,
  payPlan,
  canViewPay = false,
  onOpenWages,
}) => (
  <article className="staff-directory-card" onClick={onOpen}>
    <header className="staff-directory-card__head">
      <div className="staff-directory-person">
        <StaffAvatar staff={staff} size="md" />
        <div>
          <strong>{staff.name}</strong>
          <span>{getEmployeeLabel(staff, index)} · {staff.role || 'No role'}</span>
        </div>
      </div>

      <span className={`staff-directory-status is-${tone(staff.employmentStatus)}`}>
        {staff.employmentStatus || 'Active'}
      </span>
    </header>

    <div className="staff-directory-details">
      <div className="staff-directory-fact">
        <Building2 size={18} aria-hidden="true" />
        <div className="staff-directory-fact__copy">
          <small>Branch</small>
          <span>{staff.branch || 'No branch'}</span>
        </div>
      </div>
      <div className="staff-directory-fact">
        <UserRound size={18} aria-hidden="true" />
        <div className="staff-directory-fact__copy">
          <small>Company Role</small>
          <span>{staff.role || 'No role'}</span>
        </div>
      </div>
      <div className="staff-directory-fact">
        <ShieldCheck size={18} aria-hidden="true" />
        <div className="staff-directory-fact__copy">
          <small>Shift</small>
          <span>{staff.shift || 'No shift assigned'}</span>
        </div>
      </div>
      <div className="staff-directory-fact">
        <CalendarDays size={18} aria-hidden="true" />
        <div className="staff-directory-fact__copy">
          <small>Mobile / Login</small>
          <span>{staff.phone || '—'} · {staff.loginStatus || 'Not Invited'}</span>
        </div>
      </div>
      {canViewPay && (
        <div className="staff-directory-fact staff-directory-fact--wage">
          <WalletCards size={18} aria-hidden="true" />
          <div className="staff-directory-fact__copy">
            <small>Daily wage</small>
            <span>
              {payPlan?.dailyRate != null && payPlan.dailyRate !== '' && Number.isFinite(Number(payPlan.dailyRate))
                ? `₹${Number(payPlan.dailyRate).toLocaleString('en-IN')}/day`
                : 'Not configured'}
            </span>
          </div>
        </div>
      )}
    </div>

    {!!staff.skills?.length && (
      <div className="staff-directory-skills">
        {staff.skills.slice(0, 3).map((skill) => (
          <span key={typeof skill === 'string' ? skill : skill.id}>
            {typeof skill === 'string' ? skill : skill.name}
          </span>
        ))}
        {staff.skills.length > 3 && <span>+{staff.skills.length - 3}</span>}
      </div>
    )}

    <footer className="staff-directory-card__actions">
      <button
        type="button"
        className="staff-view-button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Eye size={13} />
        View Profile
      </button>

      {onOpenWages && (
        <button
          type="button"
          className="staff-pay-config-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenWages();
          }}
        >
          <WalletCards size={13} />
          Daily Wages
        </button>
      )}

      {onToggleStatus && <button
        type="button"
        className={`staff-status-button ${staff.accountStatus === 'Active' ? 'is-danger' : 'is-success'}`}
        title={staff.accountStatus === 'Active' ? 'Deactivate Staff' : 'Activate Staff'}
        aria-label={staff.accountStatus === 'Active' ? `Deactivate ${staff.name}` : `Activate ${staff.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleStatus();
        }}
      >
        <Power size={13} />
      </button>}
    </footer>
  </article>
);
