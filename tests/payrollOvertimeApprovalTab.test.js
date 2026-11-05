import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PAYROLL_MONTHS, monthNumber, overtimePeriod, pendingOvertime,
  filterOvertimeApprovals, overtimeHours, validOvertimeRate, overtimeAmount,
} from '../src/pages/payroll/overtimeApproval.utils.js';

const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

const approvals = [
  { id:'a',type:'Overtime',status:'Pending',employeeId:'uuid-A',staffId:'EMP-11',
    staffName:'Amina',branchId:'branch-KL',branchName:'Kochi',
    date:'2026-10-15',payrollMonth:'2026-10',minutes:150,reason:'Customer repairs',
    canReview:true, rate:0 },
  { id:'b',type:'Overtime',status:'Pending',employeeId:'uuid-B',staffId:'EMP-12',
    staffName:'Binu',branchId:'branch-ML',branchName:'Malappuram',
    date:'2026-10-17',payrollMonth:'2026-10',minutes:90,reason:'Workshop',
    canReview:false,reviewBlockReason:'Own request' },
  { id:'c',type:'Overtime',status:'Approved',employeeId:'uuid-A',staffName:'Amina',
    date:'2026-10-10',minutes:30 },
  { id:'d',type:'Leave',status:'Pending',employeeId:'uuid-B',
    date:'2026-10-10',minutes:50 },
  { id:'e',type:'Overtime',status:'Pending',employeeId:'uuid-A',
    staffName:'Amina',branchName:'Kochi',date:'2026-09-28',minutes:60 },
];

test('month names, years, branch IDs/names and staff IDs preserve supplied payroll period', () => {
  assert.equal(PAYROLL_MONTHS.length,12);
  assert.equal(monthNumber('October'),10);
  assert.equal(monthNumber('10'),10);
  assert.equal(monthNumber('All'),null);
  assert.equal(overtimePeriod(approvals[0]),'2026-10');
  assert.deepEqual(pendingOvertime(approvals).map(x=>x.id),['a','b','e']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2026'})
    .map(x=>x.id),['b','a']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2026',branch:'branch-KL'})
    .map(x=>x.id),['a']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2026',branch:'Malappuram'})
    .map(x=>x.id),['b']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2026',staff:'uuid-A'})
    .map(x=>x.id),['a']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2026',staff:'EMP-12'})
    .map(x=>x.id),['b']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2026',search:'repairs'})
    .map(x=>x.id),['a']);
  assert.deepEqual(filterOvertimeApprovals(approvals,{month:'October',year:'2025'}),[]);
});

test('positive 2-decimal hourly rate produces correct OT amount; invalid rates rejected', () => {
  assert.equal(overtimeHours(approvals[0]),2.5);
  assert.equal(overtimeAmount(approvals[0],'200'),500);
  assert.equal(overtimeHours({overtimeHours:1.5}),1.5);
  assert.equal(validOvertimeRate('250.50'),true);
  for(const text of ['','0','-5','10.123','abc','Infinity','100000000']){
    assert.equal(validOvertimeRate(text),false,text);
  }
});

test('Payroll navigation has fourth tab, routing, matching approval permission and rate POST', () => {
  const nav = read('src/pages/payroll/DailyWagePage.jsx');
  const route = read('src/routes/AppRoutes.jsx');
  const page = read('src/pages/payroll/OvertimeApprovalPage.jsx');
  const css = read('src/pages/payroll/overtime-approvals.css');
  assert.match(nav,/\['overtime', 'Overtime Approval', '\/payroll\/daily-wages\/overtime-approvals'/);
  assert.match(nav,/to=\{\`\$\{href\}\$\{search\}\`\}/);
  assert.match(route,/path="\/payroll\/daily-wages\/overtime-approvals" element=\{<OvertimeApprovalPage \/>\}/);
  assert.match(page,/can\('attendance.team.view'\)/);
  assert.match(page,/can\('attendance.overtime.approve'\)/);
  assert.match(page,/attendanceManagerService\.getApprovals\(\)/);
  assert.match(page,/attendanceManagerService\.updateApprovalStatus\(selected.id,decision,note.trim\(\),/);
  assert.match(page,/decision === 'approve' \? \{ rate:Number\(rate\) \} : \{\}/);
  assert.match(page,/Rejection reason is required/);
  assert.match(page,/row.canReview === false/);
  assert.match(page,/setParams\(old =>/);
  assert.match(page,/next.set\('staff','All'\)/);
  assert.match(css,/@media\(max-width:1050px\)/);
  assert.match(css,/font-size:16px/);
});

test('Overtime request page does not write daily wage extras or auto approve records', () => {
  const page = read('src/pages/payroll/OvertimeApprovalPage.jsx');
  assert.doesNotMatch(page,/dailyWageService\.addExtra/);
  assert.doesNotMatch(page,/dailyWageService\.reviewExtra/);
  assert.doesNotMatch(page,/payrollService\.approvePayrollRun/);
  assert.match(page,/No pending overtime requests for the selected filters/);
});
