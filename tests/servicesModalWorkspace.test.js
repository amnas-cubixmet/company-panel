import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getPermissionForPath } from '../src/utils/permissions.js';

const read = (filename) => readFileSync(new URL('../' + filename, import.meta.url), 'utf8');
const page = read('src/pages/services/ServiceList.jsx');
const grid = read('src/components/services/ServiceCatalogGrid.jsx');
const modal = read('src/components/common/ResponsiveModalSheet.jsx');
const css = read('src/styles/services-modal-workspace.css');

test('services CRUD routes open responsive sheets over one persistent directory', () => {
  assert.match(page, /const serviceModalOpen = isNew \|\| isEdit \|\| isDetail \|\| isDelete/);
  assert.match(page, /isOpen=\{serviceModalOpen\}/);
  assert.match(page, /isOpen=\{categoryDialogOpen\}/);
  assert.match(page, /<ServiceForm/);
  assert.match(page, /<ServiceCatalogGrid/);
  assert.match(page, /<ServiceCategoriesPanel/);
  assert.match(page, /isDelete && selectedService/);
  assert.doesNotMatch(page, /if \(isNew\) \{\s*return \(/);
  assert.doesNotMatch(page, /if \(isEdit\) \{\s*return \(/);
});

test('deep links retain correct role action permissions', () => {
  assert.equal(getPermissionForPath('/services'), 'services.view');
  assert.equal(getPermissionForPath('/services/new'), 'services.create');
  assert.equal(getPermissionForPath('/services/123/edit'), 'services.edit');
  assert.equal(getPermissionForPath('/services/123/delete'), 'services.delete');
  assert.equal(getPermissionForPath('/services/123'), 'services.view');
});

test('modal create and edit keep existing backend integration and failure states', () => {
  assert.match(page, /serviceService\.createService\(payload\)/);
  assert.match(page, /serviceService\.updateService\(id, payload\)/);
  assert.match(page, /serviceService\.deleteService\(service\.id\)/);
  assert.match(page, /serviceService\.createServiceCategory\(payload\)/);
  assert.match(page, /serviceService\.updateServiceCategory\(editingCategoryId, payload\)/);
  assert.match(page, /serviceService\.deleteServiceCategory\(category\.id\)/);
  assert.match(page, /setFormError\(error\?\.message/);
  assert.match(page, /Discard your unsaved service changes/);
  assert.match(page, /Delete Service/);
});

test('cards and category forms have accessible controls and mobile-sized fields', () => {
  assert.match(grid, /aria-label=\{'View service ' \+ service\.name\}/);
  assert.doesNotMatch(grid, /role="button"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /useDialogAccessibility\(isOpen, onClose, modalRef\)/);
  assert.match(modal, /onClick=\{onClose\}/);
  assert.match(page, /onAddCategory=\{canCreate/);
  assert.match(page, /aria-expanded=\{showCategories\}/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /min-height:48px/);
});

test('service form validation preserves amount, duration and category invariants', () => {
  assert.match(page, /!payload\.code \|\| !payload\.name \|\| !payload\.categoryId/);
  assert.match(page, /Number\.isFinite\(payload\.price\)/);
  assert.match(page, /Number\.isFinite\(payload\.durationMinutes\)/);
  assert.match(page, /setCategoryOpenedFromService\(fromService\)/);
  assert.match(page, /if \(categoryOpenedFromService && saved\?\.id\)/);
});
