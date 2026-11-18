// The API supplies a company-scoped quote and the authoritative purchase flag.
// A client-side estimate or enabled button cannot grant paid access.
export function featureLabelStatus(bundle, wallet) {
  if (!bundle) return { label: 'Unavailable', message: 'Feature label could not be loaded.', allow: false };
  // The opt-in due-day mode records a verified server-side usage session and
  // only charges the wallet AFTER a closed cycle. Zero wallet balance alone
  // must never prevent an eligible new monthly label activation.
  if (bundle.cyclePostpaid) {
    if (bundle.billingType !== 'monthly') return {
      label: 'Unavailable', message: 'Only monthly labels support postpaid billing cycles.', allow: false
    };
    if (!bundle.purchaseEnabled) return {
      label: 'Unavailable', message: 'This label is not published for purchase.', allow: false
    };
    if (!wallet) return { label: 'Unavailable', message: 'Wallet information has not loaded.', allow: false };
    if (!wallet.canManage) return { label: 'Restricted', message: 'Only the account owner can enable a paid label.', allow: false };
    if (bundle.active) return { label: 'Active', message: 'Already enabled; usage is billed on the next due date.', allow: false };
    return { label: 'Postpaid', message: 'Activate now; no credits are deducted until the cycle closes.', allow: true };
  }

  if (bundle.active && bundle.billingType === 'permanent') {
    return { label: 'Active', message: 'This label is already permanently owned.', allow: false };
  }
  const reasons = {
    FEATURE_ENTITLEMENTS_NOT_ENABLED: 'Platform feature billing must be enabled before labels can be activated.',
    METERED_OPERATION_NOT_READY: 'Per-use operations are not metered on the backend yet.',
    FEATURE_LABEL_EMPTY: 'This label has no active existing features.',
    FREE_MODULES_ONLY: 'These modules are already included free. No credits or activation required.',
    POSTPAID_ENGINE_DISABLED: 'Monthly billing is not ready. Ask your SaaS administrator to enable metering and the payment schedule.',
    MODULE_PRICE_NOT_SET: 'Price not set. Your SaaS administrator must publish a positive price before activation.',
    INVALID_USER_PRICE: 'The administrator must configure a positive per-user credit rate.',
  };
  if (!bundle.purchaseEnabled) {
    return { label: bundle.purchaseDisabledReason === 'MODULE_PRICE_NOT_SET' ? 'Price not set' : 'Unavailable', message: reasons[bundle.purchaseDisabledReason] || 'Label activation is not available on the backend.', allow: false };
  }
  if (!wallet) return { label: 'Unavailable', message: 'Wallet information has not loaded.', allow: false };
  if (!wallet.canManage) return { label: 'Restricted', message: 'Only a billing administrator can activate labels.', allow: false };

  if (bundle.canResume) return { label: 'Inactive', message: 'Resume your paid access without another charge.', allow: true };
  const price = Number(bundle.totalCredits);
  if (!Number.isFinite(price) || price <= 0) {
    return { label: 'Unavailable', message: 'No verified server quote is available. Refresh the page.', allow: false };
  }
  // The chosen rate unit can be 10 seconds, hourly, daily, weekly or 30 days.
  // It does not define the date of collection. A time-metered postpaid module
  // never needs an upfront wallet balance; the backend settles once monthly.
  if (bundle.billingMode === 'monthly_postpaid') {
    return bundle.active
      ? { label: 'Active', message: 'Active seconds are recorded. Payment is due next month.', allow: false }
      : { label: 'Deferred', message: 'Enable now; ON time is logged at the selected rate and settled next month.', allow: true };
  }
  const balance = Number(wallet.balance);
  if (!Number.isFinite(balance) || balance < price) {
    return { label: 'Low credits', message: 'Buy credits before activating this label.', allow: false };
  }
  return { label: bundle.active ? 'Active' : 'Inactive', message: '', allow: true };
}
