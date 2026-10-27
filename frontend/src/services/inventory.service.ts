import { api } from './api';
import { ServiceItem, ProductItem, Category } from '../types';

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

  updateService: async (id: string, service: Partial<ServiceItem>) => {
    const res = await api.put<{ success: boolean; message: string; data: ServiceItem }>(`/inventory/services/${id}`, service);
    return res.data;
  },

  listProducts: async () => {
    const res = await api.get<{ success: boolean; data: ProductItem[] }>('/inventory/products');
    return res.data;
  },

  createProduct: async (product: Partial<ProductItem>) => {
    const res = await api.post<{ success: boolean; message: string; data: ProductItem }>('/inventory/products', product);
    return res.data;
  },

  updateProduct: async (id: string, product: Partial<ProductItem>) => {
    const res = await api.put<{ success: boolean; message: string; data: ProductItem }>(`/inventory/products/${id}`, product);
    return res.data;
  },

  adjustStock: async (id: string, adjustment: number) => {
    const res = await api.patch<{ success: boolean; message: string; data: ProductItem }>(`/inventory/products/${id}/stock`, { adjustment });
    return res.data;
  },
};
