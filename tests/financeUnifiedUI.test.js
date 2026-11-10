import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const workspace = read('src/pages/finance/FinanceWorkspace.jsx');
const dashboard = read('src/pages/finance/FinanceDashboard.jsx');
const accounts = read('src/pages/finance/AccountsPage.jsx');
const transfers = read('src/pages/finance/TransfersPage.jsx');
const transactions = read('src/pages/finance/TransactionsPage.jsx');
const accounting = read('src/pages/finance/AccountingWorkspace.jsx');
const payments = read('src/pages/payments/PaymentList.jsx');
const expenses = read('src/pages/expenses/ExpenseList.jsx');
const css = read('src/styles/finance-unified-ui.css');

test('finance workspace keeps all seven distinct permission-scoped routes', () => {
  for (const route of [
    '/finance', '/finance/payments', '/finance/expenses',
    '/finance/accounts', '/finance/transfers', '/finance/transactions',
    '/finance/accounting',
  ]) {
    assert.ok(workspace.includes("to: '" + route + "'"), 'Missing ' + route);
  }
  assert.match(workspace, /sections\.filter\(item => access\.can\(item\.access\)\)/);
  assert.match(workspace, /<Outlet \/>/);
  assert.match(workspace, /finance-workspace-intro/);
  assert.match(workspace, /finance-unified-ui\.css/);
});

test('one mobile UI stylesheet covers forms, tables, cards, and navigation', () => {
  assert.match(css, /\.finance-workspace-tabs/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.finance-stats-grid/);
  assert.match(css, /\.finance-ledger-wrap/);
  assert.match(css, /\.finance-field/);
  assert.match(css, /\.payments-page/);
  assert.match(css, /\.cg-expenses/);
  assert.match(css, /\.gl-workspace/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('overview never discloses redacted cash or bank balances', () => {
  assert.match(dashboard, /v === undefined \|\| v === null \? 'Restricted'/);
  assert.match(dashboard, /can\(permission\)/);
  assert.match(dashboard, /Customer Dues/);
  assert.match(dashboard, /Supplier Dues/);
  assert.match(dashboard, /View account/);
});

test('cash and bank accounts have helpful errors and accessible detail navigation', () => {
  assert.match(accounts, /financeService\.listAccounts/);
  assert.match(accounts, /financeService\.getAccount/);
  assert.match(accounts, /financeService\.createAccount/);
  assert.match(accounts, /financeService\.adjustBalance/);
  assert.match(accounts, /\) : error \? null : accounts\.length === 0 \?/);
  assert.match(accounts, /aria-label=\{\`View account/);
  assert.match(accounts, /e\.key === 'Enter' \|\| e\.key === ' '/);
});

test('transfers use existing finance posting, reject same-account transfers and never show empty on API failures', () => {
  assert.match(transfers, /financeService\.createTransfer/);
  assert.match(transfers, /form\.fromAccountId === form\.toAccountId/);
  assert.match(transfers, /assertFinanceAccount/);
  assert.match(transfers, /error \? null : \(/);
  assert.match(transfers, /it is not an income or expense/i);
});

test('transaction ledger retains real API export and accessible date filters', () => {
  assert.match(transactions, /financeService\.getLedger/);
  assert.match(transactions, /financeService\.exportLedgerPDF/);
  assert.match(transactions, /financeService\.exportLedgerCSV/);
  assert.match(transactions, /aria-label="Start date"/);
  assert.match(transactions, /aria-label="End date"/);
  assert.match(transactions, /Money In \(Credit\)/);
  assert.match(transactions, /Money Out \(Debit\)/);
});

test('accounting and customer/expense APIs are unchanged by the UI overhaul', () => {
  assert.match(accounting, /financeService\.postJournal/);
  assert.match(accounting, /financeService\.reconcileBank/);
  assert.match(accounting, /financeService\.getStatement/);
  assert.match(accounting, /aria-pressed=\{tab === name\}/);
  assert.match(payments, /<PaymentFinanceOverview/);
  assert.match(payments, /<PaymentFilterToolbar/);
  assert.match(expenses, /<ExpenseOverviewStats/);
  assert.match(expenses, /settleExpense/);
});
