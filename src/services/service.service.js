import apiClient from '../api/apiClient';
import { USE_MOCK_API } from '../api/apiConfig';
import {
  getMockCategories,
  addMockCategory,
  addMockServiceType,
  getMockServices,
  addMockService,
  getMockServiceById,
  updateMockService,
  deleteMockService,
  updateMockCategory,
  deleteMockCategory
} from '../mock/services.mock';

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));
const rows = data => Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

const normalizeCategory = row => ({
  ...row,
  parentId: row.parentId ?? row.parent ?? '',
  status: row.is_active === false ? 'inactive' : row.status || 'active',
});
const normalizeService = row => ({
  ...row,
  categoryId: row.categoryId ?? (typeof row.category === 'string' && row.category.includes('-') ? row.category : ''),
  category: row.categoryName || row.category || '',
  status: row.is_active === false ? 'inactive' : row.status || 'active',
  durationMinutes: row.durationMinutes ?? Math.round(Number(row.labour_hours || 0) * 60),
  pricingType: row.pricingType || row.pricing_type || 'Fixed',
  hsnSac: row.hsnSac ?? row.hsn_sac ?? '',
  taxRate: row.taxRate ?? row.tax_rate ?? '18',
  taxTreatment: row.taxTreatment ?? row.tax_treatment ?? 'taxable',
  unit: row.unit || 'Job',
});
const categoryPayload = data => ({
  name: String(data.name || '').trim(),
  description: data.description || '',
  parentId: data.parentId || null,
  is_active: data.status !== 'inactive',
});
const servicePayload = data => ({
  name: String(data.name || '').trim(), code: String(data.code || '').trim(),
  description: data.description || '', price: data.price ?? 0,
  ...(data.categoryId ? { categoryId: data.categoryId } : {}),
  ...(data.categoryId === null ? { categoryId: null } : {}),
  ...(data.status ? { is_active: data.status !== 'inactive' } : {}),
  ...(data.pricingType ? { pricingType: data.pricingType } : {}),
  ...(data.durationMinutes !== undefined ? { labour_hours: Number((Number(data.durationMinutes || 0) / 60).toFixed(2)) } : {}),
  ...(data.checklist ? { checklist: data.checklist } : {}),
  ...(data.hsnSac !== undefined ? { hsnSac: data.hsnSac } : {}),
  ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
  ...(data.taxTreatment ? { taxTreatment: data.taxTreatment } : {}),
  ...(data.unit ? { unit: data.unit } : {}),
});

export const getServiceCategories = async () => {
  if (USE_MOCK_API) { await delay(); return getMockCategories().map(normalizeCategory); }
  return rows(await apiClient.get('/services/categories')).map(normalizeCategory);
};

export const createServiceCategory = async (data) => {
  if (USE_MOCK_API) { await delay(); return addMockCategory(data); }
  return normalizeCategory(await apiClient.post('/services/categories', categoryPayload(data)));
};

export const updateServiceCategory = async (id, data) => {
  if (USE_MOCK_API) { await delay(); return updateMockCategory(id, data); }
  return normalizeCategory(await apiClient.patch(`/services/categories/${id}`, categoryPayload(data)));
};

export const deleteServiceCategory = async (id) => {
  if (USE_MOCK_API) { await delay(); return deleteMockCategory(id); }
  return apiClient.delete(`/services/categories/${id}`);
};

export const createServiceType = async (categoryId, typeData) => {
  if (USE_MOCK_API) { await delay(); return addMockServiceType(categoryId, typeData); }
  return apiClient.post(`/services/categories/${categoryId}/types`, typeData);
};

export const getServices = async (params = {}) => {
  if (USE_MOCK_API) { await delay(); return getMockServices().map(normalizeService); }
  return rows(await apiClient.get('/services', { params })).map(normalizeService);
};

export const getServiceById = async (id) => {
  if (USE_MOCK_API) { await delay(); return getMockServiceById(id); }
  return normalizeService(await apiClient.get(`/services/${id}`));
};

export const createService = async (data) => {
  if (USE_MOCK_API) { await delay(); return addMockService(data); }
  return normalizeService(await apiClient.post('/services', servicePayload(data)));
};

export const updateService = async (id, data) => {
  if (USE_MOCK_API) { await delay(); return updateMockService(id, data); }
  return normalizeService(await apiClient.patch(`/services/${id}`, servicePayload(data)));
};

export const deleteService = async (id) => {
  if (USE_MOCK_API) { await delay(); return deleteMockService(id); }
  return apiClient.delete(`/services/${id}`);
};

export const serviceService = {
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  createServiceType,
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
