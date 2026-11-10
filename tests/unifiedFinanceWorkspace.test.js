import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  accountChannel, financeAccountsForChannel, assertFinanceAccount,
} from '../src/utils/financeCashBank.js';
import { expenseIncludedGst } from '../src/utils/expenseGst.js';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const accounts = [
  { id: '1', kind: 'Cash', isActive: true },
  { id: '2', kind: 'Bank', isActive: true },
  { id: '3', kind: 'UPI', isActive: true },
  { id: '4', kind: 'Wallet', isActive: false },
];

test('legacy digital accounts are Bank; physical cash stays Cash', () => {
  assert.equal(accountChannel('Cash'), 'Cash');
  assert.equal(accountChannel('Bank'), 'Bank');
  assert.equal(accountChannel('UPI'), 'Bank');
  assert.deepEqual(financeAccountsForChannel(accounts, 'Cash').map(x => x.id), ['1']);
  assert.deepEqual(financeAccountsForChannel(accounts, 'Bank').map(x => x.id), ['2', '3']);
  assert.throws(() => assertFinanceAccount(accounts, '1', 'Bank'), /does not match/);
  assert.throws(() => assertFinanceAccount(accounts, '4', 'Bank'), /active/);
  assert.equal(assertFinanceAccount(accounts, '3', 'Bank').id, '3');
});

test('GST percent is extracted from an inclusive expense amount, never double added', () => {
  assert.equal(expenseIncludedGst('118.00', '18'), '18.00');
  assert.equal(expenseIncludedGst('105.00', '5'), '5.00');
  assert.equal(expenseIncludedGst('100.00', '0'), '0.00');
  assert.equal(expenseIncludedGst('-1', '18'), '');
});

test('finance is the only navigation group for payments, expenses and accounts', () => {
  const routes = source('src/routes/AppRoutes.jsx');
  const menu = source('src/routes/routeConfig.js');
  const permissions = source('src/utils/permissions.js');
  const workspace = source('src/pages/finance/FinanceWorkspace.jsx');
  assert.match(routes, /path="\/finance" element=\{<FinanceWorkspace/);
  assert.match(routes, /path="\/finance\/payments" element=\{<PaymentList/);
  assert.match(routes, /path="\/finance\/expenses" element=\{<ExpenseList/);
  assert.match(routes, /path="\/payments\/\*"/);
  assert.match(routes, /path="\/expenses\/\*"/);
  assert.doesNotMatch(menu, /id: 'payments', label: 'Payments'/);
  assert.doesNotMatch(menu, /id: 'expenses', label: 'Expenses'/);
  assert.match(permissions, /'\/finance\/expenses': 'expenses'/);
  assert.match(permissions, /'\/finance\/payments': 'payments'/);
  assert.match(workspace, /Employee Wages/);
  assert.match(workspace, /Supplier Purchases & Dues/);
});

test('posting forms validate matching money account and calculated GST', () => {
  const payments = source('src/pages/payments/PaymentList.jsx');
  const expenses = source('src/pages/expenses/ExpenseList.jsx');
  const accountsPage = source('src/pages/finance/AccountsPage.jsx');
  assert.match(payments, /assertFinanceAccount\(accounts, form.accountId, form.method\)/);
  assert.match(expenses, /assertFinanceAccount\(accounts, settlement.account, settlement.method\)/);
  assert.match(expenses, /expenseIncludedGst/);
  assert.match(accountsPage, /const KINDS = \['Cash', 'Bank'\]/);
});
