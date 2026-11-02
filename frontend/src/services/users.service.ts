import { api } from './api';
import { User, PermissionKey } from '../types';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'cashier' | 'stylist';
  full_name?: string;
  phone?: string;
  permissions?: PermissionKey[];
}

export interface UpdateUserData {
  username?: string;
  full_name?: string;
  role?: 'admin' | 'cashier' | 'stylist';
  phone?: string;
  is_active?: boolean;
  password?: string;
  permissions?: PermissionKey[];
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

  update: async (id: string, data: UpdateUserData) => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/users/${id}`, data);
    return res.data;
  },

  remove: async (id: string, password: string) => {
    await api.delete<{ success: boolean; message: string }>(`/users/${id}`, { password });
  },
};
