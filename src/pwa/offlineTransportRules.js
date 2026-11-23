// Pure transport decisions. A backend outage is not an authorization grant.
const NETWORK_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']);

export function isBackendNetworkFailure(error) {
  return !error?.response && NETWORK_CODES.has(error?.code);
}

// Once Django is known to be unreachable, do not flood it with GET requests
// for endpoints which have no safe, previously verified IndexedDB snapshot.
// /auth/me deliberately fails as a network error so existing offline-session
// checks (including JWT expiry and tenant scope) still apply.
export function shouldSkipUncachedOfflineRead(config, disconnected, cacheKey) {
  const method = String(config?.method || 'get').toLowerCase();
  return Boolean(disconnected) && ['get', 'head', 'options'].includes(method) && !cacheKey;
}
