import apiClient from '../api/apiClient';
import { USE_MOCK_API } from '../api/apiConfig';

const root = '/inventory/procurement';

const requireLiveBackend = () => {
  if (USE_MOCK_API) {
    throw new Error('Supplier credit accounting requires the live Django backend. Disable mock mode.');
  }
};

const live = async (method, path, data) => {
  requireLiveBackend();
  return apiClient({ method, url: root + path, ...(data === undefined ? {} : { data }) });
};

export const supplierFinanceService = {
  getSuppliers: async () => {
    requireLiveBackend();
    const data = await apiClient.get('/inventory/suppliers');
    return Array.isArray(data) ? data : data?.results || [];
  },
  addSupplier: (payload) => {
    requireLiveBackend();
    return apiClient.post('/inventory/suppliers', payload);
  },
  getAccounts: () => live('get', '/accounts'),
  createAccount: (payload) => live('post', '/accounts', payload),
  getAccountLedger: (id) => live('get', `/accounts/${encodeURIComponent(id)}/ledger`),
  getBills: (supplier) => live('get', '/bills' + (supplier ? `?supplier=${encodeURIComponent(supplier)}` : '')),
  createBill: (payload) => live('post', '/bills', payload),
  postBill: (id) => live('post', `/bills/${encodeURIComponent(id)}/post`, {}),
  getPayments: (supplier) => live('get', '/payments' + (supplier ? `?supplier=${encodeURIComponent(supplier)}` : '')),
  recordPayment: (payload) => live('post', '/payments', payload),
  applyAdvance: (id, payload) => live('post', `/payments/${encodeURIComponent(id)}/allocate`, payload),
  getSupplierSummary: (id) => live('get', `/suppliers/${encodeURIComponent(id)}/summary`),
  getSupplierLedger: (id) => live('get', `/suppliers/${encodeURIComponent(id)}/ledger`),
  getInventoryItems: async () => {
    requireLiveBackend();
    const response = await apiClient.get('/inventory/items');
    return Array.isArray(response) ? response : response?.results || [];
  },
};
