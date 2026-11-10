import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const profile = read('src/pages/suppliers/SuppliersPage.jsx');
const statement = read('src/components/suppliers/SupplierAccountStatement.jsx');
const service = read('src/services/supplierFinance.service.js');
const style = read('src/styles/supplier-account-statement.css');

test('supplier directory balances come from full authoritative backend summary, not 100-bill list', () => {
  assert.match(service, /getSupplierBalances: \(\) => live\('get', '\/suppliers\/balances'\)/);
  assert.match(profile, /supplierFinanceService\.getSupplierBalances\(\)/);
  assert.match(profile, /new Map\(rows\.map\(row => \[String\(row\.supplierId\), row\]\)\)/);
  assert.match(profile, /SupplierBill is the authoritative posted payable|This API includes ALL posted supplier bills/);
  assert.doesNotMatch(profile, /balances\.set\(key, \(balances\.get\(key\) \|\| 0\) \+ Number\(bill\.outstanding/);
  assert.match(profile, /supplierBalanceTotals\.totalOutstanding/);
  assert.match(profile, /Supplier Credit Due/);
  assert.match(profile, /Available Credits/);
});

test('supplier profile renders live credit summary and separate financial ledger', () => {
  assert.match(service, /getSupplierLedger: \(id\)/);
  assert.match(profile, /supplierFinanceService\.getSupplierLedger\(id\)/);
  assert.match(profile, /<SupplierAccountStatement/);
  assert.match(profile, /supplierLedgerLoading/);
  assert.match(profile, /supplierFinancials\.availableDebitCredit/);
  assert.match(profile, /supplierFinancials\.outstanding/);
  assert.match(profile, /supplierFinancials\.netExposureAfterAvailableCredits/);
  assert.match(profile, /canViewFinance &&/);
  assert.match(profile, /supplier-transactions/);
});

test('supplier statement handles purchases, bank out, advances and non-cash credits separately', () => {
  assert.match(statement, /entry\.payableIncrease/);
  assert.match(statement, /entry\.payableDecrease/);
  assert.match(statement, /entry\.cashOut/);
  assert.match(statement, /entry\.cashIn/);
  assert.match(statement, /entry\.runningPayable/);
  assert.match(statement, /Advance payments debit the selected Cash\/Bank account once/);
  assert.match(statement, /applying an advance later never withdraws money again/);
  assert.match(statement, /supplier-statement-/);
  assert.match(statement, /aria-label="Search supplier transactions"/);
  assert.match(style, /max-width:700px/);
  assert.match(style, /min-height:44px/);
});
