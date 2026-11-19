import { inventoryScope, offlineSessionDeadline, scopeKey } from './session.js';

const STORAGE_KEY = 'cubixgear:verified-feature-access:v1';

const identity = (user) => scopeKey(inventoryScope(user));

// This is a copy of server-authorized permissions, not a new permission grant.
// Access is limited to the original user/company/branch and JWT expiry.
export function rememberFeatureAccess(user, access) {
  const key = identity(user);
  const deadline = offlineSessionDeadline(user);
  if (!key || deadline <= Date.now() || access?.unavailable ||
      !Array.isArray(access.permissions) || !Array.isArray(access.modules)) return;
  const labelExpiry = access.labelOnly && access.nextLabelExpiryAt
    ? Date.parse(access.nextLabelExpiryAt) : Infinity;
  const expiresAt = Math.min(deadline, Number.isFinite(labelExpiry) ? labelExpiry : Infinity);
  if (expiresAt <= Date.now()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      key, expiresAt, access: {
        ...access, loading: false, unavailable: false,
      },
    }));
  } catch { /* Offline browsing still works without persisted permissions. */ }
}

export function readFeatureAccess(user) {
  try {
    const key = identity(user);
    if (!key || offlineSessionDeadline(user) <= Date.now()) return null;
    const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!record || record.key !== key || record.expiresAt <= Date.now()) return null;
    if (String(record.access?.companyId) !== String(user?.company?.id)) return null;
    if (!Array.isArray(record.access?.permissions) || !Array.isArray(record.access?.modules)) return null;
    return { ...record.access, userKey: String(user.id) + ':' + String(user.companyId || user.company?.id || '') };
  } catch {
    return null;
  }
}

export function forgetFeatureAccess() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore blocked storage */ }
}
