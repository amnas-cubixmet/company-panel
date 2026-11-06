import { useLayoutEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { Footer } from './Footer';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import '../../styles/layout.css';

export const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const scrollAreaRef = useRef(null);

  // This layout uses its own scrolling <main>, not the browser window.
  // Every Account tab and nested storage page starts at its top, including
  // client-side navigation and browser back/forward history.
  useLayoutEffect(() => {
    if (location.pathname === '/account' || location.pathname.startsWith('/account/')) {
      if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
    }
  }, [location.pathname]);
  const isInvoiceWorkspace =
    location.pathname.startsWith('/invoices/') ||
    location.pathname.startsWith('/quotations/');
  const isDashboard = location.pathname === '/dashboard';
  // Overtime approval has its own four-tab navigation: give it the full workspace
  // width without the desktop left sidebar. Other routes keep the normal shell.
  const isOvertimeApprovals = /^\/payroll\/daily-wages\/overtime-approvals\/?$/.test(location.pathname);
  const isJobsWorkspace = /^\/jobs(?:\/|$)/.test(location.pathname);
  const useDashboardSpacing = isDashboard || isJobsWorkspace;

  return (
    <div className={`app-shell${isOvertimeApprovals ? ' is-overtime-full-width' : ''}`}>
      {!isOvertimeApprovals && <Sidebar />}
      <div className="app-main-column">
        <Header />

        <main className="app-scroll-area" ref={scrollAreaRef}>
          <div className={`app-content ${useDashboardSpacing ? 'is-dashboard-content' : ''}`}>
            {!useDashboardSpacing && <AppBreadcrumbs />}
            {children}
          </div>

          {!isInvoiceWorkspace && <Footer />}
        </main>
      </div>

      {/* Keep mobile navigation available on every protected workspace route,
          including invoice and estimate pages; document previews still omit
          the nonessential footer. */}
      <MobileBottomNav />
    </div>
  );
};
