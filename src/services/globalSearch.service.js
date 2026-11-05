import apiClient from '../api/apiClient';
import { USE_MOCK_API } from '../api/apiConfig';

/**
 * Workspace search always uses Django with the active JWT and tenant RBAC.
 * Browser stores and demo fixtures are never treated as authoritative records.
 */
export const searchWorkspace = async (query, { signal } = {}) => {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  if (q.length > 100) throw new Error('Search text must be at most 100 characters.');
  if (USE_MOCK_API) throw new Error('Real workspace search requires the Django backend, not demo mode.');
  const response = await apiClient.get('/search', { params: { q }, signal });
  return Array.isArray(response?.results) ? response.results : [];
};
