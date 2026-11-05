import test from 'node:test';
import assert from 'node:assert/strict';
import {
  complaintStatusForJob, statusForComplaint, complaintStatusClass,
  unresolvedComplaintCount, COMPLAINT_STATUSES,
} from '../src/components/jobs/complaintStatus.js';

test('Job stage and successful QC cannot resolve customer complaints automatically', () => {
  for (const status of ['New', 'Inspection', 'Estimate Pending', 'In Progress', 'QC', 'Delivered']) {
    assert.equal(complaintStatusForJob({ status }, { completed: ['overview','inspection','estimate','work','qc'] }), 'Pending');
  }
  assert.equal(statusForComplaint({ status: 'Completed' }), 'Pending');
  assert.equal(statusForComplaint({ status: 'Open' }), 'Pending');
  assert.equal(statusForComplaint({ status: 'Resolved' }), 'Resolved');
});

test('five independent complaint statuses and badge styling', () => {
  assert.deepEqual(COMPLAINT_STATUSES,
    ['Pending', 'In Progress', 'Resolved', 'Not Resolved', 'Not Applicable']);
  assert.equal(complaintStatusClass('Pending'), 'is-open');
  assert.equal(complaintStatusClass('In Progress'), 'is-progress');
  assert.equal(complaintStatusClass('Resolved'), 'is-completed');
  assert.equal(complaintStatusClass('Not Applicable'), 'is-completed');
  assert.equal(complaintStatusClass('Not Resolved'), 'is-open');
});

test('Unresolved complaints stay visible and require explicit review before QC', () => {
  assert.equal(unresolvedComplaintCount([
    { status: 'Pending' }, { status: 'In Progress' }, { status: 'Not Resolved' },
    { status: 'Resolved' }, { status: 'Not Applicable' },
  ]), 3);
});
