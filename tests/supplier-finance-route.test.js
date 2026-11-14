import test from 'node:test';
import assert from 'node:assert/strict';
import {
  supplierFinanceSetupRoute, supplierFinanceReturnContext, matchesFinancePaymentChannel,
} from '../src/utils/supplierFinanceReturnRoute.js';

const supplier = '/suppliers/ea5200b8-eb3a-40d5-9008-4617e5897b49';

test('supplier payment warning sends user directly to Finance with a safe return path', () => {
  const url = supplierFinanceSetupRoute({ pathname: supplier, search: '' }, 'Bank');
  assert.equal(url.startsWith('/finance/accounts?'), true);
  const qs = url.slice(url.indexOf('?'));
  const { returnTo, channel } = supplierFinanceReturnContext(qs);
  assert.equal(returnTo, supplier + '#supplier-pay-now');
  assert.equal(channel, 'Bank');
});

test('cash channel and prior query string are maintained across setup', () => {
  const url = supplierFinanceSetupRoute({ pathname: supplier, search: '?tab=payments' }, 'Cash');
  assert.deepEqual(supplierFinanceReturnContext(url.slice(url.indexOf('?'))), {
    channel: 'Cash', returnTo: supplier + '?tab=payments#supplier-pay-now',
  });
});

test('supplier return routes reject external destinations and scripts', () => {
  for (const url of ['https://evil.example/steal', '//evil.example', '/finance',
    '/suppliers/not-a-uuid#supplier-pay-now',
    '/suppliers/' + 'a'.repeat(36) + '#other-anchor']) {
    const params = new URLSearchParams({ returnTo: url, channel: 'Bank' });
    assert.equal(supplierFinanceReturnContext('?' + params).returnTo, '');
  }
});

test('Finance account selector shows only the applicable payment channel', () => {
  assert.equal(matchesFinancePaymentChannel({ kind: 'Bank' }, 'Bank'), true);
  assert.equal(matchesFinancePaymentChannel({ kind: 'UPI' }, 'Bank'), true);
  assert.equal(matchesFinancePaymentChannel({ kind: 'Cash' }, 'Bank'), false);
  assert.equal(matchesFinancePaymentChannel({ kind: 'Cash' }, 'Cash'), true);
});
