import apiClient from '../api/apiClient';
import { USE_MOCK_API } from '../api/apiConfig';
import { supplierService } from './supplier.service';

const requireBackend = () => {
  if (USE_MOCK_API) {
    throw new Error('Supplier credit records require the live Django backend. Mock supplier balances and payments are disabled.');
  }
};
const rows = data => Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);

export const supplierFinanceService = {
  suppliers: async () => { requireBackend(); return rows(await supplierService.list()); },
  purchases: async () => { requireBackend(); return rows(await supplierService.purchaseOrders()); },
  credits: async () => { requireBackend(); return rows(await apiClient.get('/stock/supplier-credits')); },
  payments: async () => { requireBackend(); return rows(await apiClient.get('/stock/supplier-payments')); },
  registerCredit: async (payload) => {
    requireBackend();
    return apiClient.post('/stock/supplier-credits', payload);
  },
  recordPayment: async (payload) => {
    requireBackend();
    return apiClient.post('/stock/supplier-payments', payload);
  },
};
