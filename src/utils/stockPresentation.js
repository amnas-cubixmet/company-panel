const number = (value) => Number(value) || 0;
const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
});

export const formatStockPrice = (value) => priceFormatter.format(number(value));

export const ZERO_GST_CLASSIFICATIONS = [
  ['exempt', 'Exempt'],
  ['nil_rated', 'Nil-rated'],
  ['zero_rated', 'Zero-rated'],
  ['non_gst', 'Non-GST'],
];

export function stockState(item) {
  const available = number(item.available ?? (number(item.onHand) - number(item.reserved)));
  if (available <= 0) return { label: 'Out of stock', tone: 'out' };
  if (available <= number(item.minimumStock)) return { label: 'Low stock', tone: 'low' };
  return { label: 'Available', tone: 'ok' };
}
