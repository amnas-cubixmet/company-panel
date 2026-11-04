import { Cloud } from 'lucide-react';
import { routeConfig, mobileMoreRoutes, ROUTE_SECTIONS } from './routeConfig';

const accountRoute = {
  id: 'saas-account',
  label: 'Credits & Account',
  path: '/account',
  icon: Cloud,
  section: ROUTE_SECTIONS.ANALYTICS_SYSTEM,
  mobilePrimary: false,
  permission: 'billing.view',
  children: [
    { id: 'credits-overview', label: 'Credit Overview', path: '/account' },
    { id: 'credits-buy', label: 'Buy Credits', path: '/account/credits/buy' },
    { id: 'credits-storage', label: 'Storage', path: '/account/storage' },
    { id: 'credits-logs', label: 'Credit Logs', path: '/account/credits/logs' }
  ]
};

// The primary route already supplies SaaS Account. Enrich it instead of
// registering a second entry for the same account URL on desktop/mobile.
const existingAccountRoute = routeConfig.find(route => route.path === accountRoute.path);
if (existingAccountRoute) existingAccountRoute.children = accountRoute.children;
else routeConfig.splice(routeConfig.length - 1, 0, accountRoute);
if (!mobileMoreRoutes.some(route => route.path === accountRoute.path)) {
  mobileMoreRoutes.push(existingAccountRoute || accountRoute);
}
