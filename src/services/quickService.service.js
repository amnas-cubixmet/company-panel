import apiClient from '../api/apiClient';

const base = '/invoices/quick-services';

export const quickService = {
  list: () => apiClient.get(base),
  start: (payload) => apiClient.post(base, payload),
  preview: (id, items) => apiClient.post(`${base}/${id}/preview`, { items }),
  close: (id, payload) => apiClient.post(`${base}/${id}/close`, payload),
};
