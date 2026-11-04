import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8');

test('former plans route redirects to credits, no legacy marketplace', () => {
  assert.match(routes, /path="\/account\/plans" element=\{<Navigate to="\/account\/credits" replace \/>\}/);
  assert.doesNotMatch(routes, /<PlanMarketplace\s*\/>/);
});

test('former checkout and subscribe routes direct customers to credit top-ups', () => {
  assert.match(routes, /path="\/plans" element=\{<Navigate to="\/account\/credits\/buy" replace \/>\}/);
  assert.match(routes, /path="\/subscribe" element=\{<Navigate to="\/account\/credits\/buy" replace \/>\}/);
});
