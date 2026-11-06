// Read-only presentation helpers. Estimates are never invoices; missing money
// is unknown, not zero. The backend owns payment allocation and balances.
export const knownVehicleMoney = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

export const vehicleInvoiceRows = (history = []) =>
  history.filter((job) => Boolean(job.billing?.invoiceNumber)).map((job) => ({
    jobId: job.id,
    jobNumber: job.jobNumber || job.id,
    invoiceNo: job.billing.invoiceNumber,
    date: job.billing.invoiceDate || job.createdDate,
    total: knownVehicleMoney(job.billing.invoiceTotal),
    paid: knownVehicleMoney(job.billing.paidAmount),
    balance: knownVehicleMoney(job.billing.outstandingBalance),
    status: job.paymentStatus || job.billing.paymentStatus || '—',
  }));

export const vehicleTotalPaid = (rows = []) => {
  if (!rows.length || rows.some((row) => row.paid === null)) return null;
  return rows.reduce((sum, row) => sum + row.paid, 0);
};

export const latestFirstVehicleJobs = (history = []) =>
  [...history].sort((a, b) => String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
