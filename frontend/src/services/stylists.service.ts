import { api } from './api';
import { Stylist } from '../types';

export const stylistsService = {
  list: async () => {
    const res = await api.get<{ success: boolean; data: Stylist[] }>('/stylists');
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: Stylist }>(`/stylists/${id}`);
    return res.data;
  },

  create: async (stylist: Partial<Stylist>) => {
    const res = await api.post<{ success: boolean; message: string; data: Stylist }>('/stylists', stylist);
    return res.data;
  },

  update: async (id: string, stylist: Partial<Stylist>) => {
    const res = await api.put<{ success: boolean; message: string; data: Stylist }>(`/stylists/${id}`, stylist);
    return res.data;
  },
};
