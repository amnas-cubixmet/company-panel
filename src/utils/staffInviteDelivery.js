/** Status describes the Django/provider handoff, never inbox receipt. */
export const staffInviteDeliveryMessage = (status) => {
  switch (status) {
    case 'queued':
      return 'Official WhatsApp invitation queued. Sending is not yet confirmed.';
    case 'sending':
      return 'Official WhatsApp Business API is processing this invitation.';
    case 'sent':
      return 'Meta accepted the WhatsApp message. Delivery to the phone is not yet confirmed.';
    case 'delivered':
      return 'WhatsApp confirmed the invitation was delivered.';
    case 'read':
      return 'WhatsApp confirmed the invitation was read.';
    case 'manual':
      return 'Automatic delivery is unavailable or consent is missing. Share a new secure link directly with the staff member when authorized.';
    case 'failed':
      return 'Invitation delivery failed or could not be confirmed. Do not create the staff again; use Resend Setup Link.';
    case 'pending':
      return 'Staff account created. Invitation delivery is pending.';
    case 'consumed':
      return 'Password was set successfully. Mobile login is active.';
    case 'not_requested':
      return 'No WhatsApp setup invitation has been requested.';
    case 'superseded':
      return 'This invitation was replaced by a newer link.';
    default:
      return '';
  }
};

/** Read DRF validation errors from normalized or raw Axios responses. */
export const staffInviteErrorMessage = (error) => {
  const payload = error?.data || error?.response?.data;
  const messages = (value) => {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(messages).filter(Boolean).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(messages).filter(Boolean).join(' ');
    return '';
  };
  return messages(payload) || error?.message || 'Unable to send invite. Please try again.';
};
