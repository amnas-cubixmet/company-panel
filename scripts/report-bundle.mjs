// Fail CI when initial app chunks unexpectedly grow beyond the current baseline.
// The entry CSS is ~964.5 kB after adding tenant and product mobile branding.
// Keep a tight 985 kB cap after the account readability polish.
// Vite builds one entry CSS and JS bundle; route chunks are measured separately.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const directory = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(directory);
const budgets = [
  { name: 'entry JavaScript', extension: 'js', maxKb: Number(process.env.BUNDLE_MAX_ENTRY_JS_KB || 440) },
  { name: 'entry CSS', extension: 'css', maxKb: Number(process.env.BUNDLE_MAX_ENTRY_CSS_KB || 985) },
];
let errors = 0;
for (const budget of budgets) {
  const matching = files.filter(file => new RegExp('^index-.*\\.' + budget.extension + '$').test(file));
  if (matching.length !== 1) {
    console.error('Expected one Vite ' + budget.name + ' entry asset, found ' + matching.length);
    errors += 1;
    continue;
  }
  const sizeKb = statSync(join(directory.pathname, matching[0])).size / 1000;
  console.log(budget.name + ': ' + sizeKb.toFixed(1) + ' kB / ' + budget.maxKb + ' kB budget');
  if (!Number.isFinite(budget.maxKb) || budget.maxKb <= 0 || sizeKb > budget.maxKb) {
    console.error('Bundle budget exceeded for ' + budget.name);
    errors += 1;
  }
}
if (errors) process.exitCode = 1;
