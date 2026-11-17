// Browser layout smoke tests use intercepted API fixtures, never a live tenant.
// Run `npx playwright install chromium` once, then `npm run test:ui`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROLE_PERMISSION_MODULES } from '../src/config/rolePermissions.js';
import { dashboardMock } from '../src/mock/dashboard.mock.js';
import { mockStaffList } from '../src/mock/staff.mock.js';
import { customersMock } from '../src/mock/customers.mock.js';
import { vehiclesMock } from '../src/mock/vehicles.mock.js';
import { jobsMock } from '../src/mock/jobs.mock.js';
import { invoicesMock } from '../src/mock/invoices.mock.js';
import { paymentsMock } from '../src/mock/payments.mock.js';
import { expensesMock } from '../src/mock/expenses.mock.js';

const port = Number(process.env.UI_TEST_PORT || 5184);
const baseURL = `http://127.0.0.1:${port}`;
const artifacts = process.env.UI_ARTIFACT_DIR || join(tmpdir(), 'cubegears-ui-smoke');
mkdirSync(artifacts, { recursive: true });
const permissions = [...new Set([
  ...ROLE_PERMISSION_MODULES.flatMap(module => module.actions.map(action => `${module.key}.${action}`)),
  'billing.view', 'billing.edit', 'company.manage', 'storage.view', 'storage.manage', 'attendance.self', 'gstr.view',
])];
const longWorkshopName = 'Mendoza and Chang Traders Automotive Service Center';
const user = {id:'owner',name:'Workshop Owner',email:'owner@example.test',companyId:'company-a',
  company:{id:'company-a',name:longWorkshopName},role:{name:'Owner',permissions:['*']},effectivePermissions:permissions,isCompanyOwner:true};
const settings = Object.fromEntries(['company','operations','billing','inventory','attendance','payroll','notifications','security','integrations'].map(key => [key, {}]));
settings.company = {name:'Test Workshop',country:'India',currency:'INR',timezone:'Asia/Kolkata'};
const financeFixtureId = '00000000-0000-4000-8000-000000000094';
const financeFixtureAccount = { id:financeFixtureId, name:'Cash in Hand', kind:'Cash', currentBalance:'6990436.00', openingBalance:'7000000.00', isActive:true };
const financeFixtureEntry = { id:financeFixtureId, date:'2026-11-16', account:'Cash in Hand', accountKind:'Cash', createdBy:'Workshop Owner',
  type:'customer_payment', reference:`Payment ${financeFixtureId}`, amount:'436.00', credit:'436.00', debit:'0.00' };
