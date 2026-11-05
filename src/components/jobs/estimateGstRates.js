import { invoiceLineTaxChoices } from '../../utils/invoiceTaxUi.js';

export const ESTIMATE_ZERO_TAX_TREATMENTS = Object.freeze([
  { value: 'nil_rated', label: 'Nil-rated supply' },
  { value: 'exempt', label: 'Exempt supply' },
  { value: 'non_gst', label: 'Non-GST supply' },
  { value: 'out_of_scope', label: 'Out of scope' },
]);
const NONE_CHOICE = Object.freeze({
  value: 'none', label: 'None / No GST — classification required',
  totalRate: '0', taxMode: 'none',
});

/** Values sent to Django are TOTAL GST percentages, never the CGST half. */
export const estimateGstOptions = (rate = '', mode = 'unknown', config = null) => {
  const choices = [NONE_CHOICE, ...invoiceLineTaxChoices(mode, config)];
  const entered = String(rate ?? '').trim();
  if (entered && /^\d+(?:\.\d{1,2})?$/.test(entered) &&
      Number(entered) <= 100 && !choices.some(x => Number(x.totalRate) === Number(entered))) {
    return [...choices, { value: `saved:${entered}`, label: `Previously saved GST ${entered}%`, totalRate: entered }];
  }
  return choices;
};

// Compatible utility for other callers that only need numeric rate strings.
export const estimateGstChoices = (rate = '', mode = 'unknown', config = null) =>
  estimateGstOptions(rate, mode, config).filter(choice => choice.value !== 'none').map(choice => choice.value);
