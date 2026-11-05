import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const routes = read('../src/routes/AppRoutes.jsx');
const workspace = read('../src/pages/jobs/JobCardWorkspace.jsx');
const details = read('../src/pages/jobs/JobComplaintDetails.jsx');
const css = read('../src/styles/job-complaint-detail.css');
const app = read('../src/App.jsx');

test('Complaint Records has a dedicated protected View route before wildcard', () => {
  assert.match(routes, /lazyPage\(\(\) => import\('\.\.\/pages\/jobs\/JobComplaintDetails'\), 'JobComplaintDetails'\)/);
  const complaintDetail = routes.indexOf('path="/jobs/:id/complaints/:complaintId"');
  const catchAll = routes.indexOf('path="/jobs/:id/*"');
  assert.ok(complaintDetail >= 0 && complaintDetail < catchAll);
  assert.match(routes, /element=\{<JobComplaintDetails\s*\/>\}/);
});

test('Clicking anywhere on a complaint card opens its detail route and retains filters', () => {
  const start = workspace.indexOf("{activeTab === 'complaints' && (");
  const end = workspace.indexOf("{activeTab === 'inspection' && (", start);
  const list = workspace.slice(start, end);
  assert.match(workspace, /import \{ Link, useLocation, useNavigate, useParams \}/);
  assert.match(list, /<Link\s+key=\{item\.id \|\| index\}/);
  assert.match(list, /className="job-complaint-card job-complaint-card-link"/);
  assert.match(list, /aria-label=\{\`Open complaint details:/);
  assert.match(list, /to=\{\`\/jobs\/\$\{encodeURIComponent\(job\.id\)\}\/complaints\//);
  assert.match(list, /\$\{location\.search\}/);
  assert.match(list, /complaints\.map\(\(item, index\) => \(\{ item, index \}\)\)/);
  assert.match(list, /row-\$\{index\}/);
  assert.match(list, /<ChevronRight size=\{17\}/);
  assert.doesNotMatch(list, /<button[^>]*className="job-complaint-view"/);
  assert.doesNotMatch(list, /<article key=\{item\.id \|\| index\}/);
});

test('View page loads job-scoped data and safely handles removed or legacy records', () => {
  assert.match(details, /jobService\.getJobById\(jobId\)/);
  assert.match(details, /const findComplaint =/);
  assert.match(details, /entry\.id == null/);
  assert.match(details, /Complaint not found/);
  assert.match(details, /Back to Complaints/);
  assert.match(details, /\$\{location\.search\}/);
});

test('Complaint detail has staff-only status edit, notes, work references and audit history', () => {
  assert.match(details, /statusForComplaint\(complaint\)/);
  assert.match(details, /Status \(Staff-reviewed\)/);
  assert.match(details, /job-complaint-detail-auto-status/);
  assert.match(details, /jobService\.updateJobComplaintStatus\(/);
  assert.match(details, /can\('jobs\.edit'\)/);
  assert.match(details, /Save Complaint Status/);
  assert.match(details, /statusHistory/);
});

test('Complaint details show customer and vehicle with responsive single-column mobile layout', () => {
  assert.match(details, /Customer & Vehicle/);
  assert.match(details, /Related Work \/ Service/);
  assert.match(details, /Complaint Reference/);
  assert.match(details, /Recorded/);
  assert.match(css, /\.job-complaint-detail-page/);
  assert.match(css, /\.job-complaint-card-link:hover/);
  assert.match(css, /\.job-complaint-card-link:focus-visible/);
  assert.doesNotMatch(css, /\.job-complaint-view/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(app, /import '\.\/styles\/job-complaint-detail\.css'/);
});
