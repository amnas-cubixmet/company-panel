import apiClient from '../api/apiClient';

const BASE = '/finance';

export const financeService = {
  getDashboard: () => apiClient.get(`${BASE}/dashboard`),

  // Accounts
  listAccounts: (params = {}) => apiClient.get(`${BASE}/accounts`, { params }),
  createAccount: (data) => apiClient.post(`${BASE}/accounts`, data),
  getAccount: (id) => apiClient.get(`${BASE}/accounts/${id}`),
  updateAccount: (id, data) => apiClient.patch(`${BASE}/accounts/${id}`, data),
  adjustBalance: (id, data) => apiClient.post(`${BASE}/accounts/${id}/adjust`, data),

  // Transfers
  listTransfers: () => apiClient.get(`${BASE}/transfers`),
  createTransfer: (data) => apiClient.post(`${BASE}/transfers`, data),

  // Ledger
  getLedger: (params = {}) => apiClient.get(`${BASE}/ledger`, { params }),
  exportLedgerCSV: (params = {}) => {
    const q = new URLSearchParams({ ...params, export: 'csv' }).toString();
    window.open(`/api/v1/finance/ledger?${q}`, '_blank');
  },

  // Reports
  getReports: (params = {}) => apiClient.get(`${BASE}/reports`, { params }),
};

