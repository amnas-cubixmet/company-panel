import { NavLink, useLocation } from 'react-router-dom';
import { useFeatureAccess } from '../../context/FeatureAccessContext';

// Finance is one navigation workspace. Each underlying operation keeps its
// server-side permission checks and canonical Django posting APIs.
const links = [
  { path: '/finance', label: 'Overview', permission: 'payments.view', exact: true },
  { path: '/finance/payments', label: 'Payments', permission: 'payments.view' },
  { path: '/finance/expenses', label: 'Expenses', permission: 'expenses.view' },
  { path: '/finance/accounts', label: 'Cash & Bank', permission: 'payments.view' },
  { path: '/finance/transfers', label: 'Transfers', permission: 'payments.view' },
  { path: '/finance/transactions', label: 'Transactions', permission: 'payments.view' },
  { path: '/finance/accounting', label: 'Accounting', permission: 'payments.view' },
];

export function FinanceNavigation() {
  const { pathname } = useLocation();
  const access = useFeatureAccess();
  if (!pathname.startsWith('/finance')) return null;
  return (
    <nav className="finance-workspace-nav" aria-label="Finance sections">
      {links.filter(link => access.can(link.permission)).map(link => (
        <NavLink
          key={link.path}
          to={link.path}
          end={link.exact}
          className={({ isActive }) => 'finance-workspace-nav-link' + (isActive ? ' is-active' : '')}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
