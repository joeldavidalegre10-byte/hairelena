import { api } from './api';
import { Sale } from '../types';

export interface CreateSalePayload {
  register_id?: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'mixed';
  payment_details?: any;
  discount?: number;
  notes?: string;
  items: Array<{
    item_type: 'service' | 'product';
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    stylist_id?: string;
  }>;
}

export const salesService = {
  list: async () => {
    const res = await api.get<{ success: boolean; data: Sale[] }>('/sales');
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: Sale }>(`/sales/${id}`);
    return res.data;
  },

  create: async (payload: CreateSalePayload) => {
    const res = await api.post<{ success: boolean; message: string; data: Sale }>('/sales', payload);
    return res.data;
  },

  cancel: async (id: string, adminPassword: string, reason?: string) => {
    const res = await api.delete<{ success: boolean; message: string; data: Sale }>(`/sales/${id}`, {
      admin_password: adminPassword,
      reason,
    });
    return res.data;
  },
};
