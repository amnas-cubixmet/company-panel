import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const ui = read('src/components/jobs/JobWorkServiceQuickAdd.jsx');
const css = read('src/styles/job-work-service-quick.css');

test('Work Add Service uses clear catalogue and details panels with selected-service feedback', () => {
  assert.match(ui, /className="job-service-quick-layout"/);
  assert.match(ui, /className="job-service-quick-catalogue"/);
  assert.match(ui, /className="job-service-quick-config"/);
  assert.match(ui, /Choose service/);
  assert.match(ui, /Job details/);
  assert.match(ui, /Selected service/);
  assert.match(ui, /aria-pressed=\{form\.serviceId === service\.id\}/);
  assert.match(ui, /role="status" aria-live="polite"/);
  assert.match(ui, /aria-label="Matching services"/);
});

test('Existing rate/quantity/worker charge fields and safe save behavior remain intact', () => {
  assert.match(ui, /Quantity/);
  assert.match(ui, /Customer Rate \(₹\)/);
  assert.match(ui, /Mechanic \(Optional\)/);
  assert.match(ui, /Agreed Mechanic Charge \(₹\)/);
  assert.match(ui, /Math\.max\(0, Number\(form\.quantity\) \|\| 0\)/);
  assert.match(ui, /Math\.max\(0, Number\(form\.customerRate\) \|\| 0\)/);
  assert.match(ui, /Customer charge/);
  assert.match(ui, /not a payment/);
  assert.match(ui, /jobService\.addJobService\(jobId, \{ \.\.\.form, requestId \}\)/);
  assert.match(ui, /form\.requestId \|\| crypto\.randomUUID\(\)/);
  assert.match(ui, /Keep requestId unchanged so retries cannot duplicate/);
  assert.match(ui, /disabled=\{!form\.serviceId \|\| saving\}/);
});

test('Create Service stays an expandable catalogue operation, never nested inside job save form', () => {
  assert.match(ui, /aria-expanded=\{showCreate\} aria-controls="job-service-quick-create"/);
  assert.match(ui, /<form id="job-service-quick-create" className="job-service-quick-create" onSubmit=\{create\}>/);
  assert.match(ui, /<form className="job-service-quick-entry" onSubmit=\{add\}>/);
  assert.match(ui, /serviceService\.createService/);
  assert.match(ui, /serviceService\.getServiceCategories/);
  assert.match(ui, /serviceService\.getServices/);
  assert.match(ui, /setLoading\(true\)/);
  assert.match(ui, /setLoading\(false\)/);
});

test('Service picker and pricing controls fit narrow screens while retaining 16px inputs', () => {
  assert.match(css, /grid-template-columns:minmax\(0,1\.04fr\) minmax\(0,\.96fr\)/);
  assert.match(css, /@media\(max-width:1050px\)/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /@media\(max-width:460px\)/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /var\(--surface\)/);
  assert.match(css, /var\(--text-primary\)/);
});

test('Search Service renders as one field despite global Job Workspace input styles', () => {
  assert.match(ui, /className="job-service-quick-search"/);
  assert.match(ui, /type="search"/);
  assert.match(ui, /aria-label="Search service catalogue"/);
  const scoped = css.match(/\.cg-job-detail\.job-workspace-dashboard \.job-service-quick \.job-service-quick-search input\[type="search"\] \{([^}]+)\}/);
  assert.ok(scoped, 'specific override must beat the global .job-panel input rule');
  const rules = scoped[1];
  assert.match(rules, /border:0 !important/);
  assert.match(rules, /background:transparent !important/);
  assert.match(rules, /border-radius:0 !important/);
  assert.match(rules, /box-shadow:none !important/);
  assert.match(rules, /font-size:16px !important/);
  assert.match(css, /\.cg-job-detail \.job-service-quick-search:focus-within/);
  assert.match(css, /min-height:46px/);
});
