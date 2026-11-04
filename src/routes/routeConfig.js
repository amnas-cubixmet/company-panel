import {
  LayoutDashboard, Clock, UserCheck, Users, DollarSign, UserPlus, Car, Wrench, Coins,
  ClipboardList, Boxes, FileText, CreditCard, Receipt, BarChart3, Bell, Settings
} from 'lucide-react';

export const ROUTE_SECTIONS = {
  MAIN: 'Main',
  ATTENDANCE_HR: 'Attendance & HR',
  OPERATIONS: 'Workshop Operations',
  FINANCE: 'Finance & Billing',
  ANALYTICS_SYSTEM: 'Analytics & Settings'
};

export const routeConfig = [
  { id: 'credits', label: 'SaaS Account', path: '/account', icon: Coins, section: ROUTE_SECTIONS.MAIN, mobilePrimary: false, permission: 'billing.view' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: ROUTE_SECTIONS.MAIN, mobilePrimary: true, permission: 'dashboard.view' },
  { id: 'jobs', label: 'Job Cards', path: '/jobs', icon: ClipboardList, section: ROUTE_SECTIONS.OPERATIONS, mobilePrimary: true, permission: 'jobs.view' },
  {
    id: 'stock', label: 'Inventory Management', path: '/stock', icon: Boxes, section: ROUTE_SECTIONS.OPERATIONS, mobilePrimary: true, permission: 'stock.view'
  },
  {
    id: 'my-attendance', label: 'My Attendance', path: '/my-attendance', icon: Clock, section: ROUTE_SECTIONS.ATTENDANCE_HR, mobilePrimary: false, permission: 'attendance.self'
  },
  {
    id: 'attendance-manager', label: 'Attendance Manager', path: '/attendance-manager', icon: UserCheck, section: ROUTE_SECTIONS.ATTENDANCE_HR, mobilePrimary: false, permission: 'attendance.manage'
  },
  {
    id: 'staff-management', label: 'Staff Management', path: '/staff-management', icon: UserPlus, section: ROUTE_SECTIONS.ATTENDANCE_HR, mobilePrimary: false, permission: 'staff.view'
  },
  {
    id: 'payroll', label: 'Payroll', path: '/payroll', icon: DollarSign, section: ROUTE_SECTIONS.ATTENDANCE_HR, mobilePrimary: false, permission: 'payroll.view'
  },
  { id: 'customers', label: 'Customers', path: '/customers', icon: Users, section: ROUTE_SECTIONS.OPERATIONS, mobilePrimary: false, permission: 'customers.view' },
  { id: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: Car, section: ROUTE_SECTIONS.OPERATIONS, mobilePrimary: false, permission: 'vehicles.view' },
  { id: 'services', label: 'Services Catalog', path: '/services', icon: Wrench, section: ROUTE_SECTIONS.OPERATIONS, mobilePrimary: false, permission: 'services.view' },
  {
    id: 'invoices',
    label: 'Invoices & Billing',
    path: '/invoices',
    icon: FileText,
    section: ROUTE_SECTIONS.FINANCE,
    mobilePrimary: false,
    permission: 'invoices.view'
  },
  { id: 'payments', label: 'Payments', path: '/payments', icon: CreditCard, section: ROUTE_SECTIONS.FINANCE, mobilePrimary: false, permission: 'payments.view' },
  { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Receipt, section: ROUTE_SECTIONS.FINANCE, mobilePrimary: false, permission: 'expenses.view' },
  { id: 'reports', label: 'Reports & BI', path: '/reports', icon: BarChart3, section: ROUTE_SECTIONS.ANALYTICS_SYSTEM, mobilePrimary: false, permission: 'reports.view' },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell, section: ROUTE_SECTIONS.ANALYTICS_SYSTEM, mobilePrimary: false, permission: 'notifications.view' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, section: ROUTE_SECTIONS.ANALYTICS_SYSTEM, mobilePrimary: false, permission: 'settings.view' }
];

export const mobilePrimaryRoutes = routeConfig.filter((route) => route.mobilePrimary);
export const mobileMoreRoutes = routeConfig.filter((route) => !route.mobilePrimary);
