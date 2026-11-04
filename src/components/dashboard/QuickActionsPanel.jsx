
import { Car, CreditCard, FileText, PackageSearch, Plus, ReceiptText, HardHat, WalletCards, UserPlus, Wrench } from 'lucide-react';
import { useFeatureAccess } from '../../context/FeatureAccessContext';

const actions = [
  ['New Customer', '/customers/new', UserPlus, 'customers.create'],
  ['New Job Card', '/jobs/new', Wrench, 'jobs.create'],
  ['Create Invoice', '/invoices/new', FileText, 'invoices.create'],
  ['Record Payment', '/payments/new', CreditCard, 'payments.create'],
  ['Add Expense', '/expenses/new', ReceiptText, 'expenses.create'],
  ['Add Outside Labour', '/jobs/outside-labour', HardHat, 'expenses.create'],
  ['Daily Wages', '/payroll/daily-wages', WalletCards, 'payroll.view'],
  ['Stock Issue', '/stock/movements', PackageSearch, 'stock.create'],
  ['Add Vehicle', '/vehicles/new', Car, 'vehicles.create'],
  ['Service Catalog', '/services', Plus, 'services.view'],
];

export const QuickActionsPanel = ({ onNavigate }) => {
  const { can } = useFeatureAccess();
  const visibleActions = actions.filter(([label, , , permission]) =>
    can(permission) && (label !== 'Add Outside Labour' || can('expenses.view'))
  );
  if (!visibleActions.length) return null;
  return (
  <article className="dashboard-panel">
    <div className="panel-title"><h2>Quick Actions</h2><Wrench size={15} /></div>
    <div className="quick-actions quick-actions-expanded">
      {visibleActions.map(([label, path, Icon]) => (
          <button key={label} type="button" onClick={() => onNavigate(path)}>
            <span className="quick-action-leading">
              <Icon size={12} />
              <span>{label}</span>
            </span>
            
          </button>
        ))}
    </div>
  </article>
  );
};
