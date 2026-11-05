
import { useState } from 'react';
import { Car, CreditCard, ChevronDown, ChevronUp, FileText, PackageSearch, Plus, ReceiptText, HardHat, WalletCards, UserPlus, Wrench } from 'lucide-react';
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
  const [showMore, setShowMore] = useState(false);
  const visibleActions = actions.filter(([label, , , permission]) =>
    can(permission) && (label !== 'Add Outside Labour' || can('expenses.view'))
  );
  if (!visibleActions.length) return null;
  const primaryLabels = new Set(['New Customer', 'New Job Card', 'Create Invoice', 'Record Payment', 'Add Expense']);
  const primaryActions = visibleActions.filter(([label]) => primaryLabels.has(label));
  const secondaryActions = visibleActions.filter(([label]) => !primaryLabels.has(label));
  const renderAction = ([label, path, Icon]) => (
    <button key={label} type="button" onClick={() => onNavigate(path)}>
      <span className="quick-action-leading"><Icon size={17} aria-hidden="true"/><span>{label}</span></span>
    </button>
  );
  return (
  <article className="dashboard-panel">
    <div className="panel-title">
      <h2>Quick Actions</h2>
      {secondaryActions.length > 0 && <button type="button" className="dashboard-more-toggle"
        aria-expanded={showMore} aria-controls="dashboard-more-actions" onClick={() => setShowMore(value => !value)}>
        {showMore ? 'Fewer Actions' : 'More Actions'}
        {showMore ? <ChevronUp size={16} aria-hidden="true"/> : <ChevronDown size={16} aria-hidden="true"/>}
      </button>}
    </div>
    <div className="quick-actions quick-actions-expanded">{primaryActions.map(renderAction)}</div>
    {secondaryActions.length > 0 && <div id="dashboard-more-actions"
      className="quick-actions quick-actions-expanded dashboard-extra-actions" hidden={!showMore}>
      {secondaryActions.map(renderAction)}
    </div>}
  </article>
  );
};
