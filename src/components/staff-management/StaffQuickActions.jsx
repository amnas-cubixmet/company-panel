
import { BarChart3, FileText, Plus, ShieldCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

const actions = [
  ['Add Staff', '/staff-management/add', Plus, 'staff.create'],
  ['All Staff', '/staff-management/staff', UsersRound, 'staff.view'],
  ['Roles & Permissions', '/staff-management/roles', ShieldCheck, 'company.manage'],
  ['Performance', '/staff-management/performance', BarChart3, 'staff.view'],
  ['Documents', '/staff-management/documents', FileText, 'staff.view'],
];

export const StaffQuickActions = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <article className="staff-dashboard-panel">
      <header className="staff-dashboard-panel-title">
        <div>
          <h2>Quick Actions</h2>
          <p>Common staff management tools.</p>
        </div>
        <UsersRound size={15} />
      </header>

      <div className="staff-dashboard-quick-actions">
        {actions
          .filter(([, , , permission]) => hasPermission(user, permission))
          .map(([label, path, Icon]) => (
            <button key={path} type="button" onClick={() => onNavigate(path)}>
              <span><Icon size={12} />{label}</span>
              
            </button>
          ))}
      </div>
    </article>
  );
};
