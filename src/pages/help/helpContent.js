// Static, versioned product help. This page never requests private workshop data
// or creates a support ticket: navigation links are permission-aware.
export const HELP_GROUPS = [
  { id: 'start', label: 'Getting Started', ml: 'ആരംഭം' },
  { id: 'workshop', label: 'Workshop Operations', ml: 'വർക്ക്‌ഷോപ്പ്' },
  { id: 'inventory', label: 'Inventory & Suppliers', ml: 'സ്റ്റോക്കും സപ്ലയേഴ്സും' },
  { id: 'billing', label: 'Finance & GST', ml: 'ഫിനാൻസും GST-യും' },
  { id: 'team', label: 'Team & Staff', ml: 'സ്റ്റാഫ്' },
  { id: 'administration', label: 'Settings & Reports', ml: 'ക്രമീകരണങ്ങൾ' },
];

export const HELP_TOPICS = [
  {
    id: 'first-steps', group: 'start', title: 'Start using CubixGear',
    ml: 'CubixGear ഉപയോഗം ആരംഭിക്കുക', icon: 'rocket', path: '/dashboard',
    permissionAny: ['dashboard.view'], tags: ['setup', 'new workshop', 'onboarding'],
    description: 'A practical first-day checklist for a workshop owner or new staff member.',
    steps: [
      'Sign in with your assigned account. Workshop owners complete mandatory organization setup first.',
      'Open your available modules from the sidebar or the mobile More menu.',
      'Set up suppliers, stock parts, customers and vehicles before starting regular billing.',
      'Create a Job Card for service work, or use a direct invoice when there is no Job Card.',
      'Check module access with your workshop administrator if a menu is missing.',
    ],
    note: 'The modules you can use depend on your company subscription and your assigned role.',
    faq: [
      ['Why can I not see a module?', 'The module may be outside your active features or your staff role may not have view permission. Ask the owner or administrator to review both.'],
      ['Can a mechanic open Finance?', 'Only if their assigned role and active features allow Finance access. Account balances have additional permissions.'],
    ],
  },
  {
    id: 'customers', group: 'workshop', title: 'Customers & Vehicles',
    ml: 'കസ്റ്റമറും വാഹനവും', icon: 'car-front', path: '/customers',
    permissionAny: ['customers.view'], tags: ['customer', 'mobile', 'vehicle', 'registration'],
    description: 'Maintain customer details and attach vehicles to the correct owner.',
    steps: [
      'Open Customers and search by name or mobile before creating a record.',
      'Create the customer with the available contact details, then open their profile.',
      'Add or link a vehicle with its registration number and known details.',
      'Use the customer and vehicle record when creating a Job Card.',
      'Check the customer profile for authorized service, invoice and payment history.',
    ],
    note: 'Check for duplicates before creating customers or vehicles; access to outstanding balances is restricted.',
    faq: [
      ['What if a customer has several cars?', 'Keep a single customer profile and link each vehicle to that customer where possible.'],
      ['Can I use a vehicle without a Job Card?', 'Yes. Customer and vehicle records are separate from service Job Cards.'],
    ],
  },
  {
    id: 'jobs', group: 'workshop', title: 'Job Card workflow',
    ml: 'ജോബ് കാർഡ് എങ്ങനെ ഉപയോഗിക്കാം', icon: 'clipboard-list', path: '/jobs',
    permissionAny: ['jobs.view'], tags: ['inspection', 'complaints', 'work', 'estimate', 'invoice', 'job'],
    description: 'From the vehicle complaint to inspection, work, billing and delivery.',
    steps: [
      'Open Job Cards and create a new job for the customer and vehicle.',
      'Record complaints, photos and inspection details; use available Skip actions when appropriate.',
      'Prepare the estimate, get the necessary approvals and assign the work.',
      'Under Work, record services, staff work and parts used from actual stock.',
      'Complete checks, invoice the job and record customer payments in the correct account.',
    ],
    note: 'Issuing a stock part to a Job Card deducts real inventory. Selecting a part for preview does not.',
    faq: [
      ['Can inspection or estimate be skipped?', 'Yes, where the workflow provides Skip Inspection or Skip Estimate. Use the confirmation and record the reason where requested.'],
      ['Why can I not issue a part?', 'Check stock availability and your Jobs Edit and Stock Edit permissions.'],
    ],
  },
  {
    id: 'services', group: 'workshop', title: 'Service Catalogue',
    ml: 'സർവീസ് പട്ടിക', icon: 'wrench', path: '/services',
    permissionAny: ['services.view'], tags: ['labor', 'rate', 'service', 'sac', 'gst'],
    description: 'Create reusable workshop services with pricing, duration and tax defaults.',
    steps: [
      'Open Services and choose Add Service.',
      'Enter the service name, code, category and pricing type.',
      'Set the selling price, unit, SAC/HSN and applicable GST rate where known.',
      'Select the GST treatment and save the catalogue service.',
      'Reuse the service in job work or estimates without creating it repeatedly.',
    ],
    note: 'A catalogue GST default is not a tax-filing decision. Verify the tax treatment when invoicing.',
    faq: [
      ['Does a service create an invoice?', 'No. Saving a catalogue service only makes it available for selection.'],
      ['Can I update service prices?', 'Use the existing service edit form, subject to your role permissions.'],
    ],
  },
  {
    id: 'inventory', group: 'inventory', title: 'Add stock parts',
    ml: 'സ്റ്റോക്ക് പാർട്സ് ചേർക്കുക', icon: 'boxes', path: '/stock',
    permissionAny: ['stock.view'], tags: ['stock', 'part', 'sku', 'hsn', 'rack', 'gst', 'supplier'],
    description: 'Register parts and keep stock quantities tied to documented movements.',
    steps: [
      'Open Inventory Management or Stock & Parts Used in an active Job Card.',
      'Create a part with name, part number, unit, prices, HSN/SAC and GST classification.',
      'Choose an existing supplier, or use Add New Supplier if authorized.',
      'Save the catalogue item; creating a new part from Job Work starts at zero available stock.',
      'Receive purchased items through the supplier bill workflow before issuing them to a job.',
    ],
    note: 'Creating a catalogue product alone must not create a supplier payment, credit or stock receipt.',
    faq: [
      ['Why does my new part show zero stock?', 'Catalogue registration is separate from receiving purchased stock. Post the supplier purchase/receipt first.'],
      ['What does CGST 9% mean in the dropdown?', 'It represents a paired 18% total rate for same-state CGST + SGST. Confirm the applicable place of supply.'],
    ],
  },
  {
    id: 'suppliers', group: 'inventory', title: 'Suppliers & purchase bills',
    ml: 'സപ്ലയർ ബില്ലും സ്റ്റോക്ക് റിസീവും', icon: 'truck', path: '/suppliers/purchases',
    permissionAny: ['stock.view'], tags: ['supplier', 'vendor', 'cash', 'bank', 'purchase', 'bill', 'credit'],
    description: 'Receive stock, enter purchase GST and choose Cash, Bank/UPI or supplier credit.',
    steps: [
      'Open Supplier Purchases and select an active supplier, or add one in the supplier directory.',
      'Add the purchased parts, quantities, cost and verified GST classification.',
      'Enter the supplier invoice reference and review total purchase GST.',
      'Choose Cash in Hand, Bank/UPI, split payments or leave an amount as supplier credit.',
      'Post once, then review received stock, supplier bills and remaining payable in the supplier ledger.',
    ],
    note: 'Use the canonical Supplier Purchase posting flow; do not enter the same receipt again from Finance or Expenses.',
    faq: [
      ['What if I pay only part of the bill?', 'Record the paid allocation and leave the unpaid amount as supplier credit to settle later.'],
      ['Why does a duplicate invoice warning appear?', 'A supplier invoice reference may already exist. Review the posted supplier bill before attempting any retry.'],
    ],
  },
  {
    id: 'outside-parts', group: 'inventory', title: 'Outside shop purchases',
    ml: 'പുറത്തുനിന്ന് പാർട്സ് വാങ്ങൽ', icon: 'shopping-cart', path: '/jobs',
    permissionAny: ['jobs.view'], tags: ['outside shop', 'quote', 'approval', 'purchase order'],
    description: 'Request a part from an outside shop while keeping quotes and actual stock separate.',
    steps: [
      'Open the relevant Job Card and find Buy Part From Outside Shop.',
      'Select a saved supplier or enter another outside shop name.',
      'Enter quantity, purchase price, customer selling price and purchase GST.',
      'Submit the request for approval; the request itself is not a completed purchase.',
      'When approved, attach the supplier bill and complete the appropriate payment or credit workflow.',
    ],
    note: 'Outside-job expense records and supplier stock receipt are different flows. Avoid recording the same purchase twice.',
    faq: [
      ['Does a quotation add inventory?', 'No. A request or purchase order does not receive stock on its own.'],
      ['Can the customer selling price differ?', 'Yes. The form keeps workshop purchase cost separate from customer selling price.'],
    ],
  },
  {
    id: 'invoices', group: 'billing', title: 'Invoices & estimates',
    ml: 'ഇൻവോയിസും എസ്റ്റിമേറ്റും', icon: 'file-text', path: '/invoices',
    permissionAny: ['invoices.view'], tags: ['invoice', 'quote', 'estimate', 'pdf', 'print', 'billing'],
    description: 'Create sales invoices, estimates and printable billing documents.',
    steps: [
      'Open Invoices & Billing and select the required document type.',
      'Choose the customer and add labour/services or spare parts.',
      'Check quantity, price, HSN/SAC, GST rate and applicable supply state.',
      'Review totals and save the document.',
      'Use the available Print or Save as PDF action for a customer copy.',
    ],
    note: 'Customer sales invoices are different from supplier purchase invoices.',
    faq: [
      ['Where do supplier purchase bills go?', 'Use Supplier Purchases instead of the customer sales invoice form.'],
      ['Where is the PDF option?', 'Open the saved document and use Print or Save as PDF where the page provides those actions.'],
    ],
  },
  {
    id: 'finance', group: 'billing', title: 'Finance & Cash / Bank',
    ml: 'ക്യാഷും ബാങ്കും പേയ്മെന്റും', icon: 'wallet', path: '/finance',
    permissionAny: ['payments.view', 'expenses.view'], tags: ['cash in hand', 'bank', 'upi', 'expense', 'payments', 'account', 'balance', 'credit'],
    description: 'Understand accounts, customer receipts, expenses and supplier settlements.',
    steps: [
      'Open Finance Management to view the sections available to your role.',
      'Configure authorized Cash, Bank or UPI accounts and opening balances.',
      'Choose the receiving or paying account when posting a genuine payment or expense.',
      'For supplier bills, go to Supplier Purchases and allocate payment to the supplier invoice.',
      'Review transactions and ledgers; settle outstanding supplier credit through its account.',
    ],
    note: 'Account balance visibility is a separate permission. An operator may enter payments without being allowed to see balances.',
    faq: [
      ['Why can I record a payment but not see bank balance?', 'Your role may have payment-entry permission without the separate account-balance permission.'],
      ['Does paying supplier credit change purchase GST?', 'No. A later payment settles the payable and does not change the original purchase tax.'],
    ],
  },
  {
    id: 'gstr', group: 'billing', title: 'GST & GSTR review',
    ml: 'GST, GSTR പരിശോധന', icon: 'file-check-2', path: '/gstr',
    permissionAny: ['gstr.view'], tags: ['gst', 'gstr', 'itc', 'cgst', 'sgst', 'igst', 'tax'],
    description: 'Review tax data and distinguish purchase GST from input tax credit eligibility.',
    steps: [
      'Open GSTR and select the reporting period.',
      'Review sales data and the supplier purchase tax information.',
      'Check GST components against the applicable Place of Supply.',
      'Use the GSTR-2B reconciliation and available evidence workflow.',
      'Investigate differences before treating input tax credit as eligible.',
    ],
    note: 'Supplier payment allocations displayed in GSTR are read-only. Current supplier due is not necessarily a historical month-end amount.',
    faq: [
      ['Are GST dropdown rates final tax advice?', 'No. Confirm HSN/SAC, supplier GSTIN, place of supply and applicable law.'],
      ['Does purchase GST automatically become ITC?', 'No. ITC requires the appropriate eligibility and reconciliation checks.'],
    ],
  },
  {
    id: 'attendance', group: 'team', title: 'Attendance & leave',
    ml: 'അറ്റൻഡൻസും ലീവ് അപേക്ഷയും', icon: 'calendar-check', path: '/my-attendance',
    permissionAny: ['attendance.self'], tags: ['attendance', 'leave', 'shift', 'punch', 'overtime'],
    description: 'Track your attendance, leave requests and available work summaries.',
    steps: [
      'Open My Attendance from the menu.',
      'Use the calendar to check daily status and attendance history.',
      'Submit leave requests using the provided form when applicable.',
      'Check your overtime and summary sections where enabled.',
      'Ask your manager to review exceptions or attendance corrections.',
    ],
    note: 'Manager approvals and attendance rules are controlled by separate role permissions.',
    faq: [
      ['Why is my attendance correction unavailable?', 'Corrections and approvals may be restricted to the attendance manager.'],
      ['Why do I not see team attendance?', 'Viewing team attendance requires additional access beyond self-attendance.'],
    ],
  },
  {
    id: 'staff', group: 'team', title: 'Staff & permissions',
    ml: 'സ്റ്റാഫും പെർമിഷനും', icon: 'users', path: '/staff-management',
    permissionAny: ['staff.view'], tags: ['staff', 'role', 'permission', 'password', 'whatsapp', 'team'],
    description: 'Manage staff profiles and grant only the features each person needs.',
    steps: [
      'Open Staff Management and create or find the staff profile.',
      'Set branch, designation, staff status and the appropriate role.',
      'Give only the permissions required for that role.',
      'Use the supported password setup/reset link workflow for staff login.',
      'Review access after changing staff roles or workshop feature entitlements.',
    ],
    note: 'View, create, edit, payment-entry and balance-view permissions are distinct; never share owner credentials.',
    faq: [
      ['Why does a staff member see Access Denied?', 'Their role, subscription entitlement or branch scope may block that page.'],
      ['How does a new staff member set a password?', 'Use the staff account setup or reset flow available in Staff Management, subject to permissions.'],
    ],
  },
  {
    id: 'payroll', group: 'team', title: 'Payroll & daily wages',
    ml: 'സാലറിയും ദിവസവേതനവും', icon: 'badge-indian-rupee', path: '/payroll/daily-wages',
    permissionAny: ['payroll.view'], tags: ['payroll', 'wages', 'salary', 'attendance', 'overtime'],
    description: 'Review daily wages, payroll records and authorized salary payments.',
    steps: [
      'Open Payroll or Daily Wages.',
      'Check staff rate configuration and verified attendance for the period.',
      'Review overtime and approval status as required.',
      'Process and approve wages only with the relevant permissions.',
      'Record actual payment against the correct account and verify the payroll history.',
    ],
    note: 'Approving payroll and recording/reversing payment may require separate permissions.',
    faq: [
      ['Are attendance records connected to wages?', 'Attendance and approved overtime may inform the wage calculation, depending on configured payroll rules.'],
      ['Can every staff member edit payroll?', 'No. Payroll viewing, processing, approvals and payment actions are role-restricted.'],
    ],
  },
  {
    id: 'reports', group: 'administration', title: 'Reports & exports',
    ml: 'റിപ്പോർട്ടുകൾ', icon: 'chart-column', path: '/reports',
    permissionAny: ['reports.view'], tags: ['report', 'export', 'analytics', 'kpi', 'sales'],
    description: 'Find available summaries, reports and export actions.',
    steps: [
      'Open Reports & BI.',
      'Choose the report and the period or other supported filters.',
      'Check which records and branches your role can access.',
      'Review totals alongside the underlying records when investigating differences.',
      'Use available download/export controls if your report provides them.',
    ],
    note: 'Report figures depend on the reporting period, posting status and the user’s authorized scope.',
    faq: [
      ['Why is a report empty?', 'Check the date filters, relevant permissions and whether transactions have actually been posted.'],
    ],
  },
  {
    id: 'settings', group: 'administration', title: 'Settings & customer portal',
    ml: 'സെറ്റിംഗ്സും കസ്റ്റമർ പോർട്ടലും', icon: 'settings', path: '/settings',
    permissionAny: ['settings.view', 'company.manage'], tags: ['settings', 'whatsapp', 'customer portal', 'domain', 'invoice default'],
    description: 'Configure workshop defaults and the available customer-facing options.',
    steps: [
      'Open Settings with an authorized account.',
      'Review billing defaults, tax settings, inventory options and other available sections.',
      'Save only the section you changed, and confirm the success message.',
      'Use Customer Website settings for customer portal and domain-related options if enabled.',
      'Verify any WhatsApp integration against the configured workshop connection and delivery mode.',
    ],
    note: 'Some owner-only company and portal settings require company management permission.',
    faq: [
      ['Does changing a default GST rate update all old invoices?', 'No. Existing posted invoices should retain their original recorded tax.'],
      ['Can anyone configure the customer website domain?', 'No. Customer website and domain settings have separate owner/company-level access controls.'],
    ],
  },
];

export const helpTopicsByGroup = id => HELP_TOPICS.filter(topic => topic.group === id);

export const searchHelpTopics = (query, group = 'all') => {
  const text = String(query || '').trim().toLocaleLowerCase();
  return HELP_TOPICS.filter(topic =>
    (group === 'all' || topic.group === group) &&
    (!text || [
      topic.title, topic.ml, topic.description, ...topic.tags,
      ...topic.steps, topic.note, ...topic.faq.flat(),
    ].join(' ').toLocaleLowerCase().includes(text))
  );
};
