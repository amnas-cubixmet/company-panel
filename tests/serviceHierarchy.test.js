import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCategoryTreeRows, categoryIsDescendantOf } from '../src/utils/serviceHierarchy.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Unlimited practical categories sort root then descendants and retain path', () => {
  const rows = [
    {id:'a',name:'Body Work',parentId:''},
    {id:'c',name:'Door Painting',parentId:'b'},
    {id:'b',name:'Painting',parentId:'a'},
    {id:'d',name:'Front Door Painting',parentId:'c'},
    {id:'x',name:'Mechanical',parentId:''},
  ];
  const ordered=buildCategoryTreeRows(rows);
  assert.deepEqual(ordered.map(x=>x.id), ['a','b','c','d','x']);
  assert.deepEqual(ordered.map(x=>x.depth), [0,1,2,3,0]);
  assert.equal(ordered[3].path, 'Body Work › Painting › Door Painting › Front Door Painting');
  assert.equal(categoryIsDescendantOf('a','d',rows),true);
  assert.equal(categoryIsDescendantOf('d','a',rows),false);
});

test('Orphaned and malformed legacy categories remain visible', () => {
  const rows=[{id:'o',name:'Orphan',parentId:'missing'},{id:'z',name:'Leaf',parentId:'o'}];
  const result=buildCategoryTreeRows(rows);
  assert.deepEqual(new Set(result.map(x=>x.id)),new Set(['o','z']));
});

test('Services UI retains existing forms, tree operations, and real API mappings', () => {
  const page=read('src/pages/services/ServiceList.jsx');
  const panel=read('src/components/services/ServiceCategoriesPanel.jsx');
  const api=read('src/services/service.service.js');
  const css=read('src/styles/service-hierarchy.css');
  assert.match(panel, /buildCategoryTreeRows\(categories\)/);
  assert.match(panel, /onAdd\(category\.id\)/);
  assert.match(panel, /service-category-tree/);
  assert.match(page, /Parent Category/);
  assert.match(page, /categoryIsDescendantOf\(categoryEditor\.id/);
  assert.match(page, /GST Treatment/);
  assert.match(page, /SAC \/ HSN/);
  assert.match(api, /categoryPayload/);
  assert.match(api, /servicePayload/);
  assert.match(api, /apiClient\.patch\(\`\/services\/categories\/\$\{id\}\`/);
  assert.match(css, /@media\(max-width:700px\)/);
});
