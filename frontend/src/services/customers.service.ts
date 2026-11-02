import { api } from './api';
import { Customer } from '../types';

export const customersService = {
  search: async (q: string, limit = 8) => {
    const res = await api.get<{ success: boolean; data: Customer[] }>('/customers', { q, limit });
    return res.data;
  },

  /** Crea el cliente o devuelve el existente (mismo teléfono): nunca lo duplica. */
  create: async (payload: { full_name: string; phone?: string; notes?: string }) => {
    const res = await api.post<{ success: boolean; data: Customer; created: boolean }>('/customers', payload);
    return { customer: res.data, created: res.created };
  },

  update: async (id: string, payload: Partial<Pick<Customer, 'full_name' | 'phone' | 'notes' | 'is_active'>>) => {
    const res = await api.put<{ success: boolean; data: Customer }>(`/customers/${id}`, payload);
    return res.data;
  },
};
