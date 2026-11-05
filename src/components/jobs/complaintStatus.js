// Complaint status is a staff decision, never a derived Job/QC status.
export const COMPLAINT_STATUSES = Object.freeze([
  'Pending', 'In Progress', 'Resolved', 'Not Resolved', 'Not Applicable',
]);

export const statusForComplaint = item =>
  COMPLAINT_STATUSES.includes(item?.status) ? item.status : 'Pending';

// Compatibility for legacy callers that display an overall badge only.
export const complaintStatusForJob = () => 'Pending';

export const complaintStatusClass = status => {
  if (status === 'Resolved' || status === 'Not Applicable') return 'is-completed';
  if (status === 'In Progress') return 'is-progress';
  if (status === 'Not Resolved') return 'is-open';
  return 'is-open';
};

export const unresolvedComplaintCount = complaints =>
  (Array.isArray(complaints) ? complaints : []).filter(item =>
    !['Resolved', 'Not Applicable'].includes(statusForComplaint(item))
  ).length;
