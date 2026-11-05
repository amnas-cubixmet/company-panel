import apiClient from '../api/apiClient';
import { USE_MOCK_API } from '../api/apiConfig';
import { stockSuppliersMock, stockMockItems, stockPurchasesMock } from '../mock/stock.mock';

const asList = (result) => Array.isArray(result) ? result : (result?.results || []);
const base = '/stock/suppliers';

export const supplierService = {
  async list() {
    if (USE_MOCK_API) return [...stockSuppliersMock];
    return asList(await apiClient.get(base));
  },
  async get(id) {
    if (USE_MOCK_API) {
      const supplier = stockSuppliersMock.find(row => String(row.id) === String(id));
      if (!supplier) throw new Error('Supplier not found.');
      return supplier;
    }
    return apiClient.get(base + '/' + encodeURIComponent(id));
  },
  async create(payload) {
    if (USE_MOCK_API) throw new Error('Creating a supplier requires the live backend.');
    return apiClient.post(base, payload);
  },
  async update(id, payload) {
    if (USE_MOCK_API) throw new Error('Editing a supplier requires the live backend.');
    return apiClient.patch(base + '/' + encodeURIComponent(id), payload);
  },
  async remove(id) {
    if (USE_MOCK_API) throw new Error('Deleting a supplier requires the live backend.');
    return apiClient.delete(base + '/' + encodeURIComponent(id));
  },
  async purchaseOrders() {
    if (USE_MOCK_API) return [...stockPurchasesMock];
    return asList(await apiClient.get('/stock/purchase-orders'));
  },
  async products() {
    if (USE_MOCK_API) return [...stockMockItems];
    return asList(await apiClient.get('/stock'));
  },
};
export default supplierService;