const bundles = [
  {id:null,key:'customers',name:'Customers',features:[{key:'customers',label:'Customers'}],perUserCredits:'0.00',totalCredits:'0.00',billingType:'monthly',purchaseEnabled:false,purchaseDisabledReason:'MODULE_PRICE_NOT_SET'},
  {id:'jobs',name:'Jobs',features:[{key:'jobs',label:'Jobs'}],perUserCredits:'20.00',totalCredits:'20.00',billingType:'monthly',purchaseEnabled:true},
];
function fixture(path) {
  if(path==='/auth/me') return user;
  if(path==='/vehicle-catalog') return {makes:[{make:'Toyota',models:['Land Cruiser Prado']}]};
  if(path.startsWith('/customer-portal/links/')) return {
    enabled:true, url:'https://sample.customer.example.test/access/fixture.token',
  };
  if(path==='/company/customer-website') return {
    public_name:'മലബാർ ഓട്ടോ', subdomain:'test-workshop.customer.cubixgear.tech',
    subdomainLabel:'test-workshop', wildcardReady:true,
  };
  // Zero-value synthetic GSTR preparation fixture; no tax liabilities are inferred.
  if(path==='/gstr/overview') return {
    company: { gstin: null },
    overview: { taxable: '0.00', invoiceCount: 0, outputGST: '0.00',
      eligibleITC: null, estimatedNetLiability: null, cgst: '0.00',
      sgst: '0.00', igst: '0.00', purchaseGST: '0.00', verifiedPurchaseTax: null },
    gstr1: { rows: [] }, gstr2b: { purchases: [] }, hsn: { rows: [] }, issues: [],
  };
  if(path==='/billing/documents/gst-context') return {registered:false};
  if(path.startsWith('/billing/documents')) {
    const document={id:'INV-0001',number:'INV-0001',kind:'invoice',invoiceType:'regular',
      status:'Draft',date:'2026-10-19',seller:{name:'Test Workshop'},
      customer:{name:'Rahul Kumar'},vehicle:{registration:'KL10AB1234'},items:[],
      discount:0,adjustment:0,taxMode:'none',paid:0};
    return path==='/billing/documents'?[document]:document;
  }
  if(path==='/payroll/daily-wages') return {
    totalWorkers:1,todayExpense:600,outstanding:600,workersUnpaid:1,totalPayments:0,
    todayAttendance:{full:1,half:0,pending:0},
    employees:[{
      id:'EMP-0012',name:'Ajmal K',employeeCode:'EMP-0012',designation:'Mechanic',
      branchId:'branch-a',branchName:'Main Branch',dailyRate:600,currentBalance:600,
      lastPaymentDate:'2026-10-20',
      today:{finalized:true,attendance:'Full Day',totalWage:600,extraEarnings:0},
    }],
  };
  if(path==='/payroll/daily-wages/history') return [{
    id:'HIST-001',date:new Date().toISOString().slice(0,10),employeeId:'EMP-0012',
    employeeName:'Ajmal K',branchId:'branch-a',branchName:'Main Branch',
    attendance:'Full Day',dailyRate:600,baseWage:600,extras:0,
    adjustments:0,total:600,paymentStatus:'Unpaid',
  }];
  if(path==='/payroll/daily-wages/payments') return [{
    id:'PAY-001',date:'2026-10-28',employeeId:'EMP-0012',
    employeeName:'Ajmal K',branchId:'branch-a',branchName:'Main Branch',
    amount:300,method:'Cash',reference:'PAY-TEST',reversed:false,
  }];
  if(path.startsWith('/payroll/daily-wages/employees/')) return {
    employee:mockStaffList[0], currentRate:600, currentBalance:600, totalEarned:600, totalPaid:0,
    today:{date:'2026-10-19', finalized:true, attendance:'Full Day', totalWage:600, baseWage:600, extraEarnings:0},
    rates:[],history:[],extras:[],payments:[],audit:[],
  };
  if(path.startsWith('/saas/storage/history/')) return {
    date:'2026-10-19', usedGb:0, fileCount:0, files:[], charge:0, rate:null,
  };
  if(path.startsWith('/attendance-manager/staff-details/')) return {
    staffInfo:{id:'EMP-0012', name:'Ajmal K', designation:'Mechanic', branch:'Main', shift:'General'},
    attendanceSummary:{date:'2026-10-19', status:'Present', workedHours:'8h', lateMinutes:0, earlyExitMinutes:0},
    sessions:[], correctionInfo:null, leaveInfo:null, auditHistory:[],
  };
  if(path==='/e-way-bills') return [];
  if(path==='/e-way-bills/from-context') return { from: {
    gstin:'32ABCDE1234F1Z5', tradeName:'Test Workshop',address:'Main Road',
    place:'Thrissur',pincode:'680001',stateCode:'32',
  },branchId:'BR-01' };
  if(path==='/e-way-bills/from-context') return {
    from:{gstin:'32ABCDE1234F1Z5',tradeName:'Test Workshop',address:'Workshop Lane',
      place:'Thrissur',pincode:'680001',stateCode:'32'},branchId:'BR-01',
  };
  if(path.startsWith('/e-way-bills/')) return {id:'EWB-001',status:'Draft',supplyType:'Outward',subSupplyType:'Supply',transactionType:'Regular',documentType:'Tax Invoice',documentNo:'INV-0001',documentDate:'2026-10-19',from:{tradeName:'Test Workshop',stateCode:'32'},to:{tradeName:'Test Customer',stateCode:'32'},items:[],transport:{mode:'Road',distanceKm:'10',vehicleNo:'KL10AB1234'}};
  // Supplier finance fixtures are read-only. Smoke tests never write tenant data.
  if(path==='/stock/suppliers') return [
    {id:'00000000-0000-4000-8000-000000000081',name:'Fixture Auto Parts',phone:'9876543210',email:'parts@example.test'},
  ];
  if(path==='/stock/purchases' || path==='/stock/purchase-orders') return [
    {id:'00000000-0000-4000-8000-000000000082',number:'PO-TEST-01',
     supplier:'00000000-0000-4000-8000-000000000081',status:'Received',total:'1800.00'},
  ];
  if(path==='/stock/supplier-credits') return [
    {id:'00000000-0000-4000-8000-000000000083',
     purchaseOrder:'00000000-0000-4000-8000-000000000082',purchaseNumber:'PO-TEST-01',
     supplierId:'00000000-0000-4000-8000-000000000081',supplierName:'Fixture Auto Parts',
     total:'1800.00',paid:'200.00',outstanding:'1600.00',
     dueDate:'2026-12-30',status:'Partially Paid'},
  ];
  if(path==='/stock/supplier-payments') return [
    {id:'00000000-0000-4000-8000-000000000084',creditId:'00000000-0000-4000-8000-000000000083',
     supplierName:'Fixture Auto Parts',purchaseNumber:'PO-TEST-01',
     date:'2026-11-05',amount:'200.00',method:'Cash',reference:'',
     expenseId:'00000000-0000-4000-8000-000000000085'},
  ];
  if(path==='/employees') return mockStaffList.map(row => ({...row, photo:''}));
  const records = {employees:mockStaffList, customers:customersMock, vehicles:vehiclesMock,
    jobs:jobsMock, invoices:invoicesMock, payments:paymentsMock, expenses:expensesMock};
  const [,resource,id,subresource] = path.split('/');
  if(records[resource] && !subresource) {
    if(!id) return records[resource];
    const row=records[resource].find(row=>row.id===id);
    if(row) return {...row, photo:'', ...(resource==='invoices'?{items:[],invoiceType:'non-gst'}:{})};
  }
  if(path==='/saas/credits/access') return {companyId:'company-a',permissions,enabledModules:permissions.map(code=>code.split('.')[0]),freeModules:['dashboard','staff','settings','roles','billing'],enforcementEnabled:true,isCompanyOwner:true,canManageFeatures:true};
  // Simulate the existing Django health contract in isolated UI fixture mode.
  if(path==='/health') return {status:'ok',service:'cubegears-backend',api_version:'v1'};
  if(path==='/dashboard') return structuredClone(dashboardMock);
  if(path==='/settings') return settings;
  if(path.startsWith('/settings/')) return settings[path.split('/').pop()] || {};
  if(path==='/company/me') return user.company;
  if(path==='/finance/dashboard') return {bankBalance:'0.00',cashBalance:'6990436.00',totalReceived:'436.00',totalPaid:'10000.00',
    outstandingCustomer:'0.00',supplierOutstanding:'1000.00',pendingExpenses:'75.00',estimatedProfit:'361.00',
    profitNote:'Estimated result based on recorded sales and costs.',accounts:[financeFixtureAccount],recentTransactions:[financeFixtureEntry]};
  if(path==='/finance/accounts') return [financeFixtureAccount];
  if(path===`/finance/accounts/${financeFixtureId}`) return {...financeFixtureAccount,ledger:[{...financeFixtureEntry,runningBalance:'6990436.00'}]};
  if(path==='/finance/ledger') return {count:1,page:1,totalPages:1,results:[financeFixtureEntry]};
  if(path==='/finance/payment-activity') return {supplierPurchases:'11000.00',supplierPayments:'10000.00',supplierOutstanding:'1000.00',
    results:[{id:financeFixtureId,source:'payment',direction:'IN',ledgerPosted:true,date:'2026-11-16',customer:'Fixture Customer',
      invoice:'INV-2026-0001',method:'Cash',account:'Cash in Hand',amount:'436.00',status:'Completed'}]};
  if(path==='/finance/chart') return [{id:financeFixtureId,code:`CASH:${financeFixtureId}`,name:'Cash in Hand',type:'Asset',isActive:true}];
  if(path==='/saas/credits/overview') return {balance:'516500.00',canManage:true,checkoutAvailable:false};
  if(path==='/saas/credits/bundles') return bundles;
  if(path==='/saas/credits/billing-cycle') return {enabled:false};
  if(path==='/saas/credits/account') return {company:user.company,users:[]};
  if(path==='/saas/billing') return {plan:null,usage:{seatsUsed:0},users:[],invoices:[]};
  if(path==='/saas/storage') return {usedBytes:104857600,usedGb:0.098,fileCount:10,files:[],settings:{allowedTypes:['image/png'],maxFileMb:10,retentionDays:0},billing:{creditsPerGb:'10',includedGb:'0',period:'monthly',active:true}};
  if(path==='/saas/storage/events') return {count:0,results:[]};
  if(path==='/attendance-manager/approvals') return [{
    id:'LEAVE-TEST-1',type:'Leave Request',status:'Pending',staffName:'Belle Trujillo',
    staffId:'EMP-0001',startDate:'2026-10-30',endDate:'2026-10-30',
    totalDays:1,reason:'Personal leave request',halfDay:false,canReview:true,
  },{
    id:'LEAVE-SELF-TEST',type:'Leave Request',status:'Pending',staffName:'Logged In Owner',
    staffId:'EMP-0002',startDate:'2026-10-30',endDate:'2026-10-30',
    totalDays:1,reason:'Own leave request',halfDay:false,canReview:false,
    reviewBlockReason:'Your own request must be reviewed by another authorized manager.',
  }];
  if(path==='/attendance/status') return {status:'CLOCKED_OUT',workedHours:'0h'};
  return [];
}
const source = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url),'utf8');
const sampleIds={staffId:'EMP-0012', complaintId:'CMP-01', ewbId:'EWB-001', date:'2026-10-19'};
const templates=[...source.matchAll(/<Route path="([^"]+)"/g)].map(([,path])=>path);
const paths=[...new Set(templates.map(path=>path.replace(/:([A-Za-z]+)/g,(_,key)=>{
  if(sampleIds[key])return sampleIds[key];
  if(path.startsWith('/staff/'))return 'EMP-0012';
  return ({customers:'CUS-0001',vehicles:'VEH-0001',jobs:'JOB-00251',invoices:'INV-0001',
    payments:'PAY-0001',expenses:'EXP-0001',services:'SVC-001',reports:'REP-001',notifications:'NOT-001'})[path.split('/')[1]] || 'fixture-id';
}).replace('*','fixture-unknown')))].filter(path=>!process.env.UI_PATH_FILTER||path.includes(process.env.UI_PATH_FILTER));
const profiles = process.env.UI_QUICK ? [{width:390,height:844,theme:'light'}] : [
  {width:320,height:720,theme:'dark'}, {width:375,height:812,theme:'light'},
  {width:390,height:844,theme:'dark'}, {width:430,height:932,theme:'light'},
  {width:768,height:1024,theme:'dark'}, {width:1024,height:768,theme:'light'},
  {width:1140,height:760,theme:'light'}, {width:1440,height:1000,theme:'dark'}, {width:1920,height:1080,theme:'light'},
];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(process.env.UI_PRODUCTION ? ['preview'] : []),'--host','127.0.0.1','--port',String(port),'--strictPort'],{
  cwd:new URL('..',import.meta.url),env:{...process.env,VITE_API_URL:'http://127.0.0.1:8000/api/v1'},stdio:['ignore','pipe','pipe'],
});
// A Vite production preview can be ready without printing "Local:" on stdout.
const startupErrors = [];
server.stderr.on('data', data => startupErrors.push(data.toString()));
const waitForServer = async () => {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw Error(`Vite exited (${server.exitCode}): ${startupErrors.join('').slice(-2000)}`);
    }
    try {
      const response = await fetch(baseURL, { signal: AbortSignal.timeout(2500) });
      if (response.ok) return;
    } catch { /* The preview server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw Error(`Vite preview never served HTTP after 60s: ${startupErrors.join('').slice(-2000)}`);
};

let browser;
try {
  await waitForServer();
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=disabled']}: {})});
  const failures=[];
  let tested=0;
  await Promise.all(profiles.map(async (profile) => {
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},colorScheme:profile.theme==='dark'?'dark':'light'});
    await context.addInitScript(({user,theme})=>{
      if (location.pathname !== '/login' || new URLSearchParams(location.search).get('reset') !== 'success') {
        localStorage.setItem('auth_token','fixture-token');localStorage.setItem('auth_user',JSON.stringify(user));
      }
      if(!localStorage.getItem('cubegears-theme'))localStorage.setItem('cubegears-theme',theme);
    },{user,theme:profile.theme});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      return url.origin===baseURL||url.pathname.startsWith('/api/v1/')?route.continue():route.abort();
    });
    // Intercept the public signup destination so UI smoke tests stay offline.
    // This explicitly tests the redirect without opening a real external site.
    await context.route('https://cubixgear.tech/signup', route => route.fulfill({
      status:200,
      contentType:'text/html',
      body:'<!doctype html><html><body><main>Public workshop registration destination</main></body></html>',
    }));
    await context.route('**/api/v1/**',async route=>{
      const request=route.request();
      const path=new URL(request.url()).pathname.replace('/api/v1','').replace(/\/$/,'');
      if(path==='/company/customer-website/subdomain'&&request.method()==='PATCH') {
        const {label}=request.postDataJSON();
        await route.fulfill(label==='abc1'
          ? {status:200,json:{subdomain:'abc1.customer.cubixgear.tech',subdomainLabel:'abc1',wildcardReady:true}}
          : {status:400,json:{label:'This subdomain is already in use.',suggestedLabel:'abc1'}});
        return;
      }
      if(path==='/whatsapp/manual-share'&&request.method()==='POST'&&request.postDataJSON()?.targetType==='customer') {
        await route.fulfill({status:200,json:{preview:'Sample tracking message',url:'https://wa.me/15550100100'}});
        return;
      }
      if(!['GET','HEAD'].includes(request.method())) {
        await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Smoke tests do not write tenant data.'})});return;
      }
      if(path==='/company/logo') {
        // Authenticated company branding is a private image response.
        const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
        await route.fulfill({status:200,contentType:'image/png',body:png});
        return;
      }
      if (/^\/(?:billing\/documents|e-way-bills)\/[^/]+\/pdf$/.test(path)) {
        await route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\n% UI fixture\n%%EOF'});
        return;
      }
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(path))});
    });
    const page=await context.newPage();const errors=[];
    page.setDefaultTimeout(5000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&message.text().includes('React render error'))errors.push(message.text());});
    let firstNavigation=true;
    for(const path of paths) {
      console.log(`Checking ${profile.width}px ${path}`);
      errors.length=0;
      try {
        if(path==='/signup') {
          // The panel must no longer render its own registration form.
          await page.goto(baseURL+path,{waitUntil:'domcontentloaded',timeout:15000});
          await page.waitForURL('https://cubixgear.tech/signup',{timeout:15000});
          firstNavigation=true;
          tested++;
          continue;
        }
        if(firstNavigation) {
          await page.goto(baseURL+path,{waitUntil:'networkidle',timeout:15000});
          firstNavigation=false;
        } else {
          await page.evaluate(path=>{
            window.history.pushState({},'',path);
            window.dispatchEvent(new PopStateEvent('popstate'));
          },path);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          await page.waitForLoadState('networkidle');
        }
        await page.locator('.route-loading').waitFor({state:'hidden',timeout:15000});
        await page.waitForFunction(()=>document.body.innerText.length>=20);
        if(path==='/customers/CUS-0001' && (profile.width===390 || profile.width===1440)) {
          const tracking=page.getByRole('region',{name:'Secure customer tracking'});
          await tracking.getByRole('button',{name:'Copy Message',exact:true}).click();
          await tracking.getByRole('link',{name:'Open draft'}).waitFor({state:'visible'});
          const layout=await tracking.evaluate(root=>{
            const buttons=[...root.querySelectorAll('.customer-tracking-share-actions button')]
              .map(button=>button.getBoundingClientRect());
            const preview=root.querySelector('.wa-manual-share__preview').getBoundingClientRect();
            const bounds=root.getBoundingClientRect();
            return {
              count:buttons.length,
              sameRow:buttons.every(rect=>Math.abs(rect.top-buttons[0].top)<=1),
              fits:buttons.every(rect=>rect.height>=44 && rect.left>=bounds.left && rect.right<=bounds.right),
              previewBelow:buttons.every(rect=>preview.top>=rect.bottom),
            };
          });
          if(layout.count!==3 || !layout.fits || !layout.previewBelow || (profile.width===1440 && !layout.sameRow)) {
            throw Error('Customer tracking buttons and feedback should align without overflowing: '+JSON.stringify(layout));
          }
        }
        if(path==='/settings/customer-website' && (profile.width===390 || profile.width===1440)) {
          const field=page.getByLabel('Default website subdomain name');
          const update=page.getByRole('button',{name:'Update Subdomain'});
          await field.fill('മലബാർ');
          await update.click();
          await page.getByText(/Use 3–63 English letters/).waitFor();
          await field.fill('abc');
          await update.click();
          await page.getByRole('alertdialog').getByRole('button',{name:'Continue'}).click();
          await page.getByRole('button',{name:'Use abc1'}).click();
          if(await field.inputValue()!=='abc1')throw Error('Available workshop address was not applied');
          await update.click();
          await page.getByRole('alertdialog').getByRole('button',{name:'Continue'}).click();
          await page.getByText('https://abc1.customer.cubixgear.tech/',{exact:true}).waitFor();
        }
        // Supplier directory and Purchase History are valid navigation.
        // Credits and Payments are on the supplier detail page, not old tabs.
        if(path==='/suppliers' && (profile.width===390 || profile.width===1440)) {
          await page.getByRole('heading',{name:'Suppliers',exact:true}).waitFor({state:'visible'});
          await page.locator('a.cg-supplier-name-link:visible').first().waitFor({state:'visible'});
          const outdatedSupplierTabs = page.locator([
            '.cg-supplier-page-nav a[href="/suppliers/credits"]',
            '.cg-supplier-page-nav a[href="/suppliers/payments"]',
          ].join(','));
          if (await outdatedSupplierTabs.count()) {
            throw Error('Obsolete supplier finance tabs should be removed');
          }
          const supplierProfile = page.locator('a.cg-supplier-name-link:visible').first();
          await supplierProfile.waitFor({state:'visible'});
          const target = await supplierProfile.getAttribute('href');
          if (!target?.startsWith('/suppliers/')) throw Error('Supplier must link to its detail profile');
          const drawerMode=profile.width<1024;
          if(drawerMode) await page.getByRole('button',{name:'Open all authorized pages'}).click();
          const sidebar=page.locator(drawerMode ? '.mobile-drawer' : '.app-sidebar');
          const supplierLink=sidebar.getByRole('link',{name:'Suppliers',exact:true});
          await supplierLink.waitFor({state:'visible'});
          if(await supplierLink.getAttribute('href')!=='/suppliers') throw Error('Suppliers parent link is incorrect');
          if(await sidebar.locator('[id*="supplier-"][id*="submenu"]').count()) throw Error('Old Suppliers submenu is still present');
          if(drawerMode) await sidebar.getByRole('button',{name:'Close menu',exact:true}).click();
        }
        // Job Card creation: exercise the actual React form, image blob URLs,
        // computed responsive grid, light/dark tokens, and accordion state.
        if(path==='/jobs/new') {
          // Route hydration can finish before the async Job form is ready.
          // Check the real form after it renders, not an empty transient DOM.
          await page.locator('.job-create-form > .job-create-section').first().waitFor({
            state:'visible', timeout:15000,
          });
          const sectionOrder=await page.evaluate(()=>[...document.querySelectorAll('.job-create-form > .job-create-section')]
            .map(node=>node.querySelector('h2')?.textContent.trim() || ''));
          if(sectionOrder.slice(0,5).map(label=>label.replace(/^\d+\s*/, '')).join(' | ') !==
            'Customer & Job Details | Customer Complaints | Vehicle Details | Technician & Service Assignment | Vehicle Photos / Inspection')
            throw Error('Job Card section order is incorrect: '+sectionOrder.join(' | '));
          if(await page.getByRole('heading',{name:/Customer Complaints/}).count()!==1)
            throw Error('Job Card has duplicate Customer Complaints headings');
          const firstComplaint=page.locator('.job-complaint-row textarea').first();
          await firstComplaint.fill('Noise when braking');
          await page.getByRole('button',{name:'Add Complaint'}).click();
          if(await page.locator('.job-complaint-row').count()!==2)
            throw Error('Add Complaint did not create another editable complaint');
          await page.locator('.job-complaint-row textarea').nth(1).fill('AC not cooling');
          await page.getByRole('button',{name:'Remove complaint 2'}).click();
          // The requested Simple/Advanced switch was removed from Job Create.
          // There is now one form; mandatory and optional fields remain visible.
          if(await page.getByRole('button',{name:'Advanced',exact:true}).count() ||
            await page.getByRole('button',{name:'Simple',exact:true}).count())
            throw Error('Legacy Job Create mode switch must not reappear');
          if(await page.locator('select[name="serviceAdvisorEmployeeId"]').count()!==1)
            throw Error('Service Advisor field missing from single Job Card form');
          if(await firstComplaint.inputValue()!=='Noise when braking' ||
            await page.locator('.job-complaint-row').count()!==1)
            throw Error('Complaints were lost after editing or removal');

          const accordion=page.getByRole('button',{name:/Advanced Vehicle Details/});
          if(await accordion.getAttribute('aria-expanded')!=='false' ||
            await page.locator('#job-create-vehicle-advanced-content').count())
            throw Error('Collapsed Vehicle Details contains an unwanted empty box');
          const collapsedHeight=await page.locator('.job-create-vehicle-advanced').evaluate(el=>el.getBoundingClientRect().height);
          if(collapsedHeight>80) throw Error('Collapsed Vehicle Details is too tall: '+collapsedHeight);
          await accordion.click();
          await page.locator('input[name="vin"]').fill('VIN-TEST-123');
          await accordion.click();
          await accordion.click();
          if(await page.locator('input[name="vin"]').inputValue()!=='VIN-TEST-123')
            throw Error('VIN was cleared when opening and closing the accordion');

          const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
          await page.locator('input[aria-label="Upload vehicle photos from gallery"]').setInputFiles(
            Array.from({length:5},(_,i)=>({name:'vehicle-'+i+'.png',mimeType:'image/png',buffer:image}))
          );
          if(await page.locator('.vehicle-camera-queued').count()!==5)
            throw Error('Five uploaded pictures should generate five independent thumbnails');
          // File previews can paint a frame after the queued records appear.
          // Wait for a real preview image before measuring its responsive CSS.
          await page.locator('.vehicle-camera-preview-button img').first().waitFor({state:'visible',timeout:5000});
          const grid=await page.locator('.vehicle-camera-queue-grid').evaluate(el=>{
            const rect=el.getBoundingClientRect();
            const columns=getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean);
            const image=el.querySelector('.vehicle-camera-preview-button img');
            const thumb=image?.getBoundingClientRect();
            return {columns:columns.length, right:rect.right,
              thumbWidth:thumb?.width, thumbHeight:thumb?.height,
              fit:image && getComputedStyle(image).objectFit};
          });
          const expectedColumns=profile.width<=767?2:profile.width<=1100?3:4;
          if(grid.columns!==expectedColumns)
            throw Error('Incorrect responsive photo columns at '+profile.width+'px: '+JSON.stringify(grid));
          if(grid.right>profile.width+2)
            throw Error('Vehicle photo grid overflows viewport: '+JSON.stringify(grid));
          if(grid.fit!=='cover'||!grid.thumbWidth||!grid.thumbHeight||
            Math.abs(grid.thumbWidth/grid.thumbHeight-4/3)>0.15)
            throw Error('Vehicle photo thumbnails have incorrect aspect ratio: '+JSON.stringify(grid));
          if(await page.getByText('Ready to upload',{exact:true}).count()!==5)
            throw Error('Each pending photo must have an upload status');
          await page.locator('.vehicle-camera-preview-button').first().click();
          const lightbox=page.getByRole('dialog',{name:'Vehicle photo preview'});
          await lightbox.waitFor({state:'visible'});
          const fit=await lightbox.locator('img').evaluate(el=>getComputedStyle(el).objectFit);
          if(fit!=='contain') throw Error('Full-size photo preview must preserve aspect ratio');
          await lightbox.getByRole('button',{name:'Close photo preview'}).click();
          await lightbox.waitFor({state:'hidden'});
          await page.locator('.vehicle-camera-remove-photo').first().click();
          if(await page.locator('.vehicle-camera-queued').count()!==4)
            throw Error('Removing one photo should leave all other queued photos');
        }

        if(path==='/dashboard') {
          const mobile=profile.width<1024;
          const shortName=longWorkshopName.split(/\s+/u)[0];
          const workshop=page.locator(mobile ? '.mobile-workshop-brand' : '.sidebar-workshop-only');
          await workshop.waitFor({state:'visible'});
          const companyName=workshop.locator('.workshop-company-name');
          if(await companyName.innerText()!==(mobile ? longWorkshopName : shortName))
            throw Error('Mobile header must show the workshop name and desktop sidebar must show its short name');
          if(await companyName.getAttribute('title')!==longWorkshopName)
            throw Error('Workshop name must be available in full in the tooltip');
          const companyLogo=workshop.locator('.workshop-company-logo-image');
          await companyLogo.waitFor({state:'visible',timeout:8000});
          if(!(await companyLogo.evaluate(el=>el.complete && el.naturalWidth>0)))
            throw Error('The actual workshop logo must load');
          if(await page.getByText('Workshop Management',{exact:true}).count())
            throw Error('Obsolete Workshop Management subtitle should be removed');
          if(mobile) {
            if(await page.locator('.mobile-product-brand,.mobile-drawer-platform-line').count())
              throw Error('Mobile must not display cubixgear logo or wordmark');
            const drawerWorkshop=page.locator('.mobile-drawer-company-line .workshop-company-name');
            if(await drawerWorkshop.textContent()!==shortName)
              throw Error('Mobile menu should display only the workshop short name');
            const typography=await companyName.evaluate(el=>({
              fontWeight:parseInt(getComputedStyle(el).fontWeight,10),
              fontSize:parseFloat(getComputedStyle(el).fontSize),
              lineClamp:getComputedStyle(el).webkitLineClamp,
            }));
            if(typography.fontWeight<550 || typography.fontWeight>700 ||
              typography.fontSize<13 || typography.fontSize>15 || typography.lineClamp!=='2')
              throw Error('Mobile workshop name should be moderately bold and compact: '+JSON.stringify(typography));
            const layout=await page.evaluate(()=>{
              const brand=document.querySelector('.mobile-workshop-brand').getBoundingClientRect();
              const actions=document.querySelector('.mobile-header-actions').getBoundingClientRect();
              const wallet=document.querySelector('.mobile-header-actions .cg-credit-chip').getBoundingClientRect();
              const profile=document.querySelector('.mobile-profile-button').getBoundingClientRect();
              return {
                brandRight:brand.right,actionsLeft:actions.left,
                walletLeft:wallet.left,brandTop:brand.top,brandBottom:brand.bottom,
                actionsTop:actions.top,actionsBottom:actions.bottom,
                profileRight:profile.right,viewport:innerWidth,
              };
            });
            const sameRow=layout.brandBottom>layout.actionsTop && layout.actionsBottom>layout.brandTop;
            if(!sameRow || layout.brandRight>layout.actionsLeft+1 ||
               layout.brandRight>layout.walletLeft+1 ||
               layout.profileRight>layout.viewport+1)
              throw Error('Mobile workshop and top-right controls must share one row: '+JSON.stringify(layout));
            if(await page.locator('.mobile-header-page').isVisible())
              throw Error('Mobile page title must not compete with the compact header controls');
          } else {
            const sidebar=page.locator('.sidebar-brand-row');
            const brand=page.locator('.sidebar-workshop-only');
            if(await brand.locator('.workshop-company-name').count()!==1 ||
               await brand.locator('.workshop-company-logo-image').count()!==1)
              throw Error('Desktop must show only workshop logo and company short name');
            if(await sidebar.locator('.sidebar-platform-line,.cubixgear-logo-image').count())
              throw Error('Desktop sidebar should not include cubixgear product branding');
            const typography=await companyName.evaluate(el=>({
              fontWeight:parseInt(getComputedStyle(el).fontWeight,10),
              fontSize:parseFloat(getComputedStyle(el).fontSize),
            }));
            if(typography.fontWeight<550||typography.fontWeight>700||
               typography.fontSize<13||typography.fontSize>15)
              throw Error('Desktop workshop name should be compact semibold: '+JSON.stringify(typography));
            const overlap=await page.evaluate(()=>{
              const brand=document.querySelector('.sidebar-workshop-only').getBoundingClientRect();
              const collapse=document.querySelector('.sidebar-collapse-button').getBoundingClientRect();
              return {brandRight:brand.right,toggleLeft:collapse.left};
            });
            if(overlap.brandRight>overlap.toggleLeft+1)
              throw Error('Desktop workshop name overlaps collapse control: '+JSON.stringify(overlap));
            await page.getByRole('button',{name:'Collapse sidebar'}).click();
            if(await page.locator('.sidebar-workshop-only .workshop-company-name').count())
              throw Error('Collapsed sidebar should show company logo only');
            const collapsedLogo=page.locator('.sidebar-workshop-only .workshop-company-logo-image');
            await collapsedLogo.waitFor({state:'visible',timeout:5000});
            if(!(await collapsedLogo.evaluate(el=>el.complete&&el.naturalWidth>0)))
              throw Error('Collapsed sidebar must use workshop logo');
            await page.getByRole('button',{name:'Expand sidebar'}).click();
            const headerMetrics=await page.locator('.desktop-header-row').evaluate(header=>{
              const search=header.querySelector('.header-search-wrap');
              const actions=header.querySelector('.header-actions');
              const bounds=header.getBoundingClientRect();
              return {
                headerRight:bounds.right,searchWidth:search.getBoundingClientRect().width,
                actionsRight:actions.getBoundingClientRect().right,
                clipped:[...actions.children].filter(el=>{
                  const rect=el.getBoundingClientRect();
                  return rect.width>0 && rect.right>bounds.right+2;
                }).map(el=>el.className),
              };
            });
            if(headerMetrics.clipped.length||headerMetrics.actionsRight>headerMetrics.headerRight+2||
              headerMetrics.searchWidth<130)
              throw Error('Desktop workspace header clips its controls: '+JSON.stringify(headerMetrics));
          }
          const search=page.locator('.global-search-field input');
          await search.focus();
          if(await page.locator('.global-search-results').count())
            throw Error('Empty focused search should not cover workspace content');
          await search.fill('da');
          await page.locator('.global-search-results').waitFor({state:'visible',timeout:5000});
          await search.press('Escape');
          await search.fill('');
          if(await page.locator('.global-search-results').count())
            throw Error('Empty query should close the search popover');
        }
        if(path==='/account/storage') {
          const usage = page.locator('.storage-control-card');
          await usage.getByRole('heading', {name:'Storage & file usage'}).waitFor({timeout:15000});
          await usage.getByRole('switch', {name:'Enable workshop storage uploads'}).waitFor();
          await usage.getByLabel('Upload category').waitFor();
          await usage.getByText('Upload photos', {exact:true}).waitFor();
          const stats = usage.locator('.storage-overview-grid > div');
          if (await stats.count() !== 3 || !await usage.getByText('100 MB', {exact:true}).isVisible()
              || !await usage.getByText('≈ 0.10 GB', {exact:true}).isVisible()) {
            throw Error('Media Storage must show the usage, file count and allowance summary.');
          }
          await usage.getByRole('button', {name:'GB',exact:true}).click();
          if (await usage.locator('.storage-primary-usage strong').innerText() !== '0.10 GB') {
            throw Error('The GB selector must round 100 MB to 0.10 GB.');
          }
          await usage.getByRole('button', {name:'MB',exact:true}).click();
          if (await usage.getByRole('button', {name:'MB',exact:true}).getAttribute('aria-pressed') !== 'true') {
            throw Error('Storage display unit should remain selectable.');
          }
          const storagePage = page.locator('.account-billing-page');
          if (await storagePage.locator('.saas-card').count() !== 1 ||
              await storagePage.getByRole('button', {name:/delete/i}).count() ||
              /Small uploads are not rounded down|Storage Billing:|Storage usage history|Storage interval logs|Advanced storage settings|Uploaded Files|Recorded storage activity|Delete selected|Credit billing cycle/i.test(await storagePage.innerText())) {
            throw Error('Removed Media Storage sections and controls should not render on the overview.');
          }
          if (profile.width===390 || profile.width===1440) {
            const summaryRoute='**/api/v1/saas/storage';
            const uploadRoute='**/api/v1/saas/storage/files';
            const addedBytes=1024 ** 2;
            const initial=fixture('/saas/storage');
            await page.route(summaryRoute, route=>route.fulfill({json:{
              ...initial, usedBytes:initial.usedBytes+addedBytes, fileCount:initial.fileCount+1,
            }}));
            await page.route(uploadRoute, route=>route.fulfill({status:201,json:[{sizeBytes:addedBytes}]}));
            await usage.locator('input[type=file]').setInputFiles({
              name:'storage-calculation.png', mimeType:'image/png', buffer:Buffer.alloc(addedBytes),
            });
            await usage.getByText('101 MB', {exact:true}).waitFor({state:'visible'});
            await stats.nth(1).getByText('11', {exact:true}).waitFor({state:'visible'});
            await page.unroute(summaryRoute);
            await page.unroute(uploadRoute);
          }
        }
        if(path==='/account') {
          // /account renders CreditWorkspace, not the legacy AccountOverview component.
          const stats=page.locator('.cg-credit-page .cg-credit-metrics article');
          await stats.first().waitFor({state:'visible',timeout:15000});
          if(await stats.count()!==3)
            throw Error('Wallet overview must display the three real KPI cards');
          const typography=await page.evaluate(()=>{
            const card=document.querySelector('.cg-credit-page .cg-credit-metrics article');
            const label=card.querySelector('div span');
            const value=card.querySelector('strong');
            const tab=document.querySelector('.cg-credit-page .account-dashboard-tabs button');
            const box=card.getBoundingClientRect();
            return {
              labelFont:parseFloat(getComputedStyle(label).fontSize),
              valueFont:parseFloat(getComputedStyle(value).fontSize),
              tabFont:parseFloat(getComputedStyle(tab).fontSize),
              cardWidth:box.width,
              scrollWidth:document.documentElement.scrollWidth,
              columnCount:getComputedStyle(card.parentElement).gridTemplateColumns.split(' ').length,
            };
          });
          if(typography.labelFont<13 || typography.valueFont<22 || typography.tabFont<13 ||
            typography.cardWidth<140 || typography.scrollWidth>profile.width+2)
            throw Error('Wallet overview KPIs or tabs are unreadable/overflow: '+JSON.stringify(typography));
          if(profile.width<=360 && typography.columnCount!==1)
            throw Error('Tiny phones must show a single readable account card per row');
          if(profile.width>=1024 && typography.columnCount!==3)
            throw Error('Desktop account should show three balanced KPI columns');
        }
        if(path==='/plans') {
          if(new URL(page.url()).pathname!=='/account/credits/buy') throw Error('Redirect did not reach module marketplace');
          if(new URL(page.url()).searchParams.has('month')) throw Error('Payroll filters leaked into unrelated route');
        }
        if(path==='/login') {
          const input=page.locator('#login-identifier');
          const mobileOption=page.getByRole('button',{name:'Mobile Number',exact:true});
          const emailOption=page.getByRole('button',{name:'Email',exact:true});
          const order=await page.locator('.login-method-switch button').allTextContents();
          if(order.length!==2 || order[0].trim()!=='Email' || order[1].trim()!=='Mobile Number')
            throw Error('Email must be the first login option');
          if(await emailOption.getAttribute('aria-pressed')!=='true' ||
              await mobileOption.getAttribute('aria-pressed')!=='false')
            throw Error('Email should be the default login method');
          if(await page.getByLabel('Country code').count()!==0)
            throw Error('Email mode should not display the country-code selector');
          if(await input.getAttribute('type')!=='email' ||
              await input.getAttribute('placeholder')!=='name@example.com')
            throw Error('Email default mode needs the email input and placeholder');
          await input.fill('not-an-email');
          await page.getByRole('button',{name:'Sign In',exact:true}).click();
          if(!await page.getByText('Enter a valid email address.').isVisible())
            throw Error('Email login must validate email format');
          await input.fill('owner@example.com');
          await mobileOption.click();
          if(await mobileOption.getAttribute('aria-pressed')!=='true' ||
              await page.getByLabel('Country code').inputValue()!=='+91' ||
              await input.getAttribute('type')!=='tel' ||
              await input.getAttribute('placeholder')!=='9876543210')
            throw Error('Mobile option must show +91 country code and phone input');
          await input.fill('9876543210');
          await emailOption.click();
          if(await input.inputValue()!=='owner@example.com' ||
              await page.getByLabel('Country code').count()!==0)
            throw Error('Switching to Email should restore the email and hide country code');
          await mobileOption.click();
          if(await input.inputValue()!=='9876543210' ||
              await page.getByLabel('Country code').inputValue()!=='+91')
            throw Error('Switching to Mobile should preserve phone and selected country');
          const registerLink=page.getByRole('link',{name:'Register',exact:true});
          if(await registerLink.getAttribute('href')!=='https://cubixgear.tech/signup')
            throw Error('Register must open public website registration');
          // Unknown accounts and incorrect passwords must share the same
          // generic error, without indicating that a particular email exists.
          if(profile.width===390 || profile.width===1440) {
            await page.route('**/api/v1/auth/login',route=>route.fulfill({
              status:400,contentType:'application/json',
              body:JSON.stringify({non_field_errors:['Invalid credentials or workshop selection.']}),
            }));
            await emailOption.click();
            await input.fill('missing@example.test');
            const password=page.locator('input[autocomplete="current-password"]');
            await password.fill('WrongPassword123!');
            await page.getByRole('button',{name:'Sign In',exact:true}).click();
            const generic=page.locator('#login-form-error');
            await generic.waitFor({state:'visible'});
            if(!/Unable to sign in with these details/i.test(await generic.innerText()))
              throw Error('Invalid credentials must show a generic red error');
            if(await page.locator('.login-input-shell.is-error').count()!==2 ||
              await input.getAttribute('aria-invalid')!=='true' ||
              await password.getAttribute('aria-invalid')!=='true')
              throw Error('Invalid credentials must mark both identifier and password red');
            await input.fill('other@example.test');
            if(await generic.count() || await page.locator('.login-input-shell.is-error').count())
              throw Error('Correcting login credentials must clear stale red errors');
            await password.fill('');
            await page.unroute('**/api/v1/auth/login');
          }
          // Restore the default Email mode and clear values for the existing
          // empty-field border validation performed later on this page.
          await input.fill('');
          await emailOption.click();
          await input.fill('');
        }
        if(path==='/staff-management/add') {
          await page.getByRole('heading',{name:'Add Staff'}).waitFor({state:'visible'});
          if(await page.getByText('Manual WhatsApp Consent').count() ||
              await page.getByText('Staff agreed to receive manual WhatsApp setup links').count() ||
              await page.locator('input[name="whatsappConsentSource"]').count() ||
              await page.locator('select[name="whatsappConsentSource"]').count())
            throw Error('Staff add form must not require manual WhatsApp consent fields');
          if(await page.getByRole('button',{name:'Save Staff'}).count()!==1)
            throw Error('Save Staff action is missing');
          if ([320, 390, 1440].includes(profile.width)) {
            const roles = /\/api\/v1\/roles\/?$/;
            const branches = /\/api\/v1\/branches\/?$/;
            const employees = /\/api\/v1\/employees\/?$/;
            const duplicate = 'This mobile already has a login account in this workshop.';
            await page.route(roles, route => route.fulfill({json:[{id:'staff-role',name:'Mechanic',is_active:true}]}));
            await page.route(branches, route => route.fulfill({json:[{id:'staff-branch',name:'Main Branch',is_active:true}]}));
            await page.route(employees, route => route.request().method() === 'POST'
              ? route.fulfill({status:400,json:{phone:[duplicate]}}) : route.fallback());
            await page.reload({waitUntil:'networkidle'});
            const phone = page.locator('#staff-mobile-number');
            const field = page.locator('.staff-phone-field');
            const save = page.getByRole('button', {name:'Save Staff'});
            await page.getByPlaceholder('Full name').fill('Fixture Staff Member');
            const before = await phone.boundingBox();
            await phone.fill('9876543210');
            await page.locator('select[name=branchId]').selectOption('staff-branch');
            await page.locator('select[name=role]').selectOption('staff-role');
            await save.click();
            await field.getByRole('alert').filter({hasText:duplicate}).waitFor();
            const layout = await field.evaluate(node => {
              const input = node.querySelector('input').getBoundingClientRect();
              const error = node.querySelector('.cg-inline-field-error').getBoundingClientRect();
              return { width:input.width, gap:error.top - input.bottom };
            });
            if (before.width < 120 || Math.abs(before.width - layout.width) > 1 || layout.gap < 0) {
              throw Error(`Invalid staff phone layout: ${JSON.stringify({beforeWidth:before.width, ...layout})}`);
            }
            const country = field.getByRole('combobox', {name:'Mobile country code'});
            await country.selectOption('+971');
            if (await field.getByRole('alert').count() || await phone.getAttribute('aria-invalid')) {
              throw Error('Changing the country code must clear the previous mobile error.');
            }
            await country.selectOption('+91');
            await phone.fill('9876543211');
            if (await phone.inputValue() !== '9876543211') throw Error('Staff mobile input must accept all ten digits.');
            await Promise.all([page.unroute(roles), page.unroute(branches), page.unroute(employees)]);
          }
        }
        if(path==='/forgot-password') {
          await page.getByRole('heading',{name:'Reset your password'}).waitFor({state:'visible'});
          // A saved app theme can differ from the operating system theme.
          await page.emulateMedia({colorScheme:profile.theme==='dark'?'light':'dark'});
          const contrast = selector => page.locator(selector).evaluate(container => {
            const background = getComputedStyle(container).backgroundColor;
            const text = container.querySelector('p, span') || container;
            const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number)
              .map(channel => channel / 255)
              .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
              .reduce((sum, value, i) => sum + value * [0.2126,0.7152,0.0722][i], 0);
            const levels = [luminance(background), luminance(getComputedStyle(text).color)];
            return (Math.max(...levels) + 0.05) / (Math.min(...levels) + 0.05);
          });
          const email=page.locator('#forgot-password-email');
          if(await page.locator('input[type="email"]').count()!==1)
            throw Error('Account recovery must have exactly one email input');
          if(await page.locator('input[type="tel"],input[autocomplete="organization"],.auth-mode-tabs').count())
            throw Error('Old mobile/workshop recovery controls must not appear');
          if(await page.getByText('Staff Reset Help').count())
            throw Error('Staff Reset Help should remain removed');
          if(await page.getByRole('button',{name:'Mobile Recovery (Manual)'}).count())
            throw Error('Manual mobile recovery button must not appear');
          const reset=page.getByRole('button',{name:'Reset Password',exact:true});
          const magic=page.getByRole('button',{name:'Magic Login Link',exact:true});
          if(await reset.getAttribute('aria-pressed')!=='true' ||
              await magic.getAttribute('aria-pressed')!=='false')
            throw Error('Password reset must be the default recovery method');
          if (await contrast('.auth-recovery-method.is-active') < 4.5 ||
              await contrast('.forgot-password-page .login-submit') < 4.5) {
            throw Error('The selected recovery method and submit button need readable text contrast.');
          }
          if(await page.getByRole('button',{name:'Send Reset Link'}).count()!==1)
            throw Error('Password reset submit action is missing');
          await email.fill('not-an-email');
          await page.getByRole('button',{name:'Send Reset Link'}).click();
          if(await email.getAttribute('aria-invalid')!=='true' ||
             await page.locator('.auth-field-error').count()!==1 ||
             await page.locator('.login-input-shell.is-error').count()!==1)
            throw Error('Malformed recovery email must produce red inline validation');
          await email.fill('member@example.test');
          if(await page.locator('.login-input-shell.is-error').count())
            throw Error('Correcting recovery email must clear the red input error');
          await magic.click();
          if(await magic.getAttribute('aria-pressed')!=='true' ||
              await page.getByRole('heading',{name:'Sign in with a magic link'}).count()!==1 ||
              await page.getByRole('button',{name:'Send Magic Link'}).count()!==1)
            throw Error('Magic login option must render its own title and submit action');
          if(await email.inputValue()!=='member@example.test')
            throw Error('Changing recovery method must preserve the typed email');
          await email.fill('invalid-address');
          await page.getByRole('button',{name:'Send Magic Link'}).click();
          if(await email.getAttribute('aria-invalid')!=='true' ||
             !await page.locator('.login-input-shell.is-error').count())
            throw Error('Magic link must reject an invalid email with red input border');
          await email.fill('member@example.test');
          if(await page.locator('input[type="email"]').count()!==1)
            throw Error('Recovery modes should share a single email input');
          const twoOptionLayout=await page.locator('.auth-recovery-methods').evaluate(el=>{
            const buttons=[...el.querySelectorAll('button')].map(b=>b.getBoundingClientRect());
            return {firstRight:buttons[0].right,secondLeft:buttons[1].left};
          });
          if(twoOptionLayout.firstRight>twoOptionLayout.secondLeft+1)
            throw Error('Recovery method buttons must fit side-by-side on mobile');
          // Verify the actual request route and normalized email without sending
          // to a real API or exposing a production recovery token.
          if(profile.width===390 || profile.width===1440) {
            const requests=[];
            await page.route('**/api/v1/auth/magic-link', async route=>{
              requests.push({kind:'magic',body:route.request().postDataJSON()});
              await route.fulfill({status:200,contentType:'application/json',
                body:JSON.stringify({message:'If the account exists, a magic link has been sent.'})});
            });
            await page.route('**/api/v1/auth/forgot-password', async route=>{
              requests.push({kind:'reset',body:route.request().postDataJSON()});
              await route.fulfill({status:200,contentType:'application/json',
                body:JSON.stringify({message:'If an eligible staff account exists, ask your administrator.'})});
            });
            await email.fill('Member@Example.com');
            await page.getByRole('button',{name:'Send Magic Link'}).click();
            const neutralStatus=page.locator('.auth-recovery-feedback.is-info[role="status"]');
            await neutralStatus.waitFor({state:'visible'});
            if(requests.length!==1||requests[0].kind!=='magic'||
               requests[0].body?.email!=='member@example.com')
              throw Error('Magic link should send normalized email to the magic-link API');
            const presentation=await neutralStatus.evaluate(node=>{
              const button=document.querySelector('.login-form .login-submit').getBoundingClientRect();
              const status=node.getBoundingClientRect();
              const styles=getComputedStyle(node);
              return {
                message:node.textContent.trim(),
                belowButton:status.top>=button.bottom,
                borderTopWidth:styles.borderTopWidth,
                fontSize:parseFloat(styles.fontSize),
                height:status.height,
              };
            });
            if(!presentation.message.includes('Check your email') ||
              !presentation.message.includes('If this email is eligible') ||
              !presentation.belowButton ||
              presentation.borderTopWidth==='0px' ||
              presentation.fontSize<12 || presentation.height<40)
              throw Error('Neutral magic link acknowledgment must be visible and accessible: '+JSON.stringify(presentation));
            if (await contrast('.auth-recovery-feedback.is-info') < 4.5)
              throw Error('Recovery acknowledgement contrast must follow the app theme.');
            await reset.click();
            if(await page.locator('.auth-recovery-feedback[role="status"]').count())
              throw Error('Changing recovery method should clear stale recovery feedback');
            await page.getByRole('button',{name:'Send Reset Link'}).click();
            await page.locator('.auth-recovery-feedback.is-info[role="status"]').waitFor({state:'visible'});
            if(requests.length!==2||requests[1].kind!=='reset'||
               requests[1].body?.email!=='member@example.com')
              throw Error('Reset mode must submit to the password-reset API');
            // Backend field-level errors must appear directly under the input
            // with a red outline, not as a large toast/banner.
            await page.route('**/api/v1/auth/forgot-password',route=>route.fulfill({
              status:400,contentType:'application/json',
              body:JSON.stringify({email:['Enter a valid email address.']}),
            }));
            await email.fill('another@example.test');
            await page.getByRole('button',{name:'Send Reset Link'}).click();
            await page.locator('#forgot-password-email-error').waitFor({state:'visible'});
            if(await email.getAttribute('aria-invalid')!=='true' ||
               await page.locator('.login-input-shell.is-error').count()!==1 ||
               await page.locator('.auth-recovery-feedback').count())
              throw Error('Server-side email error should be shown inline with a red input outline');
            await email.fill('corrected@example.test');
            if(await page.locator('.auth-field-error,.login-input-shell.is-error').count())
              throw Error('Changing recovery email must clear server-side errors');
            await page.route('**/api/v1/auth/forgot-password', route=>route.fulfill({
              status:429, contentType:'application/json', headers:{'Retry-After':'120'},
              body:JSON.stringify({detail:'Request was throttled.'}),
            }));
            await page.getByRole('button',{name:'Send Reset Link'}).click();
            const failure=page.locator('.auth-recovery-feedback.is-error[role="alert"]');
            await failure.waitFor({state:'visible'});
            if (await contrast('.auth-recovery-feedback.is-error') < 4.5)
              throw Error('Recovery error contrast must follow the app theme.');
            if(!/Too many requests/.test(await failure.innerText()) ||
               await page.locator('.auth-recovery-feedback.is-info').count())
              throw Error('Throttling must show a visible error without stale recovery confirmation');
            await email.fill('fixed@example.test');
            if(await page.locator('.auth-recovery-feedback').count())
              throw Error('Editing email must dismiss stale recovery errors');
          } else {
            await reset.click();
          }
          if(await reset.getAttribute('aria-pressed')!=='true' ||
             await page.getByRole('heading',{name:'Reset your password'}).count()!==1)
            throw Error('Reset option should restore the original recovery form');
          const logo=page.locator('.login-brand-mark img.cubixgear-logo-image');
          if(await logo.count()!==1 || !await logo.evaluate(node=>node.complete && node.naturalWidth>0))
            throw Error('Cubixgear recovery page logo is missing');
          await page.emulateMedia({colorScheme:profile.theme});
        }
        const text=await page.locator('body').innerText();
        if(text.length<20)throw Error('Blank page');
        if(errors.length)throw Error(errors.join('; '));
        if(path!='/access-denied' && page.url().includes('/access-denied'))throw Error('Authorized fixture denied');
        const overflow=await page.evaluate(()=>{
          const nodes=[document.documentElement,...document.querySelectorAll('.app-content,.login-shell')];
          return nodes.filter(node=>node.clientWidth>0&&node.scrollWidth>node.clientWidth+2).map(node=>node.className||node.tagName);
        });
        if(overflow.length)throw Error('Horizontal page overflow: '+overflow.join(', '));
        if (['/finance','/finance/payments','/finance/expenses','/finance/accounts','/finance/transfers','/finance/transactions','/finance/accounting'].includes(path) &&
            [320, 390, 1440].includes(profile.width)) {
          const workspace = page.locator('.finance-workspace');
          await workspace.getByRole('heading', {level:1}).waitFor();
          const active = workspace.locator('nav[aria-label="Finance sections"] [aria-current="page"]');
          if (await active.getAttribute('href') !== path) throw Error('Finance navigation must mark the current page.');
          await page.waitForFunction(() => {
            const tab = document.querySelector('.finance-workspace-tabs [aria-current="page"]');
            const rect = tab?.getBoundingClientRect();
            const tabs = tab?.parentElement.getBoundingClientRect();
            return rect && rect.left >= tabs.left - 1 && rect.right <= tabs.right + 1;
          });
          if (path === '/finance') {
            await workspace.getByRole('region', {name:'Outstanding dues'}).getByText('₹1,000.00').waitFor();
            await workspace.getByText('₹69,90,436.00', {exact:true}).first().waitFor();
            if (await workspace.getByRole('link', {name:'Record Payment',exact:true}).count() !== 1) {
              throw Error('Finance Overview must have a single Record Payment action.');
            }
          }
          if (path === '/finance/payments') {
            await workspace.getByText('Fixture Customer', {exact:true}).first().waitFor({state:'attached'});
            const ledger = workspace.locator('.finance-payment-activity');
            await ledger.getByRole('heading', {name:'Account ledger'}).waitFor({state:'hidden'});
            await ledger.locator('summary').first().click();
            await ledger.getByRole('heading', {name:'Account ledger'}).waitFor();
          }
          if (path === '/finance/accounts') {
            const account = workspace.getByRole('link', {name:'View account Cash in Hand'});
            await account.waitFor();
            if (!(await account.getAttribute('href')).startsWith('/finance/accounts/ref-')) throw Error('Cash account links must use record references.');
          }
          if (path === '/finance/transfers') await workspace.getByRole('heading', {name:'No transfers yet'}).waitFor();
          if (path === '/finance/accounting' || path === '/finance/transactions') {
            const table = workspace.locator('.finance-responsive-table').first();
            await table.getByText('Cash in Hand', {exact:true}).waitFor();
            if (profile.width <= 390 && await table.evaluate(el => el.scrollWidth > el.parentElement.clientWidth + 2)) {
              throw Error('Mobile finance ledger should fit without horizontal scrolling.');
            }
          }
          if (path === '/finance/transactions' && profile.width === 390) {
            const query = await workspace.locator('.finance-ref-cell').first().innerText();
            await workspace.getByRole('searchbox', {name:'Search transactions'}).fill(query);
            const applied = page.waitForRequest(request => {
              const url = new URL(request.url());
              return url.pathname.endsWith('/finance/ledger') && url.searchParams.get('q') === query;
            });
            await workspace.getByRole('button', {name:'Filter',exact:true}).click();
            await applied;
            await workspace.getByText('1 posted entry').waitFor();
          }
          if ((await workspace.innerText()).includes(financeFixtureId)) throw Error('Raw UUID exposed in Finance UI.');
        }
        // Shared real form components: outlined labels, proper border ownership,
        // filled-state label persistence, and keyboard-accessible searchable picker.
        if ((path==='/customers/new' || path==='/vehicles/new') &&
            (profile.width===390 || profile.width===1440)) {
          const controls = page.locator('.cg-floating-field > [data-cg-input-shell]');
          if(await controls.count()<3) throw Error('Shared outlined fields are missing on '+path);
          const state = await controls.first().evaluate(shell=>{
            const input = shell.querySelector('input,select');
            const styles = getComputedStyle(shell);
            const inner = getComputedStyle(input);
            return {outerBorder:parseFloat(styles.borderLeftWidth),
              innerBorder:parseFloat(inner.borderLeftWidth),
              height:shell.getBoundingClientRect().height,
              font:parseFloat(inner.fontSize),
              label:!!shell.querySelector('label[for]')};
          });
          if(!state.label || state.outerBorder<.9 || state.innerBorder>.1 ||
              state.height<44 || state.height>51 || state.font<15.5) {
            throw Error('Invalid shared field shell: '+JSON.stringify(state));
          }
          if(path==='/customers/new') {
            const name=page.getByLabel('Customer Name',{exact:false});
            await name.fill('Test Workshop Customer');
            await name.blur();
            const float=await name.evaluate(field=>{
              const shell=field.closest('[data-cg-input-shell]');
              const label=shell.querySelector('.cg-floating-label');
              const labelRect=label.getBoundingClientRect();
              const shellTop=shell.getBoundingClientRect().top;
              return {labelCenter:(labelRect.top+labelRect.bottom)/2,
                labelTop:labelRect.top,shellTop};
            });
            // A floating label straddles its input border and is centered on it.
            if(Math.abs(float.labelCenter-float.shellTop)>3 || float.labelTop>=float.shellTop) {
              throw Error('Filled Customer Name label does not float: '+JSON.stringify(float));
            }
          }
          if(path==='/vehicles/new') {
            const picker=page.getByRole('combobox',{name:'Customer Owner'});
            await picker.click();
            const search=page.getByRole('searchbox',{name:'Search Customer Owner'});
            await search.waitFor({state:'visible'});
            await search.focus();
            const searchLayout=await search.evaluate(input=>{
              const row=input.parentElement;
              const icon=row.querySelector('svg').getBoundingClientRect();
              const field=input.getBoundingClientRect();
              const shell=row.getBoundingClientRect();
              const menu=row.parentElement.getBoundingClientRect();
              const trigger=row.closest('.searchable-select-wrapper').querySelector('[role="combobox"]').getBoundingClientRect();
              return {
                aligned:Math.abs((icon.top+icon.height/2)-(field.top+field.height/2))<=2 && icon.right<=field.left,
                fillsRow:field.right<=shell.right && shell.right-field.right<=16 && field.height>=44,
                menuFitsTrigger:Math.abs(menu.left-trigger.left)<=1 && Math.abs(menu.right-trigger.right)<=1,
                singleFocus:getComputedStyle(input).outlineStyle==='none' && getComputedStyle(row).outlineStyle==='solid',
              };
            });
            if(Object.values(searchLayout).some((value)=>!value)) {
              throw Error('Customer Owner search layout is broken: '+JSON.stringify(searchLayout));
            }
            await search.press('ArrowDown');
            await search.press('ArrowUp');
            await search.press('Enter');
            if(await picker.getAttribute('aria-expanded')!=='false') {
              throw Error('Searchable Customer Owner select did not close after keyboard selection');
            }
            const make=page.locator('[data-vehicle-field="make"] select');
            const model=page.locator('[data-vehicle-field="model"] select');
            const registration=page.locator('[data-vehicle-field="regNo"]');
            if(!await model.isDisabled()) throw Error('Select a Make before choosing a Model.');
            await registration.fill('KL 10 AB 1234');
            await make.selectOption('Maruti Suzuki');
            await model.selectOption('Swift');
            const models=await model.locator('option').allTextContents();
            if(!models.includes('Eeco') || models.includes('Innova')) throw Error('Models must match the selected Make.');
            await make.selectOption('Toyota');
            if(await model.inputValue()!=='') throw Error('Switching Makes must reset the selected Model.');
            await model.locator('option[value="Land Cruiser Prado"]').waitFor({state:'attached'});
            await page.getByRole('button',{name:'Add Model',exact:true}).click();
            await page.getByLabel('New Model for Toyota').fill('Workshop Test Model');
            await page.getByRole('button',{name:'Use Model',exact:true}).click();
            if(await model.inputValue()!=='Workshop Test Model' || await registration.inputValue()!=='KL 10 AB 1234') {
              throw Error('Using a custom Model should preserve the registration number.');
            }
          }
        }
        if(path==='/jobs') {
          // Compact mobile layout keeps advanced filters collapsed by default.
          // Expand them before checking ALL control sizes and editing dates.
          const grid = page.locator('.jobs-toolbar-combined');
          await grid.waitFor({state:'visible'});
          const mobileMoreFilters = page.locator('.jobs-more-filters');
          if (await mobileMoreFilters.isVisible()) {
            if (await mobileMoreFilters.getAttribute('aria-expanded') !== 'false') {
              throw Error('Mobile Job Cards advanced filters must start collapsed');
            }
            const hiddenDate = page.getByLabel('Job card created from date');
            if (await hiddenDate.isVisible()) {
              throw Error('Mobile advanced date filters must start hidden');
            }
            await mobileMoreFilters.click();
            if (await mobileMoreFilters.getAttribute('aria-expanded') !== 'true') {
              throw Error('Mobile Job Cards advanced filters did not expand');
            }
          }
          const metrics = await grid.evaluate(root => {
            const dashboard = root.closest('.jobs-dashboard');
            const elements = [...root.querySelectorAll('.jobs-filter-field,.jobs-toolbar-actions')];
            const fields = elements.map(node => {
              const rect = node.getBoundingClientRect();
              const label = node.querySelector('.jobs-filter-label')?.getBoundingClientRect();
              const control = node.querySelector('.jobs-search,select,input,.jobs-toolbar-actions-content')?.getBoundingClientRect();
              return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
                labelAbove:!label||!control||label.bottom<=control.top+1};
            });
            const rows = new Set(fields.map(rect=>Math.round(rect.top/3)*3)).size;
            const overlaps = fields.some((a,i)=>fields.some((b,j)=>
              j>i && a.left<b.right-2 && b.left<a.right-2 && a.top<b.bottom-2 && b.top<a.bottom-2));
            const controls = [...root.querySelectorAll('input,select')].map(node=>({
              height:node.getBoundingClientRect().height,
              font:parseFloat(getComputedStyle(node).fontSize),
            }));
            return {containerWidth:dashboard?.getBoundingClientRect().width,
              rows,overlaps,labelAbove:fields.every(x=>x.labelAbove),
              fieldCount:fields.length,controls,
              positions:elements.map((node,i)=>({field:node.className,top:fields[i].top,height:fields[i].bottom-fields[i].top})),
              columns:getComputedStyle(root).gridTemplateColumns};
          });
          if(metrics.fieldCount!==8 || metrics.overlaps || !metrics.labelAbove) {
            throw Error('Job Cards filter grid has missing or overlapping fields: '+JSON.stringify(metrics));
          }
          if(metrics.containerWidth>=920 && metrics.rows!==2) {
            throw Error('Desktop job filter toolbar must have exactly two rows: '+JSON.stringify(metrics));
          }
          if(metrics.controls.some(x=>x.height<43 || x.height>49)) {
            throw Error('Job filter inputs are not consistent 44–48px controls: '+JSON.stringify(metrics));
          }
          if(profile.width<=640 && metrics.controls.some(x=>x.font<15.5)) {
            throw Error('Mobile job filter value font below 16px: '+JSON.stringify(metrics));
          }
          if(profile.width===390 || profile.width===1440) {
            const search = page.getByRole('searchbox',{name:'Search job cards'});
            await search.fill('KL10');
            await page.waitForFunction(()=>new URL(location.href).searchParams.get('q')==='KL10');
            await page.getByLabel('Filter job cards by status').selectOption('Active');
            await page.waitForFunction(()=>new URL(location.href).searchParams.get('status')==='active');
            await page.getByLabel('Clear job search').click();
            await page.waitForFunction(()=>!new URL(location.href).searchParams.has('q'));
            if(new URL(page.url()).searchParams.get('status')!=='active') {
              throw Error('Clearing Job Cards search unexpectedly cleared status filter');
            }
            await page.getByLabel('Job card created from date').fill('2026-01-01');
            await page.getByLabel('Job card created to date').fill('2026-12-31');
            await page.waitForFunction(()=>new URL(location.href).searchParams.get('to')==='2026-12-31');
            await page.getByRole('button',{name:'Reset Filters'}).click();
            await page.waitForFunction(()=>new URL(location.href).searchParams.toString()==='');
          }
        }
        if(profile.width < 768) {
          const undersized = await page.locator('.ui-icon-button').evaluateAll(nodes => nodes
            .filter(node => node.getClientRects().length)
            .filter(node => { const rect=node.getBoundingClientRect(); return rect.width < 44 || rect.height < 44; })
            .map(node => node.getAttribute('aria-label') || 'Unlabelled icon action'));
          if(undersized.length) throw Error('Small touch controls: '+undersized.join(', '));
        }
        if(['/login','/settings','/staff-management/add','/customers/new','/vehicles/new'].includes(path)){
          const sizes=await page.locator('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>parseFloat(getComputedStyle(e).fontSize)));
          if(sizes.some(size=>size<16))throw Error('Form control text below 16px: '+sizes.join(','));
        }
        // Services: verify computed borderless styles on actual rendered controls.
        // CI reads forms only and never posts a service or category.
        if((path==='/services/new' || path==='/services') &&
            (profile.width===390 || profile.width===1440)){
          const checkFields=async (selector, expectedMin=4)=>{
            const form=page.locator(selector);
            await form.waitFor({state:'visible'});
            const results=await form.evaluate(root=>{
              const inputs=[...root.querySelectorAll('input,select,textarea')]
                .filter(el=>el.getClientRects().length)
                .map(el=>({
                  border:parseFloat(getComputedStyle(el).borderLeftWidth),
                  font:parseFloat(getComputedStyle(el).fontSize),
                  height:Math.round(el.getBoundingClientRect().height),
                }));
              const labels=[...root.querySelectorAll('.service-field > span')]
                .filter(el=>el.getClientRects().length)
                .map(el=>parseFloat(getComputedStyle(el).fontSize));
              const buttons=[...root.querySelectorAll('.service-form-actions button')]
                .filter(el=>el.getClientRects().length)
                .map(el=>Math.round(el.getBoundingClientRect().height));
              return {inputs,labels,buttons};
            });
            if(results.inputs.length<expectedMin ||
              results.inputs.some(input=>input.border>0 || input.font<16 || input.height<48) ||
              results.labels.some(size=>size<14) ||
              results.buttons.some(height=>height<48)){
              throw Error('Services borderless form style mismatch: '+
                JSON.stringify({path,width:profile.width,...results}));
            }
          };
          if(path==='/services/new'){
            await checkFields('.service-form-page form.service-form',8);
            const editor=page.locator('.cg-service-editor');
            const layout=await editor.evaluate(el=>{
              const sections=[...el.querySelectorAll('.service-form-section')];
              const name=el.querySelector('input[placeholder="e.g. Front Brake Pad Replacement"]');
              const buttons=[...el.querySelectorAll('.cg-service-editor-actions button')];
              return {
                sections:sections.length,
                requiredFields:el.querySelectorAll('.cg-service-required').length,
                nameFullWidth: name ? name.getBoundingClientRect().width > 230 : false,
                toolbarHeight:buttons.map(button=>Math.round(button.getBoundingClientRect().height)),
                summary:!!el.querySelector('.cg-service-editor-summary'),
                pageOverflow:document.documentElement.scrollWidth>window.innerWidth+2,
              };
            });
            if(layout.sections!==3 || layout.requiredFields!==3 ||
                !layout.nameFullWidth || !layout.summary || layout.pageOverflow ||
                layout.toolbarHeight.some(height=>height<48)){
              throw Error('Add Service editor layout mismatch: '+JSON.stringify({width:profile.width,...layout}));
            }
            await editor.locator('input[placeholder="0.00"]').fill('999.86');
            const preview=await editor.locator('.cg-service-editor-summary').innerText();
            if(!preview.includes('999.86')) {
              throw Error('Service rate preview incorrectly rounds paise: '+preview);
            }
          } else {
            const search=page.locator('.service-dashboard-search');
            await search.waitFor({state:'visible'});
            const results=await search.evaluate(shell=>{
              const input=shell.querySelector('input');
              return {
                border:parseFloat(getComputedStyle(shell).borderLeftWidth),
                height:Math.round(shell.getBoundingClientRect().height),
                innerBorder:parseFloat(getComputedStyle(input).borderLeftWidth),
                innerFont:parseFloat(getComputedStyle(input).fontSize),
              };
            });
            if(results.border>0||results.innerBorder>0||results.height<48||results.innerFont<16)
              throw Error('Services directory search style mismatch: '+JSON.stringify(results));
            // Service Categories are now a single compact modal, not a
            // separate Categories tab. Exercise the actual Add Category button.
            await page.getByRole('button',{name:'Add Category',exact:true}).click();
            await checkFields('.service-category-form',3);
            await page.getByRole('dialog',{name:'Add Category'})
              .getByRole('button',{name:'Close dialog'}).click();
          }
        }
        // Payments UI: inspect computed styles on actual entry and dashboard controls.
        // Never submit/record a payment: the mock API fixture is read-only.
        if(['/payments','/payments/new'].includes(path) &&
            [390,1440].includes(profile.width)) {
          if(path==='/payments/new'){
            const entry=page.locator('.payments-entry-page .payment-form-card');
            await entry.waitFor({state:'visible'});
            const metrics=await entry.evaluate(root=>{
              const inputs=[...root.querySelectorAll('.payment-form-grid input,.payment-form-grid select')]
                .filter(node=>node.getClientRects().length)
                .map(node=>{
                  const c=getComputedStyle(node);
                  return {font:parseFloat(c.fontSize), border:parseFloat(c.borderLeftWidth),
                    height:Math.round(node.getBoundingClientRect().height)};
                });
              const labels=[...root.querySelectorAll('.payment-form-grid label > span')]
                .map(node=>parseFloat(getComputedStyle(node).fontSize));
              const actions=[...root.querySelectorAll('.payment-form-actions button')]
                .map(node=>Math.round(node.getBoundingClientRect().height));
              const grid=root.querySelector('.payment-form-grid');
              return {inputs,labels,actions,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length};
            });
            const cols=profile.width<=760?1:2;
            if(metrics.inputs.length<6 || metrics.inputs.some(x=>x.font<16||x.border>0||x.height<48)
              || metrics.labels.some(x=>x<14) || metrics.actions.some(x=>x<48)
              || metrics.columns!==cols){
              throw Error('Payment form computed styles mismatch: '+
                JSON.stringify({width:profile.width,...metrics}));
            }
          } else {
            const toolbar=page.locator('.payments-dashboard-toolbar');
            await toolbar.waitFor({state:'visible'});
            const metrics=await toolbar.evaluate(root=>
              [...root.querySelectorAll('.payments-dashboard-search,.payments-dashboard-filter')].map(shell=>{
                const inner=shell.querySelector('input,select');
                return {border:parseFloat(getComputedStyle(shell).borderLeftWidth),
                  height:Math.round(shell.getBoundingClientRect().height),
                  font:parseFloat(getComputedStyle(inner).fontSize),
                  innerBorder:parseFloat(getComputedStyle(inner).borderLeftWidth)};
              })
            );
            if(metrics.length!==3 || metrics.some(x=>x.border>0||x.innerBorder>0||x.font<16||x.height<48)){
              throw Error('Payment filter computed styles mismatch: '+
                JSON.stringify({width:profile.width,metrics}));
            }
          }
        }
        if(path==='/account/security' && (profile.width===390 || profile.width===1440)) {
          // Real computed styles: the password input must not paint a second
          // inset rectangle or overflow its lock/visibility controls.
          const form=page.locator('.account-security-form');
          await form.waitFor({state:'visible'});
          const measured=await form.evaluate(node=>
            [...node.querySelectorAll('.account-security-input-row')].map(row=>{
              const input=row.querySelector('input');
              const icon=row.querySelector('svg.account-security-field-icon');
              const toggle=row.querySelector('button.account-security-visibility-toggle');
              const outer=getComputedStyle(row);
              const inner=getComputedStyle(input);
              const box=row.getBoundingClientRect();
              const textBox=input.getBoundingClientRect();
              const toggleBox=toggle.getBoundingClientRect();
              const iconBox=icon.getBoundingClientRect();
              return {
                border:parseFloat(outer.borderLeftWidth),
                height:Math.round(box.height),
                innerBorder:parseFloat(inner.borderLeftWidth),
                innerBackground:inner.backgroundColor,
                innerRadius:parseFloat(inner.borderTopLeftRadius),
                font:parseFloat(inner.fontSize),
                iconFits:iconBox.left>=box.left && iconBox.right<textBox.left,
                toggleFits:toggleBox.left>=textBox.right-1 && toggleBox.right<=box.right+1,
                buttonHeight:Math.round(toggleBox.height),
                width:Math.round(textBox.width),
              };
            })
          );
          if(measured.length!==3 || measured.some(field=>
              field.border>0 || field.height<50 || field.innerBorder>0 ||
              field.innerBackground!=='rgba(0, 0, 0, 0)' || field.innerRadius>0 ||
              field.font<16 || field.buttonHeight<44 || field.width<100 ||
              !field.iconFits || !field.toggleFits)) {
            throw Error('Account Security password input layout mismatch: '+
              JSON.stringify({width:profile.width,measured}));
          }
          const current=page.locator('input[aria-label="Current password"]');
          await current.fill('test-password-only');
          await page.getByRole('button',{name:'Show current password'}).click();
          if(await current.getAttribute('type')!=='text') {
            throw Error('Account Security visibility toggle failed');
          }
          await page.getByRole('button',{name:'Hide current password'}).click();
          if(await current.getAttribute('type')!=='password') {
            throw Error('Account Security password did not hide');
          }
          const confirm=page.locator('input[aria-label="Confirm new password"]');
          await page.getByRole('button',{name:'Show confirmed password'}).click();
          if(await confirm.getAttribute('type')!=='text') {
            throw Error('Account Security confirmed password visibility failed');
          }
          const newInput = form.locator('input[aria-label="New password"]');
          await newInput.fill('NewFixturePassword123!');
          await confirm.fill('DifferentPassword123!');
          const savePassword = form.getByRole('button', {name:'Change Password',exact:true});
          await savePassword.click();
          await form.getByRole('alert').filter({hasText:'New passwords do not match.'}).waitFor();
          await confirm.fill('NewFixturePassword123!');
          const passwordPath = '**/api/v1/auth/change-password';
          let attempts = 0;
          await page.route(passwordPath, async route => {
            attempts += 1;
            const sent = route.request().postDataJSON();
            if (sent.currentPassword !== 'test-password-only' || sent.newPassword !== 'NewFixturePassword123!') {
              await route.fulfill({status:422,json:{message:'Unexpected test field mapping.'}});
              return;
            }
            await route.fulfill(attempts === 1
              ? {status:400,json:{message:'Current password is incorrect.'}}
              : {status:200,json:{message:'Password changed successfully. Please sign in again.'}});
          });
          await savePassword.click();
          await form.getByRole('alert').filter({hasText:'Current password is incorrect.'}).waitFor();
          if (await current.getAttribute('aria-invalid') !== 'true') throw Error('Mark the current password field on a mismatch.');
          await page.evaluate(() => localStorage.setItem('auth_refresh_token','fixture-refresh'));
          await Promise.all([page.waitForURL('**/login?reset=success'), savePassword.click()]);
          await page.getByRole('status').filter({hasText:'Sign in with your new password.'}).waitFor();
          if (await page.evaluate(() => ['auth_token','auth_refresh_token','auth_user'].some(key => localStorage.getItem(key)))) {
            throw Error('Successful password change must clear revoked credentials.');
          }
          await page.unroute(passwordPath);
          await page.goto(baseURL+path,{waitUntil:'networkidle'});
        }
        // Customer creation popup: inspect rendered fields (not only CSS text).
        // Keep it read-only; never submit a customer in CI.
        if(path==='/customers' && (profile.width===390 || profile.width===1440)) {
          await page.getByRole('button',{name:'Add Customer'}).first().click();
          const dialog=page.getByRole('dialog',{name:'Add Workshop Customer'});
          await dialog.waitFor({state:'visible'});
          const form=dialog.locator('form.customer-directory-form');
          const measurements=await form.evaluate(root=>{
            const shells=[...root.querySelectorAll('[data-cg-input-shell="true"]')];
            const controls=shells.map(shell=>{
              const control=shell.querySelector('input,select');
              return {
                border:parseFloat(getComputedStyle(shell).borderLeftWidth),
                height:Math.round(shell.getBoundingClientRect().height),
                textSize:control?parseFloat(getComputedStyle(control).fontSize):0,
                controlBorder:control?parseFloat(getComputedStyle(control).borderLeftWidth):0,
              };
            });
            const notes=[...root.querySelectorAll('textarea')].map(el=>({
              border:parseFloat(getComputedStyle(el).borderLeftWidth),
              textSize:parseFloat(getComputedStyle(el).fontSize),
            }));
            const labels=[...root.querySelectorAll('.ui-label')].map(el=>
              parseFloat(getComputedStyle(el).fontSize));
            const firstGrid=root.querySelector('.customer-directory-form-grid');
            const columns=firstGrid?getComputedStyle(firstGrid).gridTemplateColumns.split(' ').length:0;
            const sheet=root.closest('.responsive-modal-sheet');
            const footer=sheet?.querySelector('.responsive-modal-footer');
            const action=sheet?.querySelector('.customer-directory-form-submit');
            const footerRect=footer?.getBoundingClientRect();
            const footerVisible=!!footerRect && footerRect.top>=0
              && footerRect.bottom<=window.innerHeight+2;
            return {controls,notes,labels,columns,footerVisible,
              actionHeight:action?Math.round(action.getBoundingClientRect().height):0};
          });
          const expectedColumns=profile.width<=520?1:2;
          if(!measurements.controls.length||!measurements.notes.length||
            measurements.controls.some(item=>item.border>0||item.controlBorder>0||
              item.height<48||item.textSize<16)||
            measurements.notes.some(item=>item.border>0||item.textSize<16)||
            measurements.labels.some(size=>size<14)||
            measurements.actionHeight<48||!measurements.footerVisible||
            measurements.columns!==expectedColumns) {
            throw Error('Workshop Customer form style mismatch: '+JSON.stringify({width:profile.width,...measurements}));
          }
          const nameInput=dialog.getByRole('textbox',{name:/Customer Name/}).first();
          await nameInput.focus();
          // This shell intentionally animates background-color for 150ms.
          // Sample settled focus/blur colors rather than mid-transition frames.
          await page.waitForTimeout(190);
          const focus=await nameInput.evaluate(input=>{
            const shell=input.closest('[data-cg-input-shell]');
            const focused=getComputedStyle(shell);
            const field=getComputedStyle(input);
            return {
              outline:focused.outlineStyle, border:parseFloat(focused.borderLeftWidth),
              shadow:focused.boxShadow, innerOutline:field.outlineStyle,
              innerBorder:parseFloat(field.borderLeftWidth),
              background:focused.backgroundColor,
            };
          });
          await nameInput.evaluate(input=>input.blur());
          await page.waitForTimeout(190);
          const idle=await nameInput.evaluate(input=>
            getComputedStyle(input.closest('[data-cg-input-shell]')).backgroundColor
          );
          if(focus.outline!=='none'||focus.border!==0||focus.shadow!=='none'||
             focus.innerOutline!=='none'||focus.innerBorder!==0||focus.background===idle){
            throw Error('Workshop Customer fields should be borderless with focus tint: '+JSON.stringify({focus,idle}));
          }
                    await dialog.getByRole('button',{name:'Close dialog'}).click();
          await dialog.waitFor({state:'hidden'});
        }
        // Real computed styles: legacy !important Job Card rules must not
        // shrink iPhone input fonts/labels after the CSS is bundled.
        if(path==='/jobs/JOB-00251/overview' && [390,1440].includes(profile.width)) {
          await page.locator('.job-workflow-tabs').waitFor({state:'visible',timeout:12000});
          const share = page.locator('.job-detail-header .wa-manual-share');
          await share.getByRole('button', {name:'Send via WhatsApp', exact:true}).waitFor();
          if (await share.getByRole('button').count() !== 1) {
            throw Error('Job Card header must have one WhatsApp action.');
          }
          const links=page.locator('.cg-job-connected-links');
          await links.waitFor({state:'visible',timeout:12000});
          for(const dest of ['/customers/CUS-0001','/vehicles/VEH-0001']) {
            if(!await links.locator('a[href="'+dest+'"]').count()) {
              throw Error('Job Card should link to real customer and vehicle profiles: '+dest);
            }
          }
          const financial=page.locator('.job-total-cost-panel');
          if(await financial.count()) {
            const labels=await financial.innerText();
            if(!labels.includes('Customer Selling (before GST)') ||
               !labels.includes('Workshop Direct Cost') ||
               !labels.includes('Indicative Gross Profit')) {
              throw Error('Job Cost, Selling and Profit labels were not separated.');
            }
          }
        }

        if (path === '/jobs/JOB-00251/invoice' && profile.width === 390) {
          const billing = page.locator('.job-invoice-dashboard');
          await billing.getByRole('button', {name:'Create Invoice', exact:true}).waitFor();
          await billing.getByText('Create and finalize the invoice to record delivery.').waitFor();
          if (await billing.getByLabel('Final KM').count() || await billing.getByRole('button', {name:'Complete Delivery'}).count()) {
            throw Error('Delivery form must wait for an issued invoice.');
          }
        }

        if (path === '/invoices/INV-0001' && [320, 390, 1440].includes(profile.width)) {
          const uuid = '00000000-0000-4000-8000-000000000099';
          const reference = 'ref-' + BigInt('0x' + uuid.replaceAll('-', ''));
          const invoiceEndpoint = `**/api/v1/billing/documents/${uuid}`;
          await page.route(invoiceEndpoint, route => route.fulfill({json:{
            ...fixture('/billing/documents/INV-0001'), id:uuid, number:'INV-REF-TEST', status:'Paid',
            finalizedAt:'2026-10-19T09:00:00Z', balance:0, jobId:'JOB-00251',
          }}));
          try {
            for (const identifier of [uuid, reference]) {
              await page.goto(`${baseURL}/invoices/${identifier}`,{waitUntil:'networkidle'});
              await page.getByRole('heading',{name:'INV-REF-TEST',exact:true}).waitFor();
              if (new URL(page.url()).pathname !== `/invoices/${reference}` || (await page.locator('body').innerText()).includes(uuid)) {
                throw Error('Invoice must open by reference without displaying its UUID.');
              }
            }
            const header = page.locator('.invoice-detail-header');
            await header.getByText('Paid', {exact:true}).waitFor();
            await header.getByRole('link', {name:'Back to Job Card'}).waitFor();
            await header.getByRole('button', {name:'Send via WhatsApp'}).waitFor();
            if (await header.getByRole('button', {name:/Copy Message|Payment Reminder|Record Payment/}).count()) {
              throw Error('A paid invoice should show a single WhatsApp action and no payment prompts.');
            }
            const layout = await header.evaluate(node => {
              const toolbar = node.querySelector('.invoice-detail-toolbar').getBoundingClientRect();
              const pdf = node.querySelector('.invoice-detail-pdf').getBoundingClientRect();
              return {
                overflow: node.scrollWidth > node.clientWidth + 2,
                fullWidthPdf: Math.abs(pdf.width - toolbar.width) <= 2,
              };
            });
            if (layout.overflow || (profile.width <= 390 && !layout.fullWidthPdf)) {
              throw Error('Responsive invoice actions exceed the header or the mobile PDF action is too narrow.');
            }
            if (profile.width === 390) {
              await page.emulateMedia({media:'print'});
              await header.waitFor({state:'hidden'});
              await page.locator('.invoice-print-sheet').waitFor({state:'visible'});
              await page.emulateMedia({media:null});
            }
          } finally {
            await page.unroute(invoiceEndpoint);
            await page.goto(baseURL+path,{waitUntil:'networkidle'});
          }
        }

        if(/^\/jobs\/JOB-00251\/(overview|inspection|estimate|work)$/.test(path)){
          const metrics=await page.evaluate(()=>{
            const roots=[...document.querySelectorAll(
              '.cg-job-detail :is(.job-overview-simple,.cg-inspection,.job-quick-estimate,.job-work-simple)'
            )].filter(node=>node.getClientRects().length);
            const fields=roots.flatMap(root=>[...root.querySelectorAll(
              'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]),select,textarea'
            )].filter(node=>node.getClientRects().length).map(node=>({
              kind:node.tagName.toLowerCase(),
              font:parseFloat(getComputedStyle(node).fontSize),
              height:Math.round(node.getBoundingClientRect().height),
              nestedSearch:Boolean(node.closest('.job-quick-catalog-field,.cg-inspection-search')),
            })));
            const labels=roots.flatMap(root=>[...root.querySelectorAll('label')]
              .filter(node=>node.getClientRects().length)
              .map(node=>({
                size:parseFloat(getComputedStyle(node).fontSize),
                className:String(node.className||'').slice(0,90),
                labelText:(node.innerText||'').trim().slice(0,60),
              })));
            return {fields,labels};
          });
          const smallText=metrics.fields.filter(x=>x.font<16);
          const smallControls=metrics.fields.filter(x=>!x.nestedSearch &&
            x.kind!=='textarea' && x.height<44);
          const smallLabels=metrics.labels.filter(label=>label.size<14);
          if(smallText.length||smallControls.length||smallLabels.length)
            throw Error('Job Card forms should use 16px inputs, 14px+ labels, 44px+ controls: '+
              JSON.stringify({smallText,smallControls,smallLabels}));
        }
        // Work > Mechanic must be a real responsive grid, not naked
        // full-width controls. All API fixtures remain read-only.
        if(path==='/jobs/JOB-00251/work'){
          const financial = page.locator('.job-total-cost-panel');
          await financial.getByText('Customer Selling (before GST)', { exact: true }).waitFor();
          if (await financial.getByText(/^(?:Invoice Total|Posted Invoice Bill|Draft Invoice Total|Estimated Bill|Customer Paid|Customer Balance Due)$/).count()) {
            throw Error('Work summary should show selling and costs without invoice or collection cards.');
          }
          const addService = page.locator('.job-work-simple .job-service-quick');
          await addService.waitFor({state:'visible'});
          const serviceControls=await addService.evaluate(node=>{
            const inputs=[...node.querySelectorAll('input, select')].filter(el=>el.getClientRects().length);
            return {form:!!node.querySelector('.job-service-quick-entry'),
              inputMin:Math.min(...inputs.map(el=>parseFloat(getComputedStyle(el).fontSize))),
              minHeight:Math.min(...inputs.map(el=>el.getBoundingClientRect().height))};
          });
          // The standard browser fixture is a read-only Job Card. Mutation
          // fields are intentionally hidden until jobs.edit + Work stage is
          // active; the catalogue search remains accessible for inspection.
          if(serviceControls.inputMin<16 || serviceControls.minHeight<44)
            throw Error('Add Service catalogue controls are not touch friendly: '+JSON.stringify(serviceControls));
          // Timer is intentionally hidden behind Advanced Work Tracking.
          await page.getByRole('button',{name:'Advanced Work Tracking'}).click();
          const mechanic = page.locator('.job-work-simple .job-work-timer-panel');
          await mechanic.waitFor({state:'visible'});
          const layout=await mechanic.evaluate(node=>{
            const form=node.querySelector('.job-work-timer-form');
            const header=node.querySelector('.job-work-timer-head');
            const submit=form?.querySelector('button[type="submit"]');
            const label=form?.querySelector('label');
            const summary=node.querySelector('.job-work-timer-summary');
            const p=node.querySelector('.job-work-timer-hint');
            return {
              panelPadding:parseFloat(getComputedStyle(node).paddingLeft),
              headerDisplay:header&&getComputedStyle(header).display,
              formDisplay:form&&getComputedStyle(form).display,
              columns:form&&getComputedStyle(form).gridTemplateColumns.split(' ').length,
              labelDisplay:label&&getComputedStyle(label).display,
              buttonHeight:submit&&Math.round(submit.getBoundingClientRect().height),
              buttonFill:submit&&getComputedStyle(submit).backgroundColor,
              summaryDisplay:summary&&getComputedStyle(summary).display,
              hintPadding:p&&parseFloat(getComputedStyle(p).paddingLeft),
            };
          });
          const expectedCols=profile.width<=600?1:profile.width<=900?2:3;
          if(layout.formDisplay!=='grid'||layout.headerDisplay!=='flex'||
              layout.labelDisplay!=='flex'||layout.summaryDisplay!=='flex'||
              layout.panelPadding<12||layout.buttonHeight<44||
              layout.hintPadding<8||layout.columns!==expectedCols){
            throw Error('Mechanic form layout incomplete: '+JSON.stringify({width:profile.width,...layout}));
          }
        }
        if(path==='/stock' && [390,1440].includes(profile.width)) {
          // Use real browser computed styles for Stock Add New Product
          // and verify the new Supplier receiving route. No POSTs are made.
          await page.getByRole('button',{name:'Add New Part'}).first().click();
          const addDialog=page.getByRole('dialog',{name:'Add New Part'});
          await addDialog.waitFor();
          const search=await addDialog.locator('.cg-easy-picker-search').evaluate(async node=>{
            const input=node.querySelector('input');
            // Read the settled colors on both sides of the background transition.
            input.focus();
            const readBackground=async()=>{
              // Flush styles so any pending transition is included in getAnimations().
              const before=getComputedStyle(node).backgroundColor;
              const animations=node.getAnimations();
              if(!animations.length)return before;
              await Promise.allSettled(animations.map(animation=>animation.finished));
              return getComputedStyle(node).backgroundColor;
            };
            const focusedBackground=await readBackground();
            const field=getComputedStyle(input),shell=getComputedStyle(node);
            const styles={
              shellHeight:Math.round(node.getBoundingClientRect().height),
              font:parseFloat(field.fontSize), inputBorder:parseFloat(field.borderLeftWidth),
              inputOutline:field.outlineStyle, inputShadow:field.boxShadow,
              shellBorder:parseFloat(shell.borderLeftWidth), shellOutline:shell.outlineStyle,
              shellShadow:shell.boxShadow, focusedBackground,
            };
            input.blur();
            return {...styles,idleBackground:await readBackground()};
          });
          if(search.shellHeight<48||search.font<16||search.inputBorder!==0||
             search.inputOutline!=='none'||search.inputShadow!=='none'||
             search.shellBorder!==0||search.shellOutline!=='none'||
             search.shellShadow!=='none'||search.focusedBackground===search.idleBackground){
            throw Error('Stock search has nested borders or no focus tint: '+JSON.stringify(search));
          }
                    await addDialog.getByRole('button',{name:'Add as New Product'}).click();
          const partStyles=await addDialog.locator('form.cg-easy-form').evaluate(form=>{
            const inputs=[...form.querySelectorAll('input:not([type=radio]),select')]
              .filter(node=>node.getClientRects().length)
              .map(node=>({
                font:parseFloat(getComputedStyle(node).fontSize),
                height:Math.round(node.getBoundingClientRect().height),
              }));
            const labels=[...form.querySelectorAll('label')]
              .filter(node=>node.getClientRects().length)
              .map(node=>parseFloat(getComputedStyle(node).fontSize));
            const grid=form.querySelector('.cg-easy-fields');
            const columns=grid?getComputedStyle(grid).gridTemplateColumns.split(' ').length:0;
            return {inputs,labels,columns};
          });
          const columnCount=profile.width<=520?1:2;
          if(partStyles.inputs.some(x=>x.font<16||x.height<48)||
              partStyles.labels.some(x=>x<14)||partStyles.columns!==columnCount) {
            throw Error('Stock Add Product form UI mismatch: '+JSON.stringify({width:profile.width,...partStyles}));
          }
          await addDialog.getByRole('button',{name:'Close dialog'}).click();
          const supplierReceiving=page.getByRole('link',{name:'Buy / Receive from Supplier'});
          await supplierReceiving.waitFor({state:'visible'});
          if (await supplierReceiving.getAttribute('href') !== '/suppliers') {
            throw Error('Purchased stock must route to Supplier details workflow');
          }
          if(await page.getByRole('button',{name:'Receive Stock',exact:true}).count()) {
            throw Error('Obsolete unlinked Receive Stock button must not reappear');
          }
        }
        if(path==='/login'){
          // Regression for double red outline: the outer div owns the border,
          // even when both nested inputs are aria-invalid and focused.
          await page.locator('.login-input-shell').first().waitFor();
          await page.locator('.login-submit').click();
          await page.waitForFunction(()=>document.querySelectorAll('.login-input-shell.is-error').length===2);
          const styles=await page.locator('.login-input-shell').evaluateAll(nodes=>nodes.map(shell=>{
            const wrapper=getComputedStyle(shell);
            const input=getComputedStyle(shell.querySelector('input.login-input'));
            return {
              shellBorder:parseFloat(wrapper.borderTopWidth),
              innerBorder:parseFloat(input.borderTopWidth),
              innerOutline:input.outlineStyle,
              innerShadow:input.boxShadow,
              shellColor:wrapper.borderTopColor,
            };
          }));
          if(styles.length!==2 || styles.some(s=>s.shellBorder!==1 ||
            s.innerBorder!==0 || s.innerOutline!=='none' || s.innerShadow!=='none')) {
            throw Error('Login email/password has a second inner border/outline: '+JSON.stringify(styles));
          }
        }

        if(profile.width < 1024) {
          const wallet=page.locator('.mobile-header-actions > .cg-credit-chip');
          if(await wallet.count()) {
            const broken=await wallet.evaluate(node=>{
              const icon=node.querySelector('svg').getBoundingClientRect();
              const value=node.querySelector('.cg-credit-chip-mobile').getBoundingClientRect();
              return node.scrollWidth > node.clientWidth + 1 || Math.abs((icon.top+icon.height/2)-(value.top+value.height/2)) > 8;
            });
            if(broken) throw Error('Wallet balance wraps or overflows');
          }
        }
        if(path==='/invoices' && [390,1440].includes(profile.width)) {
          const list=page.locator('.cg-invoice-refined');
          await list.locator('.invoice-dashboard-stats').waitFor({state:'visible'});
          const from=list.locator('#invoice-filter-from');
          const to=list.locator('#invoice-filter-to');
          const sort=list.getByRole('combobox',{name:'Sort billing documents'});
          if(await from.count()!==1 || await to.count()!==1 || await sort.count()!==1) {
            throw Error('Invoice date range and sort filters are missing.');
          }
          await from.fill('2026-10-20');
          await list.getByText('No matching documents').waitFor({state:'visible'});
          await list.getByRole('button',{name:'Clear Filters'}).first().click();
          if(profile.width>767) {
            await list.getByRole('button',{name:'View INV-0001'}).waitFor({state:'visible',
              timeout:10000});
          } else {
            await list.locator('.invoice-dashboard-mobile-card').first().waitFor({state:'visible',
              timeout:10000});
          }
          await sort.selectOption('oldest');
          if(await sort.inputValue()!=='oldest') {
            throw Error('Invoice sort selection did not update.');
          }
          const layout=await list.evaluate(el=>({
            overflow:document.documentElement.scrollWidth>window.innerWidth+2,
            cards:el.querySelectorAll('.invoice-dashboard-stat-card').length,
            meta:el.querySelectorAll('.cg-invoice-mobile-meta>div').length,
            tableHeaders:[...el.querySelectorAll('.invoice-dashboard-table thead th')]
              .map(node=>node.textContent.trim()),
          }));
          if(layout.overflow || layout.cards!==4 || layout.meta<5 ||
              !layout.tableHeaders.includes('Paid') || !layout.tableHeaders.includes('Still Due')) {
            throw Error('Invoice directory responsive layout or payment columns mismatch: '+
              JSON.stringify({width:profile.width,...layout}));
          }
        }

        if(path==='/invoices/INV-0001' && profile.width<=430) {
          await page.getByRole('button',{name:'Download Invoice PDF'}).click();
          const sheet=page.getByRole('dialog',{name:'Share invoice PDF'});
          await sheet.waitFor();
          await sheet.getByRole('button',{name:'Download PDF'}).waitFor({state:'visible'});
          await page.waitForFunction(()=>{
            const download=document.querySelector('.invoice-pdf-share-download');
            return download && !download.disabled;
          });
          const position=await sheet.evaluate(node=>{
            const rect=node.querySelector('.responsive-modal-sheet')?.getBoundingClientRect();
            return {bottom:rect?.bottom,viewport:window.innerHeight};
          });
          if(Math.abs(position.viewport-position.bottom)>2) {
            throw Error('Invoice PDF bottom sheet does not align to phone bottom: '+JSON.stringify(position));
          }
          await sheet.getByRole('button',{name:'Cancel'}).click();
          await sheet.waitFor({state:'hidden'});
        }

        if(path==='/invoices/e-way-bills/EWB-001' && profile.width===390) {
          const open = page.getByRole('button',{name:'Download PDF'}).first();
          await open.click();
          const modal = page.getByRole('dialog',{name:'Share E-Way Bill PDF'});
          await modal.waitFor();
          const download = modal.getByRole('button',{name:'Download PDF'});
          await page.waitForFunction(() =>
            !!document.querySelector('.invoice-pdf-share-download:not(:disabled)'));
          if(await download.isDisabled()) throw Error('Saved E-Way PDF did not become downloadable.');
          const bounds=await modal.evaluate(node=>{
            const sheet=node.querySelector('.responsive-modal-sheet')?.getBoundingClientRect();
            return {bottom:sheet?.bottom,viewport:innerHeight};
          });
          if(Math.abs(bounds.bottom-bounds.viewport)>3){
            throw Error('E-Way PDF share sheet not attached to phone bottom: '+JSON.stringify(bounds));
          }
          await modal.getByRole('button',{name:'Cancel'}).click();
          await modal.waitFor({state:'hidden'});
        }

        if(path==='/invoices/e-way-bills/new' && profile.width===390) {
          const to=page.locator('section').filter({has:page.getByText('SECTION 2 · TO',{exact:true})});
          const toGstin=to.getByPlaceholder('GSTIN / URP');
          const toState=to.getByRole('combobox',{name:'TO State Code'});
          const taxRate=page.getByRole('combobox',{name:'GST rate'}).first();
          await taxRate.waitFor();
          if(await taxRate.isDisabled()) throw Error('GST rate must be selectable before TO state.');
          await page.locator('.eway-goods-fields').getByPlaceholder('0.00').first().fill('100');
          await taxRate.selectOption('igst:18');
          if(await taxRate.inputValue()!=='igst:18') throw Error('IGST 18% choice was lost before state selection.');
          await toGstin.fill('33ABCDE1234F1Z5');
          if(await toState.inputValue()!=='33' || !(await toState.isDisabled())) {
            throw Error('TO State Code was not auto-filled and locked from Tamil Nadu GSTIN.');
          }
          await page.waitForFunction(() => [...document.querySelectorAll('.eway-goods-totals > div')]
            .some(node => node.innerText.includes('IGST') && node.innerText.includes('₹18.00')));
          await toGstin.fill('URP');
          if(await toState.isDisabled()) throw Error('URP recipient must allow manual State selection.');
          await toState.selectOption('32');
          // After crossing back to the supplier state the legal tax is CGST + SGST.
          await taxRate.selectOption('cgst:9');
          await page.waitForFunction(() => {
            const rows = [...document.querySelectorAll('.eway-goods-totals > div')];
            return rows.some(node => node.innerText.includes('CGST') && node.innerText.includes('₹9.00')) &&
              rows.some(node => node.innerText.includes('SGST') && node.innerText.includes('₹9.00'));
          });
          if(await taxRate.inputValue()!=='cgst:9') throw Error('CGST 9% was not selected for intra-state supply.');
        }

        if(path==='/invoices/e-way-bills/new' && profile.width===390) {
          await page.locator('[data-eway-field="from.gstin"]').waitFor();
          await page.waitForFunction(() => document.querySelector('[data-eway-field="from.gstin"]')?.value === '32ABCDE1234F1Z5');
          await page.getByRole('button',{name:'Prepare for API'}).click();
          const invalid=page.locator('[data-eway-field="documentNo"]');
          await page.waitForFunction(() => document.activeElement?.getAttribute('data-eway-field') === 'documentNo');
          if(await invalid.getAttribute('aria-invalid')!=='true'){
            throw Error('E-Way Bill should highlight first missing field');
          }
          await invalid.fill('INV-TEST-001');
          if(await invalid.getAttribute('aria-invalid')==='true'){
            throw Error('E-Way Bill error did not clear after correcting input');
          }
          if(await page.locator('.eway-gst-explanation,.eway-gst-breakdown').count()){
            throw Error('Removed GST explanation still rendered');
          }
        }

        if(path==='/dashboard') {
          // Loaders may be hidden before the dashboard API promise resolves.
          await page.locator('.dashboard-top-actions').waitFor({
            state:'visible', timeout:15000,
          });
          const dimensions = await page.evaluate(() => {
            const top = document.querySelector('.dashboard-top-actions');
            const stats = document.querySelector('.dashboard-stats');
            const quick = document.querySelector('.dashboard-top-actions .quick-actions button');
            const finance = document.querySelector('.finance-list > div');
            const staff = document.querySelector('.staff-copy strong');
            const progress = document.querySelector('.overall-progress [role="progressbar"]');
            const width = document.documentElement.scrollWidth;
            const size = node => node ? parseFloat(getComputedStyle(node).fontSize) : null;
            return {
              topY: top?.getBoundingClientRect().top,
              statsY: stats?.getBoundingClientRect().top,
              quickFont: size(quick), financeFont: size(finance),
              staffFont: size(staff), progressWidth: progress?.getAttribute('aria-valuenow'),
              contentWidth: width,
            };
          });
          if(!(dimensions.topY < dimensions.statsY)){
            throw Error('Quick Actions does not appear above stats: '+JSON.stringify(dimensions));
          }
          for(const name of ['quickFont','financeFont','staffFont']){
            if(dimensions[name] != null && dimensions[name]<14){
              throw Error('Unreadable Dashboard '+name+': '+JSON.stringify(dimensions));
            }
          }
          if(dimensions.contentWidth>profile.width+2){
            throw Error('Dashboard overflows viewport: '+JSON.stringify(dimensions));
          }
          if(dimensions.progressWidth==='70'){
            throw Error('Overall Job Progress is still hardcoded to 70%');
          }
        }

        if(path==='/my-attendance/calendar') {
          const punch = page.locator('.attendance-punch-card');
          await punch.waitFor();
          const measured = await punch.evaluate(node => {
            const status = node.querySelector('.attendance-punch-status strong');
            const note = node.querySelector('.attendance-punch-note span');
            return {
              statusFont: status ? parseFloat(getComputedStyle(status).fontSize) : null,
              noteFont: note ? parseFloat(getComputedStyle(note).fontSize) : null,
              width: node.getBoundingClientRect().width,
            };
          });
          if (measured.statusFont != null && measured.statusFont < 16) {
            throw Error('My Attendance status too small: ' + JSON.stringify(measured));
          }
          if (measured.noteFont != null && measured.noteFont < 14) {
            throw Error('My Attendance completion note too small: ' + JSON.stringify(measured));
          }
          if (measured.width > profile.width + 2) {
            throw Error('My Attendance punch card overflows viewport: ' + JSON.stringify(measured));
          }
        }
        if(path==='/my-attendance/leave' && (profile.width === 390 || profile.width === 1440)) {
          await page.getByRole('button', { name: 'Apply Leave' }).click();
          const dialog = page.getByRole('dialog', { name: 'Apply for Leave' });
          await dialog.waitFor();
          const date = dialog.locator('input[type="date"]');
          const expected = await page.evaluate(() => {
            const d = new Date();
            return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'),
              String(d.getDate()).padStart(2,'0')].join('-');
          });
          if(await date.inputValue() !== expected) {
            throw Error('Leave Date not auto-filled to local today.');
          }
          const font = await date.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
          if(font < 16) throw Error('Leave Date input font below 16px: '+font);
          if(await dialog.getByText('All leave is unpaid.').count()) {
            throw Error('Old unpaid wage explanation still shown.');
          }
          await date.fill('2026-11-04');
          await dialog.getByRole('button', { name: 'Cancel' }).click();
          await dialog.waitFor({ state: 'hidden' });
          await page.getByRole('button', { name: 'Apply Leave' }).click();
          await date.waitFor();
          if(await date.inputValue() !== expected) {
            throw Error('Leave Date did not reset to today on reopening.');
          }
          await dialog.getByRole('button', { name: 'Cancel' }).click();
        }

        if(path==='/attendance-manager/leave-requests') {
          const blockedCard = page.locator('.am-approval-card').filter({hasText:'Logged In Owner'});
          await blockedCard.waitFor();
          await blockedCard.getByText('Your own request must be reviewed by another authorized manager.').waitFor();
          if(await blockedCard.getByRole('button',{name:'Approve'}).count()!==0) {
            throw Error('Own leave request still displays Approve action.');
          }
          if(await blockedCard.getByRole('button',{name:'Reject'}).count()!==0) {
            throw Error('Own leave request still displays Reject action.');
          }
          const other = page.locator('.am-approval-card').filter({hasText:'Belle Trujillo'});
          if(await other.getByRole('button',{name:'Approve'}).count()!==1) {
            throw Error('Another employee leave request lost approval action.');
          }
        }

        if(path.startsWith('/attendance-manager/') && [
          'overview','daily','calendar','leave-requests','shifts','reports','rules'
        ].includes(path.split('/')[2])) {
          const metrics = await page.evaluate(() => {
            const root = document.querySelector('.cg-attendance-manager');
            if (!root) return { missing: true };
            const font = selector => {
              const element = root.querySelector(selector);
              return element ? parseFloat(getComputedStyle(element).fontSize) : null;
            };
            const size = selector => {
              const element = root.querySelector(selector);
              return element ? Math.round(element.getBoundingClientRect().height) : null;
            };
            return {
              tab: font('.attendance-manager-dashboard-tabs button'),
              dailyWages: font('.attendance-manager-header-actions .dw-button'),
              rulesBadge: font('.attendance-manager-header-badge'),
              header: font('.am-section-header h2,.am-calendar-header h2,.am-daily-heading h2,.attendance-rules-header h2'),
              label: font('.am-approval-details strong,.am-table-card td,.am-dashboard-stat-top span,.am-shift-list strong,.am-report-filter label > span,.attendance-mode-copy .am-mode-description'),
              leaveButton: font('.am-approval-actions > button'),
              leaveButtonHeight: size('.am-approval-actions > button'),
              field: font('.am-daily-date input,.am-calendar-month-controls select,.am-shift-form input,.am-report-filter select,.attendance-rule-field input'),
              mainWidth: document.documentElement.scrollWidth,
              viewport: window.innerWidth,
            };
          });
          if(metrics.missing) throw Error('Attendance Manager route missing shared layout: '+path);
          for (const field of ['tab','dailyWages','rulesBadge','label','leaveButton']) {
            if(metrics[field]!==null && metrics[field]<13.5) {
              throw Error('Unreadable Attendance Manager '+field+' on '+path+': '+JSON.stringify(metrics));
            }
          }
          if(metrics.header!==null && metrics.header<16.5) {
            throw Error('Attendance Manager heading below readable minimum on '+path+': '+JSON.stringify(metrics));
          }
          if(metrics.field!==null && metrics.field<15.5) {
            throw Error('Attendance Manager form field below 16px on '+path+': '+JSON.stringify(metrics));
          }
          if(metrics.leaveButtonHeight!==null && metrics.leaveButtonHeight<44) {
            throw Error('Leave approval button below 44px: '+JSON.stringify(metrics));
          }
          if(metrics.mainWidth>metrics.viewport+2) {
            throw Error('Attendance Manager horizontal page overflow on '+path+': '+JSON.stringify(metrics));
          }
        }

        if ([
          '/staff-management/overview',
          '/staff-management/staff',
          '/staff-management/roles',
          '/staff-management/teams',
          '/staff-management/shifts',
        ].includes(path)) {
          const measured = await page.evaluate(() => {
            const root = document.querySelector('.cg-staff-management');
            const font = selector => {
              const element = root?.querySelector(selector);
              return element ? parseFloat(getComputedStyle(element).fontSize) : null;
            };
            const height = selector => {
              const element = root?.querySelector(selector);
              return element ? element.getBoundingClientRect().height : null;
            };
            return {
              tabs: font('.staff-dashboard-tab span'),
              heading: font('.staff-overview-page-heading h1,.staff-dashboard-header h1'),
              label: font('.staff-simple-metrics span,.staff-directory-details span,.roles-dashboard-card-meta span,.staff-team-card__meta,.staff-crud-detail-grid strong'),
              person: font('.staff-simple-person-details strong,.staff-directory-person strong,.roles-dashboard-card-title strong,.staff-team-card__head h3,.staff-crud-card__head h3'),
              button: font('.staff-simple-toolbar-actions button,.staff-add-button,.roles-primary-button,.staff-team-assign-button,.staff-crud-actions button'),
              touch: height('.staff-simple-toolbar-actions button,.staff-add-button,.roles-primary-button,.staff-team-assign-button,.staff-crud-actions button'),
              input: font('.staff-simple-search input,.staff-directory-search input,.roles-dashboard input'),
              overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
            };
          });
          for (const [key, min] of Object.entries({tabs:13.5,heading:22,label:13.5,person:14.5,button:13.5,input:15.5})) {
            if (measured[key] !== null && measured[key] < min) {
              throw Error('Staff Management unreadable '+key+' on '+path+': '+JSON.stringify(measured));
            }
          }
          if(measured.touch!==null && measured.touch < 43.5) {
            throw Error('Staff Management small touch target on '+path+': '+JSON.stringify(measured));
          }
          if(measured.overflow) {
            throw Error('Staff Management horizontal page overflow on '+path+': '+JSON.stringify(measured));
          }
        }

        if(path==='/staff-management/staff') {
          const card=page.locator('.staff-directory-row').first();
          await card.waitFor();
          const stats=await card.evaluate(node => {
            const cells=[...node.querySelectorAll('.staff-directory-cell')];
            const actions=[...node.querySelectorAll('.staff-directory-row-actions button')];
            const sizes=actions.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}));
            const rect=node.getBoundingClientRect();
            const texts=[...node.querySelectorAll('.staff-directory-person-copy strong,.staff-directory-branch > span,.staff-directory-contact > span,.staff-directory-wage > span')]
              .filter(el=>el.getClientRects().length);
            const minFont=texts.length
              ? Math.min(...texts.map(el=>parseFloat(getComputedStyle(el).fontSize)))
              : 0;
            const clipped=cells.some(cell=>cell.scrollWidth>cell.clientWidth+2);
            const columns=getComputedStyle(node).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
            return {
              font:minFont,actions:sizes,clipped,
              cardWidth:rect.width,viewport:innerWidth,columns,
              pageOverflow:document.documentElement.scrollWidth>innerWidth+2,
            };
          });
          if(stats.font<13.5 || stats.clipped || stats.pageOverflow) {
            throw Error('Staff Directory row unreadable or clipped: '+JSON.stringify(stats));
          }
          if(!stats.actions.length || stats.actions.some(b=>b.h<43.5 || b.w<43.5)) {
            throw Error('Staff Directory action touch target below 44px: '+JSON.stringify(stats));
          }
          if(stats.cardWidth<305 && stats.columns!==2) {
            throw Error('Narrow Staff row must wrap into two readable columns: '+JSON.stringify(stats));
          }
          const power=card.locator('.staff-status-button');
          if(await power.count() && !(await power.getAttribute('aria-label'))) {
            throw Error('Staff account status icon lacks accessible label.');
          }
        }

        if ([
          '/payroll/daily-wages',
          '/payroll/daily-wages/history',
          '/payroll/payments',
        ].includes(path)) {
          const metrics = await page.evaluate(() => {
            const root = document.querySelector('.dw-page');
            const font = selector => {
              const el = root?.querySelector(selector);
              return el ? parseFloat(getComputedStyle(el).fontSize) : null;
            };
            const height = selector => {
              const el = root?.querySelector(selector);
              return el ? el.getBoundingClientRect().height : null;
            };
            return {
              heading: font('.dw-header h1'), subtitle: font('.dw-header p'),
              nav: font('.dw-nav a'), cardTitle: font('.dw-card-head h2'),
              count: font('.dw-card-head > span'),
              table: font('.dw-table tbody td'), tableLabel: font('.dw-table tbody td::before'),
              input: font('.dw-search input'), select: font('.dw-toolbar select'),
              actionHeight: height('.dw-button'),
              navHeight: height('.dw-nav a'),
              pageOverflow: document.documentElement.scrollWidth > innerWidth+2,
              scrollArea: !!root?.querySelector('.dw-table-scroll'),
              bodyRows: root?.querySelectorAll('.dw-table tbody tr').length || 0,
            };
          });
          for(const [key,min] of Object.entries({
            heading:21.5,subtitle:13.5,nav:13.5,cardTitle:18.5,
            count:13.5,table:13.5,input:15.5,select:15.5,
          })) {
            if(metrics[key]!==null && metrics[key]<min) {
              throw Error('Payroll unreadable '+key+' '+path+': '+JSON.stringify(metrics));
            }
          }
          if(metrics.pageOverflow || metrics.actionHeight<43.5 || metrics.navHeight<43.5) {
            throw Error('Payroll overflow or tiny button '+path+': '+JSON.stringify(metrics));
          }
          if(!metrics.scrollArea || !metrics.bodyRows) {
            throw Error('Payroll fixture data table not rendered '+path+': '+JSON.stringify(metrics));
          }
        }

        if(path==='/vehicles' || /^\/vehicles\/[^/]+$/.test(path)) {
          // Vehicle details fetches customer and service history asynchronously.
          // Avoid reading the loading placeholder before profile content appears.
          await page.locator('.cg-vehicles').waitFor({state:'visible',timeout:12000});
          const metrics = await page.evaluate(() => {
            const root=document.querySelector('.cg-vehicles');
            const font = selector => {
              const el=root?.querySelector(selector);
              return el ? parseFloat(getComputedStyle(el).fontSize) : null;
            };
            const height = selector => {
              const el=root?.querySelector(selector);
              return el ? el.getBoundingClientRect().height : null;
            };
            const input=root?.querySelector('.vehicle-dashboard-search input');
            const border = input ? getComputedStyle(input).borderTopWidth : null;
            return {
              missing:!root,
              listHeading:font('.vehicle-dashboard-header h1'),
              listLabel:font('.vehicle-dashboard-stat-top span'),
              listSearch:font('.vehicle-dashboard-search input'),
              searchBorder:border,
              profileTitle:font('.vehicle-profile-header h1'),
              profileLabel:font('.vehicle-profile-kpis span'),
              profileValue:font('.vehicle-info-card strong'),
              tab:font('.vehicle-profile-tabs button'),
              actionHeight:height('.vehicle-profile-actions button,.vehicle-primary-button'),
              pageOverflow:document.documentElement.scrollWidth>innerWidth+2,
            };
          });
          if(metrics.missing || metrics.pageOverflow) {
            throw Error('Vehicle page overflow or missing root '+path+': '+JSON.stringify(metrics));
          }
          for(const [key,min] of Object.entries({
            listHeading:22,listLabel:13.5,listSearch:15.5,
            profileTitle:22,profileLabel:13.5,profileValue:14.5,tab:13.5,
          })) {
            if(metrics[key]!==null && metrics[key]<min) {
              throw Error('Vehicle font too small '+key+' on '+path+': '+JSON.stringify(metrics));
            }
          }
          if(metrics.searchBorder!==null && metrics.searchBorder!=='0px') {
            throw Error('Vehicle search has double border: '+JSON.stringify(metrics));
          }
          if(metrics.actionHeight!==null && metrics.actionHeight<43.5) {
            throw Error('Vehicle action too small: '+JSON.stringify(metrics));
          }
        }

        if(path==='/vehicles/VEH-0001' && [390,1440].includes(profile.width)) {
          if(await page.getByText('Back to Vehicles',{exact:true}).count()) {
            throw Error('The unwanted Back to Vehicles button is still visible.');
          }
          const breadcrumb=page.getByRole('navigation',{name:'Breadcrumb'});
          if(!await breadcrumb.count() || !await breadcrumb.getByRole('link',{name:'Vehicles'}).count()) {
            throw Error('Vehicle breadcrumbs were not rendered.');
          }
          await page.getByRole('tab',{name:'Photos & Customer Sharing'}).click();
          await page.locator('.vehicle-photo-gallery').waitFor({state:'visible',timeout:10000});
          const toggle=page.locator('.vehicle-photo-upload-publish input[type="checkbox"]');
          if(await toggle.count()!==1 || !await toggle.isChecked()) {
            throw Error('Customer photo publication must be the selected default for editor role.');
          }
          await toggle.uncheck();
          if(await toggle.isChecked()) throw Error('Private upload option is not selectable.');
          await toggle.check();
          const photoLayout=await page.locator('.vehicle-photo-gallery').evaluate(el=>({
            overflow:document.documentElement.scrollWidth>window.innerWidth+2,
            width:Math.round(el.getBoundingClientRect().width),
            counts:!!el.querySelector('.vehicle-photo-share-counts'),
            filter:!!el.querySelector('#vehicle-photo-visibility-filter'),
          }));
          if(photoLayout.overflow || !photoLayout.counts || !photoLayout.filter) {
            throw Error('Vehicle photo sharing UI layout is incomplete '+JSON.stringify(photoLayout));
          }
        }

        if(path==='/staff-management/overview') {
          const input=page.locator('.staff-simple-search input');
          const border=await input.evaluate(node=>getComputedStyle(node).borderTopWidth);
          if(border !== '0px') throw Error('Nested staff search border: '+border);
          await page.getByText('Ajmal K', {exact:true}).waitFor();
        }
        if(path==='/settings' && profile.width<=760){
          await page.getByRole('heading',{name:'Settings',exact:true}).waitFor({state:'visible'});
          const gap=await page.evaluate(()=>{
            const heading=document.querySelector('.settings-dashboard-heading');
            const actions=document.querySelector('.settings-dashboard-header-actions');
            const last=heading?.lastElementChild;
            return last&&actions?actions.getBoundingClientRect().top-last.getBoundingClientRect().bottom:Infinity;
          });
          if(gap>40)throw Error('Excess blank space below Settings heading: '+gap);
          const fixedBases=await page.evaluate(()=>[...document.querySelectorAll('.settings-dashboard-header,.settings-theme,.settings-footer')]
            .filter(node=>getComputedStyle(node).flexDirection.startsWith('column'))
            .flatMap(node=>[...node.children].filter(child=>parseFloat(getComputedStyle(child).flexBasis)>80).map(child=>child.className)));
          if(fixedBases.length)throw Error('Desktop flex basis used as mobile height: '+fixedBases.join(','));
        }
        if(path==='/staff-management/roles'){
          await page.getByRole('button',{name:/Add New Role|Add Role/}).click();
          const dialog=page.getByRole('dialog');
          await dialog.waitFor();
          const width=await dialog.evaluate(node=>node.getBoundingClientRect().width);
          if(width>profile.width+2)throw Error('Role dialog wider than viewport');
          const sizes=await dialog.locator('input:not([type=checkbox]),select,textarea').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>parseFloat(getComputedStyle(e).fontSize)));
          if(sizes.some(size=>size<16))throw Error('Role dialog form text below 16px');
          await page.keyboard.press('Escape');
        }
        if(process.env.UI_SCREENSHOTS){
          await page.screenshot({path:join(artifacts,`${profile.width}-${profile.theme}-${path.replace(/\W+/g,'-')}.png`),timeout:5000});
        }
        tested++;
      } catch(error) {
        firstNavigation=true;
        const name=`${profile.width}-${profile.theme}-${path.replace(/\W+/g,'-')}`;
        failures.push(`${profile.width}/${profile.theme} ${path} (at ${page.url()}): ${error.message}`);
        console.error(failures.at(-1));
        await page.screenshot({path:join(artifacts,name+'.png'),timeout:2000}).catch(()=>{});
      }
    }
    let themeStep='open settings';
    try {
      await page.goto(baseURL+'/settings',{waitUntil:'networkidle',timeout:15000});
      await page.locator('.route-loading').waitFor({state:'hidden',timeout:15000});
      const appearance=page.getByLabel('Appearance');
      const alternateTheme=profile.theme==='dark'?'light':'dark';
      themeStep='apply alternate theme';
      await appearance.selectOption(alternateTheme);
      await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,alternateTheme);
      themeStep='check persisted theme';
      if(await page.evaluate(()=>localStorage.getItem('cubegears-theme'))!==alternateTheme) throw Error('Theme preference was not persisted');
      themeStep='reload saved theme';
      await page.reload({waitUntil:'networkidle'});
      await page.locator('.route-loading').waitFor({state:'hidden',timeout:15000});
      await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,alternateTheme);
      if(await page.getByLabel('Appearance').inputValue()!==alternateTheme) throw Error('Saved theme was not restored after reload');
      themeStep='restore starting theme';
      await page.getByLabel('Appearance').selectOption(profile.theme);
      await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,profile.theme);
      tested++;
    } catch(error) {
      const themeState=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,saved:localStorage.getItem('cubegears-theme'),path:location.pathname,selected:document.querySelector('[aria-label="Appearance"]')?.value}));
      failures.push(`${profile.width}/${profile.theme} Settings theme switch (${themeStep}): ${error.message}; state=${JSON.stringify(themeState)}`);
      console.error(failures.at(-1));
    }
    await context.close();
    console.log(`Checked ${paths.length} routes at ${profile.width}px (${profile.theme})`);
  }));
  if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} UI checks failed; screenshots: ${artifacts}`);}
  console.log(`PASS ${tested} page checks: ${paths.length} routes, ${profiles.length} viewport/theme profiles. API responses are test fixtures.`);
} finally {await browser?.close();server.kill();}
