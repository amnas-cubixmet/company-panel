
import { BellRing, Car, ClipboardList, Plus, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

const actions = [
  ['Add Customer', '/customers/new', Plus, 'customers.create'],
  ['All Customers', '/customers/all', Users, 'customers.view'],
  ['Vehicles', '/vehicles', Car, 'vehicles.view'],
  ['New Job Card', '/jobs/new', ClipboardList, 'jobs.create'],
  ['Service Reminders', '/customers/reminders', BellRing, 'customers.view'],
];

export const CustomerQuickActions = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <article className="customer-dashboard-panel">
      <header className="customer-dashboard-panel-title">
        <div>
          <h2>Quick Actions</h2>
          <p>Common customer and workshop actions.</p>
        </div>
        <Users size={15} />
      </header>

      <div className="customer-dashboard-quick-actions">
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
