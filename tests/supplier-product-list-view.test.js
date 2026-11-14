import test from 'node:test';
import assert from 'node:assert/strict';
import {
  supplierProductStockQuantity, supplierProductStockStatus,
  supplierProductStockSummary, arrangeSupplierProducts,
} from '../src/utils/supplierProductListView.js';

const catalogue = [
  { id: 'a', partName: 'Oil filter', onHand: '5.00' },
  { id: 'b', partName: 'Air filter', onHand: '0' },
  { id: 'c', partName: 'Paint Brush', onHand: null },
  { id: 'd', partName: 'Bearing', onHand: '-1.00' },
  { id: 'e', partName: 'Belt 2', onHand: '3' },
  { id: 'f', partName: 'Belt 10', onHand: 'not-available' },
];

test('known stock, empty stock and invalid stock are not confused', () => {
  assert.equal(supplierProductStockQuantity(catalogue[0]), 5);
  assert.equal(supplierProductStockQuantity(catalogue[1]), 0);
  assert.equal(supplierProductStockQuantity(catalogue[2]), null);
  assert.equal(supplierProductStockQuantity(catalogue[5]), null);
  assert.equal(supplierProductStockStatus(catalogue[3]), 'out');
  assert.equal(supplierProductStockStatus({ on_hand: '4' }), 'in');
});

test('stock summary counts available, out of stock and unknown separately', () => {
  assert.deepEqual(supplierProductStockSummary(catalogue), { in: 2, out: 2, unknown: 2 });
  assert.deepEqual(supplierProductStockSummary(null), { in: 0, out: 0, unknown: 0 });
});

test('product browsing filters by stock status and keeps source array unchanged', () => {
  const before = catalogue.map(row => row.id);
  assert.deepEqual(arrangeSupplierProducts(catalogue, 'in').map(row => row.id), ['e', 'a']);
  assert.deepEqual(arrangeSupplierProducts(catalogue, 'out').map(row => row.id), ['b', 'd']);
  assert.deepEqual(arrangeSupplierProducts(catalogue, 'unknown').map(row => row.id), ['f', 'c']);
  assert.deepEqual(catalogue.map(row => row.id), before);
});

test('numeric-aware name sorting and low stock sort are stable', () => {
  assert.deepEqual(arrangeSupplierProducts(catalogue, 'all', 'name').map(row => row.id),
    ['b', 'd', 'e', 'f', 'a', 'c']);
  assert.deepEqual(arrangeSupplierProducts(catalogue, 'all', 'stock').map(row => row.id),
    ['d', 'b', 'e', 'a', 'f', 'c']);
});

test('non-array product results are handled gracefully', () => {
  assert.deepEqual(arrangeSupplierProducts(undefined), []);
});
