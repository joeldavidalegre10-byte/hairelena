import { api } from './api';
import { User } from '../types';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'cashier' | 'stylist';
  full_name?: string;
  phone?: string;
}

export const usersService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: User[] }>('/users');
    return res.data || [];
  },

  create: async (data: CreateUserData) => {
    const res = await api.post<{ success: boolean; message: string; data: User }>('/users', data);
    return res.data;
  },

  update: async (id: string, data: Partial<User> & { password?: string }) => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/users/${id}`, data);
    return res.data;
  },
};
