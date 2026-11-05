/**
 * Human-readable invoice field names and specific next steps for quick repair.
 * This is presentation only: backend and invoicePayload retain authority.
 */
const labels = {
  date: 'Invoice Date',
  'customer.name': 'Customer Name',
  'customer.phone': 'Customer Phone',
  'customer.email': 'Customer Email',
  'customer.gstin': 'Customer GSTIN',
  'customer.state': 'Customer State',
  'customer.placeOfSupply': 'Place of Supply',
  'seller.gstin': 'Workshop GSTIN / State',
  items: 'Goods / Services',
  paid: 'Received Amount',
  discount: 'Invoice Discount',
  adjustment: 'Adjustment',
  cgstRate: 'CGST Rate',
  sgstRate: 'SGST Rate',
  igstRate: 'IGST Rate',
};
const itemLabels = {
  type: 'Type',
  inventoryId: 'Stock Item',
  description: 'Item / Service Name',
  hsnCode: 'HSN / SAC',
  qty: 'Quantity',
  unit: 'Unit',
  rate: 'Price / Unit',
  purchasePrice: 'Purchase Price',
  discount: 'Item Discount',
  taxRate: 'GST Rate',
};
export const invoiceFieldLabel = (field) => {
  const item = /^items\.(\d+)\.([\w]+)$/.exec(String(field));
  if (item) return `Item ${Number(item[1]) + 1} — ${itemLabels[item[2]] || item[2]}`;
  return labels[field] || String(field).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ');
};

export const invoiceFieldNextStep = (field) => {
  if (field === 'seller.gstin') return 'Open Company Settings and verify the GSTIN and supplying branch state.';
  if (field === 'customer.placeOfSupply') return 'Select the correct State/UT in Place of Supply (for example, 32-Kerala).';
  if (field === 'items') return 'Add at least one goods or service row.';
  if (/^items\.\d+\.(purchasePrice|discount)$/.test(field)) {
    return 'Check this item’s amounts; the editable invoice row does not expose this adjustment.';
  }
  if (/^(cgstRate|sgstRate|igstRate)$/.test(field)) {
    return 'Review the automatically calculated GST rate and tax mode.';
  }
  return 'Go to this field and correct the value.';
};
