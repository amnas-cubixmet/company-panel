import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expenseToApiPayload, normalizeExpense } from '../src/services/expense.mapper.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const expenses = read('src/pages/expenses/ExpenseList.jsx');
const budgetPanel = read('src/components/expenses/ExpenseBudgetPanel.jsx');
const tabs = read('src/components/expenses/ExpenseTabs.jsx');
const client = read('src/services/expense.service.js');

test('budget allocations survive Expense create/read/update and can be cleared', () => {
  const budgetItemId = '6e08b3d8-dfd1-4d34-a3cd-6c73b3ed2b73';
  const base = {
    title: 'Workshop cleaning', category: 'Cleaning & Waste',
    expenseDate: '2026-11-10', amount: '2000', status: 'approved',
    budgetItemId,
  };
  const payload = expenseToApiPayload(base);
  assert.equal(payload.budget_item, budgetItemId);
  assert.equal(payload.amount, '2000.00');
  assert.equal(normalizeExpense({ ...payload, id: 'expense-1' }).budgetItemId, budgetItemId);
  assert.equal(expenseToApiPayload({ ...base, budgetItemId: '' }).budget_item, null);
});

test('expense date/category changes reset budget allocation and only matching budgets appear', () => {
  assert.match(expenses, /Monthly Budget Item \(optional\)/);
  assert.match(expenses, /Unbudgeted expense/);
  assert.match(expenses, /expenseDate:e\.target\.value,budgetItemId:''/);
  assert.match(expenses, /category:e\.target\.value,budgetItemId:''/);
  assert.match(expenses, /item\.category === values\.category/);
  assert.match(expenses, /item\.month === values\.expenseDate\.slice\(0, 7\)/);
  assert.match(expenses, /expenseService\.getExpenseBudgets\(month\)/);
});

test('monthly budget tab uses live APIs and does not simulate bank debits', () => {
  assert.match(tabs, /'budgets','Budgets'/);
  assert.match(expenses, /<ExpenseBudgetPanel categories={expenseCategories} canEdit={canEdit}/);
  assert.match(budgetPanel, /expenseService\.getExpenseBudgets\(month\)/);
  assert.match(budgetPanel, /expenseService\.createExpenseBudget\(\{ \.\.\.form, month \}\)/);
  assert.match(budgetPanel, /expenseService\.updateExpenseBudget\(item\.id/);
  assert.match(budgetPanel, /Used by Expenses/);
  assert.match(budgetPanel, /Remaining/);
  assert.match(budgetPanel, /Paying it later|Payments are not counted twice/);
  assert.match(client, /budgets/);
  assert.doesNotMatch(budgetPanel, /setAccountBalance|financeService\.transfer/);
});

test('supplier inventory and payroll are not duplicated as expense categories', () => {
  assert.match(expenses, /Spare parts purchases and supplier payments belong on each Supplier Details page/);
  assert.doesNotMatch(expenses.slice(expenses.indexOf('const expenseCategories'), expenses.indexOf('const paymentMethods')), /Staff Salary/);
  assert.doesNotMatch(expenses.slice(expenses.indexOf('const expenseCategories'), expenses.indexOf('const paymentMethods')), /Daily Wages/);
});
