import { useContext } from 'react';
import { Store } from 'lucide-react';
import { CompanyContext } from '../../context/CompanyContext';
import { CubixgearLogo } from './CubixgearLogo';

/** Customer-owned workshop identity; cubixgear is a secondary platform credit.
 * This shared component renders the same tenant branding on every screen.
 */
export function WorkshopIdentity({ mode = 'mobile', collapsed = false }) {
  const { company, logoUrl } = useContext(CompanyContext);
  const companyName = typeof company?.name === 'string' && company.name.trim()
    ? company.name.trim() : 'Workshop';
  const logoClass = mode === 'mobile'
    ? 'mobile-brand-icon mobile-company-logo'
    : mode === 'sidebar' ? 'sidebar-logo' : 'mobile-drawer-logo';
  const copyClass = mode === 'mobile'
    ? 'mobile-brand-copy' : mode === 'sidebar' ? 'sidebar-brand-copy' : 'mobile-drawer-brand-copy';

  return (
    <>
      <span
        className={`${logoClass} workshop-identity-logo`}
        aria-hidden="true"
        title={collapsed ? companyName : undefined}
      >
        {logoUrl
          ? <img className="workshop-company-logo-image" src={logoUrl} alt="" decoding="async" />
          : <Store size={20} strokeWidth={1.9} />}
      </span>
      {!collapsed && (
        <span className={`${copyClass} workshop-identity-copy`}>
          <strong className="workshop-company-name">{companyName}</strong>
          <small className="workshop-platform-brand mobile-powered-brand">
            <span className="workshop-platform-logo mobile-powered-logo" aria-hidden="true">
              <CubixgearLogo />
            </span>
            <span>cubixgear</span>
          </small>
        </span>
      )}
    </>
  );
}
