import { BookOpen, ChevronDown, CircleHelp, ClipboardCheck, CreditCard, Wrench } from 'lucide-react';

const definitions = [
  {
    label: 'New / Check-in',
    detail: 'A vehicle has arrived and a Job Card has been created. Record complaints and inspect the vehicle.',
  },
  {
    label: 'Inspection & Estimate',
    detail: 'Check vehicle condition and prepare the customer estimate. Skipped stages remain labelled as skipped.',
  },
  {
    label: 'Work & Quality Check',
    detail: 'Assign a technician, record work and parts, then complete the quality check before delivery.',
  },
  {
    label: 'Invoice & Payment',
    detail: 'Create the invoice when ready. Payments and outstanding balances are recorded in Finance with separate access permissions.',
  },
];

export function JobCardsGuide() {
  return (
    <section className="jobs-workflow-guide" aria-label="How to manage Job Cards">
      <div className="jobs-workflow-guide-steps">
        <span><b>1</b> Add the customer and vehicle</span>
        <span><b>2</b> Inspect, estimate and complete work</span>
        <span><b>3</b> Check quality, invoice and deliver</span>
      </div>
      <details>
        <summary><CircleHelp size={17} aria-hidden="true"/>
          How do Job Cards work? / ജോബ് കാർഡ് സഹായം
          <ChevronDown size={17} aria-hidden="true" className="jobs-workflow-guide-chevron"/>
        </summary>
        <div className="jobs-workflow-guide-topics">
          {definitions.map(({ label, detail }) => (
            <article key={label}>
              <h3>{label}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </details>
      <div className="jobs-workflow-guide-note">
        <BookOpen size={16} aria-hidden="true"/>
        <span>Use search or filters to find a job by number, vehicle, customer or assigned technician.
          The financial details below are visible only to staff with the relevant permissions.</span>
      </div>
    </section>
  );
}

export function JobCreateGuide() {
  return <div className="job-create-guide" role="note">
    <ClipboardCheck size={18} aria-hidden="true"/>
    <span>Start with the customer and vehicle, enter each complaint, then review everything before saving the Job Card.
      Assign staff and add photos if needed.</span>
  </div>;
}

export function JobDetailGuide() {
  return <div className="job-detail-guide" role="note">
    <Wrench size={18} aria-hidden="true"/>
    <span>Follow the steps below to finish the job. Inspection and estimate may be skipped when permitted.
      <CreditCard size={14} aria-hidden="true" className="job-detail-guide-inline"/>
      Customer payments must be recorded separately in Finance.</span>
  </div>;
}
