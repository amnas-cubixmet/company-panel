import { NavLink, useLocation } from 'react-router-dom';
import { Building2, CreditCard, History, WalletCards } from 'lucide-react';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import { supplierSubmenu } from '../../routes/routeConfig';
import '../../styles/supplier-section-tabs.css';

// The four supplier destinations are page tabs, not sidebar submenus.
// Keep the existing URLs so saved links and permissions remain compatible.
const icons = {
  'supplier-all': Building2,
  'supplier-credits': WalletCards,
  'supplier-purchases': History,
  'supplier-payments': CreditCard,
};

export function SupplierSectionTabs() {
  const access = useFeatureAccess();
  const { pathname, search } = useLocation();
  const selectedSupplier = new URLSearchParams(search).get('supplier');
  const tabs = supplierSubmenu.filter(item =>
    access.can('stock.view') && access.can(item.permission)
  );

  if (!tabs.length) return null;
  return (
    <nav className="cg-supplier-section-tabs" aria-label="Supplier sections">
      {tabs.map(item => {
        const Icon = icons[item.id];
        // Supplier details are part of All Suppliers, not a separate navigation tab.
        const isActive = item.path === '/suppliers'
          ? pathname === '/suppliers' || (
            /^\/suppliers\/[^/]+$/.test(pathname) &&
            !['/suppliers/credits', '/suppliers/purchases', '/suppliers/payments'].includes(pathname)
          )
          : pathname === item.path || pathname.startsWith(item.path + '/');
        return (
          <NavLink key={item.id}
            to={selectedSupplier ? item.path + '?supplier=' + encodeURIComponent(selectedSupplier) : item.path}
            end={item.path === '/suppliers'} aria-current={isActive ? 'page' : undefined}
            className={'cg-supplier-section-tab' + (isActive ? ' is-active' : '')}>
            <Icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
