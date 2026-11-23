// Only definite server validation/permission refusals are rejected.
// Unknown transport failures must stay pending because Django may have committed.
export function customerSyncErrorIsRetryable(error) {
  const status = Number(error?.status || 0);
  return !status || [401, 408, 425, 429].includes(status) || status >= 500;
}
