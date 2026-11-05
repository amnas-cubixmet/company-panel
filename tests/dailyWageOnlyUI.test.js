import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const source = (path) => readFileSync(path, 'utf8');

test('Staff Add stays compact; wage rates are configured separately', () => {
  const code = source('src/pages/staff-management/StaffAddPage.jsx');
  assert.doesNotMatch(code, /Daily Wage Rate|Effective From|dailyWageRate/);
  assert.doesNotMatch(code, /\bPayment Type\b|\bPayment Frequency\b|\bMonthly Base Salary\b|\bCommission Based On\b/);
  assert.doesNotMatch(code, /\/payroll\/compensation-plans/);
});

test('reusable rate editor cannot offer salary type, pay frequency or commission', () => {
  const code = source('src/components/payroll/EmployeePayConfigurationSheet.jsx');
  assert.match(code, /dailyWageService\.addRate/);
  assert.doesNotMatch(code, /<span>Payment Type|<span>Payment Frequency|Monthly Salary|Commission Rate/);
});

test('active payroll UI redirects historical screens and retains wage pages', () => {
  const routes = source('src/routes/AppRoutes.jsx');
  assert.match(routes, /path="\/payroll\/daily-wages"/);
  assert.match(routes, /path="\/payroll\/payments"/);
  assert.match(routes, /path="\/staff\/:id\/wages"/);
  assert.match(routes, /path="\/payroll" element={<Navigate to="\/payroll\/daily-wages" replace/);
  assert.equal(existsSync('src/pages/staff-management/Payroll.jsx'), false);
});

test('creating staff never writes old compensation plans or monthly pay cycles', () => {
  const service = source('src/services/staff.service.js');
  assert.match(service, /dailyWageService\.addRate/);
  assert.doesNotMatch(service, /\/payroll\/compensation-plans/);
  assert.doesNotMatch(service, /paymentFrequency|paymentType: normalizePaymentType/);
});
