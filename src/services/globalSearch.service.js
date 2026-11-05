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
  try {
    // Exact existing Django path: /api/v1/search (without trailing slash).
    const response = await apiClient.get('/search', { params: { q }, signal });
    if (!Array.isArray(response?.results)) {
      throw new Error('The workshop search API returned an invalid response.');
    }
    return response.results;
  } catch (error) {
    if (error?.status === 404) {
      throw new Error(
        'Search API returned 404. Check that VITE_API_URL includes /api/v1 and the deployed Django backend exposes /api/v1/search.'
      );
    }
    throw error;
  }
};
