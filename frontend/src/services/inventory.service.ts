import { api } from './api';
import { ServiceItem, ProductItem, Category } from '../types';

export interface DeletePayload {
  reason: string;
  password: string;
}

export const inventoryService = {
  listCategories: async () => {
    const res = await api.get<{ success: boolean; data: Category[] }>('/inventory/categories');
    return res.data;
  },

  listServices: async () => {
    const res = await api.get<{ success: boolean; data: ServiceItem[] }>('/inventory/services');
    return res.data;
  },

  createService: async (service: Omit<Partial<ServiceItem>, 'variants'> & { variants?: Array<{ name: string; price: number; duration_minutes?: number }> }) => {
    const res = await api.post<{ success: boolean; message: string; data: ServiceItem }>('/inventory/services', service);
    return res.data;
  },

  updateService: async (id: string, service: Omit<Partial<ServiceItem>, 'variants'> & { variants?: Array<{ id?: string; name: string; price: number }> }) => {
    const res = await api.put<{ success: boolean; message: string; data: ServiceItem }>(`/inventory/services/${id}`, service);
    return res.data;
  },

  deleteService: async (id: string, payload: DeletePayload) => {
    const res = await api.post<{ success: boolean; message: string }>(`/inventory/services/${id}/delete`, payload);
    return res;
  },

  listProducts: async () => {
    const res = await api.get<{ success: boolean; data: ProductItem[] }>('/inventory/products');
    return res.data;
  },

  createProduct: async (product: Partial<ProductItem>) => {
    const res = await api.post<{ success: boolean; message: string; data: ProductItem }>('/inventory/products', product);
    return res.data;
  },

  updateProduct: async (id: string, product: Partial<ProductItem> | Record<string, unknown>) => {
    const res = await api.put<{ success: boolean; message: string; data: ProductItem }>(`/inventory/products/${id}`, product);
    return res.data;
  },

  deleteProduct: async (id: string, payload: DeletePayload) => {
    const res = await api.post<{ success: boolean; message: string }>(`/inventory/products/${id}/delete`, payload);
    return res;
  },

  adjustStock: async (id: string, adjustment: number) => {
    const res = await api.patch<{ success: boolean; message: string; data: ProductItem }>(`/inventory/products/${id}/stock`, { adjustment });
    return res.data;
  },
};