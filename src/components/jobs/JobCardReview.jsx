import { Printer } from 'lucide-react';

export function JobCardReview({ form, complaints, photos, jobNumber = '', onPrint, created = false }) {
  const sections = [
    ['Job Card Date', form.jobDateTime ? new Date(form.jobDateTime).toLocaleString() : '—'],
    ['Customer', form.customerName],
    ['Phone', form.customerPhone],
    ['Vehicle Registration', form.vehicleReg],
    ['Make / Model', [form.vehicleMake, form.vehicleModel].filter(Boolean).join(' ')],
    ['Fuel Type', form.fuelType || '—'],
    ['KM Reading', form.kilometre || '—'],
    ['Fuel Level', form.fuelLevel || '—'],
    ['Service Type', form.serviceType || '—'],
    ['Technician', form.assignedEmployeeName || 'Unassigned'],
    ['Service Advisor', form.serviceAdvisor || 'Unassigned'],
    ['Priority', form.priority],
    ['Initial Status', form.status],
  ];
  return (
    <section className="job-create-review-slip" aria-label="Job Card review and print slip">
      <div className="job-create-review-header">
        <div>
          <strong>{created ? 'CubeGears · Job Card Slip' : 'Review Job Card'}</strong>
          <p>{created ? 'Saved Job Card' : 'Verify all details before creating the Job Card.'}</p>
        </div>
        {jobNumber && <b>{jobNumber}</b>}
      </div>
      <dl className="job-create-review-details">
        {sections.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
      </dl>
      <div className="job-create-review-complaints">
        <h3>Customer Complaints ({complaints.length})</h3>
        {complaints.length ? <ol>{complaints.map((complaint) => <li key={complaint.id}>
          <strong>{complaint.description}</strong>
          <span>{[complaint.category, complaint.priority].filter(Boolean).join(' · ')}</span>
          {complaint.inspectionNotes && <small>{complaint.inspectionNotes}</small>}
        </li>)}</ol> : <p>None recorded</p>}
      </div>
      <p className="job-create-review-photo-count">{photos.length} vehicle photo{photos.length === 1 ? '' : 's'} {created ? 'attached or pending upload' : 'ready for upload after Job Card creation'}.</p>
      {created && <button type="button" className="job-create-print-button" onClick={onPrint}>
        <Printer size={17}/> Print Job Card Slip
      </button>}
    </section>
  );
}
