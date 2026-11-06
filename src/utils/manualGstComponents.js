/** Manual, opt-in GST component selection for new purchase drafts.
 * Does not replace the legacy combined-rate invoice API.
 * Only the backend may authorize a statutory purchase posting.
 */
const CGST_STATE_RATES = Object.freeze(['2.5', '5', '9', '18']);
const IGST_RATES = Object.freeze(['5', '18']);

export const supplierComponentChoices = (stateTaxLabel = 'SGST') => {
  const state = stateTaxLabel === 'UTGST' ? 'utgst' : 'sgst';
  return [
    ...CGST_STATE_RATES.map(rate => ({ value: 'cgst:' + rate, label: 'CGST ' + rate + '%' })),
    ...CGST_STATE_RATES.map(rate => ({
      value: state + ':' + rate, label: stateTaxLabel + ' ' + rate + '%',
    })),
    ...IGST_RATES.map(rate => ({ value: 'igst:' + rate, label: 'IGST ' + rate + '%' })),
    { value: 'zero', label: '0% — Select Classification' },
  ];
};

export const GST_ZERO_CLASSIFICATIONS = Object.freeze([
  { value: 'exempt', label: 'Exempt' },
  { value: 'nil_rated', label: 'Nil-rated' },
  { value: 'zero_rated', label: 'Zero-rated' },
  { value: 'non_gst', label: 'Non-GST' },
]);

const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;

/** Display independently selected amounts; never infer a missing paired tax. */
export const previewManualPurchaseTax = (row, mode, stateTaxLabel = 'SGST') => {
  const subtotal = roundMoney((Number(row.quantity) || 0) * (Number(row.purchaseRate) || 0));
  const selections = Array.isArray(row.taxComponents) ? row.taxComponents : [];
  const amounts = { cgst: 0, sgst: 0, utgst: 0, igst: 0 };
  const rates = {};
  for (const choice of selections) {
    const [component, rawRate] = choice.split(':');
    if (!Object.hasOwn(amounts, component)) continue;
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) continue;
    amounts[component] = roundMoney(subtotal * rate / 100);
    rates[component] = rate;
  }
  const state = stateTaxLabel === 'UTGST' ? 'utgst' : 'sgst';
  const other = state === 'utgst' ? 'sgst' : 'utgst';
  const tax = roundMoney(Object.values(amounts).reduce((sum, amount) => sum + amount, 0));
  const result = {
    subtotal, cgst: amounts.cgst, stateTax: amounts.sgst + amounts.utgst,
    igst: amounts.igst, total: roundMoney(subtotal + tax), tax,
    status: 'incomplete', message: '',
  };
  if (selections.length === 1 && selections[0] === 'zero') {
    const classification = row.gstTreatment || '';
    if (mode === 'unregistered' ||
        (['exempt', 'nil_rated', 'zero_rated', 'non_gst'].includes(classification) &&
          mode !== 'unselected' &&
          (classification !== 'zero_rated' || ['export', 'sez'].includes(row.zeroRatingBasis)))) {
      result.status = 'valid';
    } else {
      result.message = 'Select a valid 0% classification, zero-rating basis and place of supply.';
    }
  } else if (!selections.length) {
    result.message = 'Choose a GST component or 0% classification.';
  } else if (selections.includes('zero')) {
    result.status = 'invalid';
    result.message = '0% cannot be combined with taxable GST.';
  } else if (mode === 'unregistered' || mode === 'unselected') {
    result.status = 'invalid';
    result.message = 'Verify supplier GSTIN and Place of Supply.';
  } else if (Object.hasOwn(rates, 'igst')) {
    result.status = selections.length === 1 && mode === 'igst' ? 'valid' : 'invalid';
    result.message = result.status === 'valid' ? '' : 'Use IGST alone for inter-state purchases.';
  } else if (mode === 'igst') {
    result.status = 'invalid';
    result.message = 'Inter-state purchases require IGST.';
  } else if (Object.hasOwn(rates, other)) {
    result.status = 'invalid';
    result.message = 'Choose SGST or UTGST for the current jurisdiction.';
  } else if (Object.hasOwn(rates, 'cgst') && Object.hasOwn(rates, state)) {
    const combined = rates.cgst + rates[state];
    result.status = rates.cgst === rates[state] && [5, 18].includes(combined) ? 'valid' : 'invalid';
    result.message = result.status === 'valid' ? '' : 'Component rates must match an applicable 5% or 18% tax profile.';
  } else {
    result.message = 'Select both CGST and ' + stateTaxLabel + ' manually before posting.';
  }
  return result;
};
