import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesSupplierProduct,
  filterSupplierProducts,
  purchaseProductOptions,
} from '../src/utils/supplierProductSearch.js';
import {
  SUPPLIER_TAB_HASHES, supplierTabForHash, allowedSupplierTab,
} from '../src/utils/supplierDetailTabs.js';

const oil = {
  id: 'one', partName: 'Engine Oil Filter', sku: 'OF-101',
  partNumber: 'Part-0001', barcode: '89012345670', brand: 'Bosch',
  supplier: 'supplier-A', onHand: 4,
};
const paint = {
  id: 'two', partName: 'Paint Brush', sku: 'PB-220',
  brand: 'ACME', supplier: 'supplier-B', onHand: 0,
};

test('product search matches name, SKU, part number, brand and barcode', () => {
  for (const term of ['engine', 'of-101', 'part-0001', 'bosch', '89012345670']) {
    assert.equal(matchesSupplierProduct(oil, term), true, term);
  }
  assert.deepEqual(filterSupplierProducts([oil, paint], 'brUsH'), [paint]);
  assert.equal(matchesSupplierProduct(oil, 'nonexistent'), false);
});

test('purchase search does not hide products linked to another supplier', () => {
  assert.deepEqual(purchaseProductOptions([oil, paint], [], 'paint'), [paint]);
  assert.deepEqual(purchaseProductOptions([oil, paint], [], 'OF-101'), [oil]);
});

test('server-returned products outside loaded stock page are selectable and de-duplicated', () => {
  const farProduct = { id: 'three', partName: 'Air Cabin Filter', sku: 'CF-900' };
  assert.deepEqual(
    purchaseProductOptions([oil, paint], [farProduct], 'cabin'),
    [farProduct],
  );
  const deduped = purchaseProductOptions([oil], [oil, farProduct], '');
  assert.equal(deduped.filter(item => item.id === 'one').length, 1);
  assert.equal(deduped.length, 2);
});

test('empty search shows loaded catalogue and limit is respected', () => {
  assert.deepEqual(purchaseProductOptions([paint, oil], [], '', 1).length, 1);
  assert.equal(purchaseProductOptions([], [], 'anything').length, 0);
  assert.deepEqual(filterSupplierProducts([paint, oil], ''), [paint, oil]);
});

test('supplier tabs preserve direct purchase and payment links', () => {
  for (const [tab, hash] of Object.entries(SUPPLIER_TAB_HASHES)) {
    assert.equal(supplierTabForHash(hash), tab);
  }
  assert.equal(supplierTabForHash('#supplier-transactions'), 'accounts');
  assert.equal(supplierTabForHash(''), 'overview');
});

test('supplier tab navigation respects role-based tab availability', () => {
  const tabs = [{ key: 'overview' }, { key: 'products' }];
  assert.equal(allowedSupplierTab('#supplier-purchase-form', tabs), 'overview');
  assert.equal(allowedSupplierTab('#supplier-products', tabs), 'products');
  assert.equal(allowedSupplierTab('#supplier-pay-now', tabs), 'overview');
});
