import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowDownLeft, Receipt, Wallet, ArrowLeftRight,
  List, BookOpen, UserRound, Truck, Wrench, FileText
} from 'lucide-react';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import '../../styles/finance-workspace.css';

// One workspace; each existing financial workflow remains the sole source of truth.
const sections = [
  { label: 'Overview', to: '/finance', icon: LayoutDashboard, access: 'payments.view', end: true },
  { label: 'Payments', to: '/finance/payments', icon: ArrowDownLeft, access: 'payments.view' },
  { label: 'Expenses', to: '/finance/expenses', icon: Receipt, access: 'expenses.view' },
  { label: 'Cash & Bank', to: '/finance/accounts', icon: Wallet, access: 'payments.view' },
  { label: 'Transfers', to: '/finance/transfers', icon: ArrowLeftRight, access: 'payments.view' },
  { label: 'Transactions', to: '/finance/transactions', icon: List, access: 'payments.view' },
  { label: 'Accounting', to: '/finance/accounting', icon: BookOpen, access: 'payments.view' },
];

const workflows = [
  { label: 'Customer Invoice', to: '/invoices', icon: FileText, access: 'invoices.view' },
  { label: 'Supplier Purchases & Dues', to: '/suppliers', icon: Truck, access: 'stock.view' },
  { label: 'Employee Wages', to: '/payroll/daily-wages', icon: UserRound, access: 'payroll.view' },
  { label: 'Outside Purchases', to: '/jobs/outside-labour', icon: Wrench, access: 'jobs.view' },
];

export default function FinanceWorkspace() {
  const access = useFeatureAccess();
  const location = useLocation();
  const canView = access.can('payments.view') || access.can('expenses.view');
  if (location.pathname === '/finance' && !access.can('payments.view') && access.can('expenses.view')) {
    return <Navigate to="/finance/expenses" replace />;
  }
  if (!canView) {
    return <div className="finance-workspace-denied" role="alert">
      You do not have permission to view the company finance workspace.
    </div>;
  }
  const current = sections.find((item) =>
    location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );
  return <main className="finance-workspace">
    <div className="finance-workspace-top">
      <div>
        <span className="finance-workspace-eyebrow">CUBIXGEAR · FINANCIAL CONTROL</span>
        <h1>Finance Management</h1>
        <p>One place for collections, costs, Cash/Bank accounts, transfers and audit records.</p>
      </div>
      <span className="finance-workspace-context">{current?.label || 'Overview'}</span>
    </div>
    <nav className="finance-workspace-tabs" aria-label="Finance sections">
      {sections.filter(item => access.can(item.access)).map(({ label, to, icon: Icon, end }) =>
        <NavLink key={to} to={to} end={end} className={({ isActive }) =>
          'finance-workspace-tab' + (isActive ? ' is-active' : '')
        }>
          <Icon size={16} aria-hidden="true" />{label}
        </NavLink>
      )}
    </nav>
    <Outlet />
    <section className="finance-workspace-related" aria-label="Linked finance workflows">
      <div>
        <h2>Related finance workflows</h2>
        <p>Open the original transaction to record its payment once. All posted money movements appear in the same ledger.</p>
      </div>
      <div className="finance-workspace-links">
        {workflows.filter(item => access.can(item.access)).map(({ label, to, icon: Icon }) =>
          <NavLink to={to} key={to}><Icon size={15} aria-hidden="true" />{label}</NavLink>
        )}
      </div>
    </section>
  </main>;
}
