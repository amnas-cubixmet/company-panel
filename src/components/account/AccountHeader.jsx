import { useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import { FilePenLine, HardDrive, ShieldCheck, Coins, FileClock, CreditCard } from 'lucide-react';

// One shared navigation for every Account route. Settings remains available
// outside Account; it is intentionally not a wallet tab.
const tabs=[
 ['overview','Overview','/account',Coins,'billing.view'],
 ['credits-buy','Buy Credits','/account/credits/buy',CreditCard,'billing.view'],
 ['storage','Storage & Logs','/account/storage',HardDrive,'billing.view'],
 ['credits-logs','Logs','/account/credits/logs',FileClock,'billing.view'],
 ['templates','Templates','/account/templates',FilePenLine,'settings.view'],
 ['security','Security','/account/security',ShieldCheck,'settings.view'],
];

export const AccountHeader=({title,subtitle,active,onNavigate,actions})=>{
  const location = useLocation();
  const { can, isCompanyOwner } = useFeatureAccess();
  // Owner's storage usage/audit is part of their free SaaS Account.
  // The server permits read-only storage endpoints via billing.view, but
  // storage.manage remains a separate paid/role-gated permission.
  const visibleTabs = tabs.filter(tab => isCompanyOwner && can(tab[4]));
  const activeIndex = Math.max(0, visibleTabs.findIndex(([key]) => key === active));
  const ActiveIcon = visibleTabs[activeIndex]?.[3] || Coins;
  const tabListRef = useRef(null);

  // Only scroll the tab strip horizontally. Calling scrollIntoView here would
  // also move the dashboard's vertical scroll container unexpectedly.
  useEffect(() => {
    const nav = tabListRef.current;
    const selected = nav?.querySelector('[aria-current="page"]');
    if (!nav || !selected) return;
    const left = selected.offsetLeft - nav.offsetLeft;
    const target = Math.max(0, left - (nav.clientWidth - selected.offsetWidth) / 2);
    nav.scrollLeft = target;
  }, [active]);

  const openTab = (path) => {
    if (location.pathname === path) {
      document.querySelector('.app-scroll-area')?.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    onNavigate(path);
  };

  return <>
    <header className="account-dashboard-header">
      <div className="account-dashboard-title-row">
        <span className="account-dashboard-icon" aria-hidden="true"><ActiveIcon size={21}/></span>
        <div className="account-dashboard-title-copy">
          <span className="account-dashboard-eyebrow">CUBEGEAR <span aria-hidden="true">/</span> ACCOUNT WORKSPACE</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="account-dashboard-header-trailing">
        <span className="account-dashboard-section-count" aria-label={`Section ${activeIndex + 1} of ${tabs.length}`}>
          {String(activeIndex + 1).padStart(2, '0')} <span aria-hidden="true">/</span> {String(visibleTabs.length).padStart(2, '0')}
        </span>
        {actions ? <div className="account-dashboard-actions">{actions}</div> : null}
      </div>
    </header>
    <nav ref={tabListRef} className="account-dashboard-tabs" aria-label="Account navigation">
      {visibleTabs.map(([key,label,path,Icon])=><button
        type="button"
        key={key}
        className={active===key?'is-active':''}
        aria-current={active===key?'page':undefined}
        onClick={()=>openTab(path)}
      ><Icon size={15} aria-hidden="true"/>{label}</button>)}
    </nav>
  </>;
};
