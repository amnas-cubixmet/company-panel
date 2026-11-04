import { API_ENDPOINTS } from '../../api/endpoints';
import { createResourceService } from '../../services/resource.service';

const resource = (endpoint, key, seed, idPrefix) => createResourceService({
  endpoint,
  storageKey: `cubixgear:${key}`,
  seed,
  idPrefix
});

export const resourceConfigs = {
  vehicles: {
    title: 'Vehicles',
    subtitle: 'Manage customer vehicles, registration details and service history.',
    addLabel: 'Add Vehicle',
    service: resource(API_ENDPOINTS.VEHICLES, 'vehicles', [
      { id: 'VEH-1001', registration: 'KL-08-BQ-4581', customer: 'Rahul P', make: 'Toyota', model: 'Innova Crysta', year: 2022, fuel: 'Diesel', status: 'Active' },
      { id: 'VEH-1002', registration: 'KL-07-CS-9902', customer: 'Niya Motors', make: 'Maruti Suzuki', model: 'Baleno', year: 2021, fuel: 'Petrol', status: 'Active' },
      { id: 'VEH-1003', registration: 'KL-10-AX-1134', customer: 'Fahad K', make: 'Hyundai', model: 'Creta', year: 2023, fuel: 'Diesel', status: 'Active' }
    ], 'VEH'),
    fields: [
      { name: 'registration', label: 'Registration Number', required: true },
      { name: 'customer', label: 'Customer', required: true },
      { name: 'make', label: 'Make', required: true },
      { name: 'model', label: 'Model', required: true },
      { name: 'year', label: 'Year', type: 'number', min: 1950 },
      { name: 'fuel', label: 'Fuel', type: 'select', options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] },
      { name: 'vin', label: 'VIN / Chassis Number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], defaultValue: 'Active' },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true }
    ],
    columns: [
      { key: 'registration', label: 'Registration' }, { key: 'customer', label: 'Customer' }, { key: 'make', label: 'Make' }, { key: 'model', label: 'Model' }, { key: 'year', label: 'Year' }, { key: 'status', label: 'Status' }
    ],
    statCards: [
      { label: 'Total Vehicles', value: (rows) => rows.length },
      { label: 'Active', value: (rows) => rows.filter((r) => r.status === 'Active').length }
    ]
  },

  services: {
    title: 'Services Catalog',
    subtitle: 'Create services, categories, labour prices and estimated durations.',
    addLabel: 'Add Service',
    service: resource(API_ENDPOINTS.SERVICES, 'services', [
      { id: 'SRV-1001', code: 'PER-001', name: 'Periodic Maintenance', category: 'Periodic Maintenance', price: 2500, duration: '2 hr', pricingType: 'Fixed', status: 'Active' },
      { id: 'SRV-1002', code: 'AC-001', name: 'AC Inspection', category: 'AC Services', price: 800, duration: '45 min', pricingType: 'Starting', status: 'Active' },
      { id: 'SRV-1003', code: 'DET-001', name: 'Exterior Detailing', category: 'Detailing & Protection', price: 3500, duration: '4 hr', pricingType: 'Fixed', status: 'Active' }
    ], 'SRV'),
    fields: [
      { name: 'code', label: 'Service Code', required: true },
      { name: 'name', label: 'Service Name', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Washing & Cleaning', 'Detailing & Protection', 'Mechanical Works', 'Body Works & Painting', 'Electrical & Diagnostics', 'AC Services', 'Tyre & Wheel', 'Periodic Maintenance', 'Battery Services', 'Accessories Installation'] },
      { name: 'pricingType', label: 'Pricing Type', type: 'select', options: ['Fixed', 'Starting', 'Inspection Based'], defaultValue: 'Fixed' },
      { name: 'price', label: 'Default Labour Charge', type: 'currency' },
      { name: 'duration', label: 'Estimated Duration' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], defaultValue: 'Active' },
      { name: 'description', label: 'Description / Checklist', type: 'textarea', full: true }
    ],
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Service' }, { key: 'category', label: 'Category' }, { key: 'pricingType', label: 'Pricing' }, { key: 'price', label: 'Charge', type: 'currency' }, { key: 'status', label: 'Status' }
    ],
    statCards: [{ label: 'Services', value: (rows) => rows.length }, { label: 'Active', value: (rows) => rows.filter((r) => r.status === 'Active').length }]
  },

  inventory: {
    title: 'Inventory',
    subtitle: 'Manage spare parts, consumables, price, reorder level and branch stock.',
    addLabel: 'Add Item',
    service: resource(API_ENDPOINTS.INVENTORY, 'inventory', [
      { id: 'ITM-1001', sku: 'OIL-5W30-01', name: '5W-30 Engine Oil 4L', category: 'Lubricants', unit: 'Can', cost: 1750, price: 2200, onHand: 18, minimum: 8, rack: 'A-01', status: 'Active' },
      { id: 'ITM-1002', sku: 'FLT-OIL-02', name: 'Oil Filter', category: 'Filters', unit: 'Piece', cost: 280, price: 450, onHand: 6, minimum: 10, rack: 'B-04', status: 'Active' },
      { id: 'ITM-1003', sku: 'BRK-PAD-03', name: 'Front Brake Pad Set', category: 'Brakes', unit: 'Set', cost: 1600, price: 2400, onHand: 9, minimum: 4, rack: 'C-02', status: 'Active' }
    ], 'ITM'),
    fields: [
      { name: 'sku', label: 'SKU', required: true }, { name: 'name', label: 'Item Name', required: true }, { name: 'category', label: 'Category' },
      { name: 'unit', label: 'Unit', type: 'select', options: ['Piece', 'Set', 'Litre', 'Can', 'Box', 'Pair'] },
      { name: 'cost', label: 'Purchase Cost', type: 'currency' }, { name: 'price', label: 'Selling Price', type: 'currency' },
      { name: 'onHand', label: 'Opening / On-hand Qty', type: 'number', min: 0 }, { name: 'minimum', label: 'Minimum Stock', type: 'number', min: 0 },
      { name: 'rack', label: 'Rack / Bin' }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Archived'], defaultValue: 'Active' }
    ],
    columns: [
      { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'onHand', label: 'On Hand' }, { key: 'minimum', label: 'Min' }, { key: 'price', label: 'Selling', type: 'currency' }, { key: 'rack', label: 'Rack' }
    ],
    statCards: [
      { label: 'Items', value: (rows) => rows.length },
      { label: 'Low Stock', value: (rows) => rows.filter((r) => Number(r.onHand) <= Number(r.minimum)).length },
      { label: 'Stock Value', value: (rows) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rows.reduce((a, r) => a + Number(r.onHand || 0) * Number(r.cost || 0), 0)) }
    ]
  },

  stock: {
    title: 'Inventory Management',
    subtitle: 'All stock items with on-hand, reserved, available and reorder controls.',
    addLabel: 'Add Stock Item',
    service: resource(API_ENDPOINTS.STOCK, 'stock-items', [
      { id: 'STK-1001', sku: 'OIL-5W30-01', name: '5W-30 Engine Oil 4L', branch: 'Main Branch', onHand: 18, reserved: 3, minimum: 8, unit: 'Can', rack: 'A-01' },
      { id: 'STK-1002', sku: 'FLT-OIL-02', name: 'Oil Filter', branch: 'Main Branch', onHand: 6, reserved: 2, minimum: 10, unit: 'Piece', rack: 'B-04' },
      { id: 'STK-1003', sku: 'BRK-PAD-03', name: 'Front Brake Pad Set', branch: 'Main Branch', onHand: 9, reserved: 1, minimum: 4, unit: 'Set', rack: 'C-02' }
    ], 'STK'),
    fields: [
      { name: 'sku', label: 'SKU', required: true }, { name: 'name', label: 'Item Name', required: true }, { name: 'branch', label: 'Branch', required: true },
      { name: 'onHand', label: 'On Hand', type: 'number', min: 0 }, { name: 'reserved', label: 'Reserved', type: 'number', min: 0 }, { name: 'minimum', label: 'Minimum Stock', type: 'number', min: 0 },
      { name: 'unit', label: 'Unit' }, { name: 'rack', label: 'Rack / Bin' }
    ],
    columns: [
      { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Item' }, { key: 'branch', label: 'Branch' }, { key: 'onHand', label: 'On Hand' }, { key: 'reserved', label: 'Reserved' }, { key: 'minimum', label: 'Min' }, { key: 'rack', label: 'Rack' }
    ],
    statCards: [{ label: 'Stock Items', value: (rows) => rows.length }, { label: 'Low Stock', value: (rows) => rows.filter((r) => Number(r.onHand) - Number(r.reserved || 0) <= Number(r.minimum)).length }]
  },

  invoices: {
    title: 'Invoices & Billing',
    subtitle: 'Create and manage draft, issued, paid and overdue workshop invoices.',
    addLabel: 'Create Invoice',
    service: resource(API_ENDPOINTS.INVOICES, 'invoices', [
      { id: 'INV-2026-1001', invoiceNo: 'INV-2026-1001', customer: 'Rahul P', vehicle: 'KL-08-BQ-4581', issueDate: '2026-09-12', dueDate: '2026-09-12', total: 7450, paid: 7450, status: 'Paid' },
      { id: 'INV-2026-1002', invoiceNo: 'INV-2026-1002', customer: 'Niya Motors', vehicle: 'KL-07-CS-9902', issueDate: '2026-09-13', dueDate: '2026-09-20', total: 12800, paid: 5000, status: 'Partially Paid' },
      { id: 'INV-2026-1003', invoiceNo: 'INV-2026-1003', customer: 'Fahad K', vehicle: 'KL-10-AX-1134', issueDate: '2026-09-14', dueDate: '2026-09-21', total: 4600, paid: 0, status: 'Unpaid' }
    ], 'INV'),
    fields: [
      { name: 'invoiceNo', label: 'Invoice Number', required: true }, { name: 'customer', label: 'Customer', required: true }, { name: 'vehicle', label: 'Vehicle / Job Reference' },
      { name: 'issueDate', label: 'Issue Date', type: 'date', required: true }, { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'total', label: 'Invoice Total', type: 'currency', required: true }, { name: 'paid', label: 'Paid Amount', type: 'currency' },
      { name: 'status', label: 'Payment Status', type: 'select', options: ['Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Void'], defaultValue: 'Draft' },
      { name: 'notes', label: 'Notes / Terms', type: 'textarea', full: true }
    ],
    columns: [
      { key: 'invoiceNo', label: 'Invoice' }, { key: 'customer', label: 'Customer' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'issueDate', label: 'Issue Date', type: 'date' }, { key: 'total', label: 'Total', type: 'currency' }, { key: 'paid', label: 'Paid', type: 'currency' }, { key: 'status', label: 'Status' }
    ],
    statCards: [
      { label: 'Invoices', value: (rows) => rows.length },
      { label: 'Billed', value: (rows) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rows.reduce((a, r) => a + Number(r.total || 0), 0)) },
      { label: 'Outstanding', value: (rows) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rows.reduce((a, r) => a + Math.max(0, Number(r.total || 0) - Number(r.paid || 0)), 0)) }
    ]
  },

  payments: {
    title: 'Payments',
    subtitle: 'Record customer collections and link them to invoices or advances.',
    addLabel: 'Record Payment',
    service: resource(API_ENDPOINTS.PAYMENTS, 'payments', [
      { id: 'PAY-1001', receiptNo: 'RCT-1001', date: '2026-09-12', customer: 'Rahul P', invoice: 'INV-2026-1001', method: 'UPI', amount: 7450, reference: 'UPI92182', status: 'Completed' },
      { id: 'PAY-1002', receiptNo: 'RCT-1002', date: '2026-09-13', customer: 'Niya Motors', invoice: 'INV-2026-1002', method: 'Bank Transfer', amount: 5000, reference: 'NEFT88721', status: 'Completed' }
    ], 'PAY'),
    fields: [
      { name: 'receiptNo', label: 'Receipt Number', required: true }, { name: 'date', label: 'Payment Date', type: 'date', required: true }, { name: 'customer', label: 'Customer', required: true },
      { name: 'invoice', label: 'Invoice / Advance Ref' }, { name: 'method', label: 'Payment Method', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'] },
      { name: 'amount', label: 'Amount', type: 'currency', required: true }, { name: 'reference', label: 'Reference' }, { name: 'status', label: 'Status', type: 'select', options: ['Completed', 'Pending', 'Refunded'], defaultValue: 'Completed' }
    ],
    columns: [
      { key: 'receiptNo', label: 'Receipt' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'customer', label: 'Customer' }, { key: 'invoice', label: 'Invoice' }, { key: 'method', label: 'Method' }, { key: 'amount', label: 'Amount', type: 'currency' }, { key: 'status', label: 'Status' }
    ],
    statCards: [{ label: 'Payments', value: (rows) => rows.length }, { label: 'Collected', value: (rows) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rows.filter((r) => r.status === 'Completed').reduce((a, r) => a + Number(r.amount || 0), 0)) }]
  },

  reports: {
    title: 'Reports & BI',
    subtitle: 'Save report views with scope, period and export preferences.',
    addLabel: 'Add Report View',
    service: resource(API_ENDPOINTS.REPORTS, 'reports', [
      { id: 'RPT-1001', name: 'Monthly Sales', category: 'Finance', period: 'This Month', branch: 'All Branches', format: 'Excel', status: 'Active' },
      { id: 'RPT-1002', name: 'Stock Valuation', category: 'Stock', period: 'Today', branch: 'Main Branch', format: 'PDF', status: 'Active' },
      { id: 'RPT-1003', name: 'Staff Productivity', category: 'People', period: 'This Month', branch: 'All Branches', format: 'Excel', status: 'Active' }
    ], 'RPT'),
    fields: [
      { name: 'name', label: 'Report Name', required: true }, { name: 'category', label: 'Category', type: 'select', options: ['Operations', 'Finance', 'Stock', 'People', 'Branch Comparison'] },
      { name: 'period', label: 'Default Period', type: 'select', options: ['Today', 'This Week', 'This Month', 'This Year', 'Custom'] }, { name: 'branch', label: 'Branch', defaultValue: 'All Branches' },
      { name: 'format', label: 'Export Format', type: 'select', options: ['Excel', 'CSV', 'PDF', 'Print'] }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], defaultValue: 'Active' }
    ],
    columns: [{ key: 'name', label: 'Report' }, { key: 'category', label: 'Category' }, { key: 'period', label: 'Period' }, { key: 'branch', label: 'Branch' }, { key: 'format', label: 'Export' }, { key: 'status', label: 'Status' }],
    statCards: [{ label: 'Saved Reports', value: (rows) => rows.length }]
  },

  notifications: {
    title: 'Notifications',
    subtitle: 'Operational, finance, stock and account alerts in one inbox.',
    addLabel: 'Add Notification',
    service: resource(API_ENDPOINTS.NOTIFICATIONS, 'notifications', [
      { id: 'NOT-1001', title: 'Low stock: Oil Filter', category: 'Stock', priority: 'High', reference: 'FLT-OIL-02', status: 'Unread', created: '2026-09-14T09:15' },
      { id: 'NOT-1002', title: 'Invoice payment recorded', category: 'Finance', priority: 'Normal', reference: 'INV-2026-1001', status: 'Read', created: '2026-09-14T10:05' },
      { id: 'NOT-1003', title: 'Vehicle ready for delivery', category: 'Operational', priority: 'Normal', reference: 'JOB-1182', status: 'Unread', created: '2026-09-14T11:20' }
    ], 'NOT'),
    fields: [
      { name: 'title', label: 'Title', required: true, full: true }, { name: 'category', label: 'Category', type: 'select', options: ['Operational', 'Approvals & People', 'Finance', 'Stock', 'Website & Account'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Critical'], defaultValue: 'Normal' }, { name: 'reference', label: 'Reference' },
      { name: 'status', label: 'Status', type: 'select', options: ['Unread', 'Read', 'Archived'], defaultValue: 'Unread' }, { name: 'created', label: 'Date / Time', type: 'datetime-local' },
      { name: 'description', label: 'Description', type: 'textarea', full: true }
    ],
    columns: [{ key: 'title', label: 'Notification' }, { key: 'category', label: 'Category' }, { key: 'priority', label: 'Priority' }, { key: 'reference', label: 'Reference' }, { key: 'status', label: 'Status' }],
    statCards: [{ label: 'Unread', value: (rows) => rows.filter((r) => r.status === 'Unread').length }, { label: 'All Alerts', value: (rows) => rows.length }]
  }
};
