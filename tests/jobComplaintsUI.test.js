import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const workspace = read('../src/pages/jobs/JobCardWorkspace.jsx');
const css = read('../src/styles/job-workspace-dashboard.css');
const start = workspace.indexOf("{activeTab === 'complaints' && (");
const end = workspace.indexOf("{activeTab === 'inspection' && (", start);
const complaints = workspace.slice(start, end);

test('Complaints screen has clear header and one straightforward add form', () => {
  assert.ok(start > -1 && end > start);
  assert.match(complaints, /Customer Complaints/);
  assert.match(complaints, /job-complaint-entry/);
  assert.match(complaints, /htmlFor="job-customer-complaint"/);
  assert.match(complaints, /maxLength=\{1000\}/);
  assert.match(complaints, /onClick=\{addComplaint\}/);
  assert.match(complaints, /disabled=\{!complaintText\.trim\(\) \|\| saving\}/);
});

test('Saving a complaint retains user text when the API reports a failure', () => {
  assert.match(workspace, /const updated = await persist\(\{ complaints: \[\.\.\.complaints, record\] \}\);/);
  assert.match(workspace, /if \(updated\) \{\s*setComplaintText\(''\)/);
});

test('Customer concerns filter by independently saved status, never by Job stage', () => {
  assert.match(complaints, /\['All', \.\.\.COMPLAINT_STATUSES\]/);
  assert.match(complaints, /aria-pressed=\{complaintFilter === filter\}/);
  assert.match(complaints, /complaints\.filter\(item => statusForComplaint\(item\) === filter\)/);
  assert.match(complaints, /statusForComplaint\(item\) === complaintFilter/);
  assert.match(complaints, /job-complaint-auto-status/);
  assert.doesNotMatch(complaints, /automaticComplaintStatus/);
});

test('Readable record cards show optional related service, empty states, and accessible status', () => {
  assert.match(complaints, /<Link\s+key=\{item\.id \|\| index\}/);
  assert.match(complaints, /job-complaint-description/);
  assert.match(complaints, /job-complaint-status/);
  assert.match(complaints, /Status · Staff/);
  assert.match(complaints, /No complaints recorded/);
  assert.match(complaints, /Choose All to view every customer complaint/);
});

test('Complaint UI is scoped to this page, responds on mobile, and keeps input text regular', () => {
  assert.match(css, /\.cg-job-detail\.job-workspace-dashboard \.job-complaints-panel/);
  assert.match(css, /\.job-complaint-compose textarea \{/);
  assert.match(css, /font-weight:400!important/);
  assert.match(css, /\.job-complaints-filters button\.is-active/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
