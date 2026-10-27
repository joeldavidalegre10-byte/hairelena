import { api, setToken, removeToken } from './api';
import { User } from '../types';

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export const authService = {
  login: async (username: string, password?: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { username, password });
    if (res.data?.token) {
      setToken(res.data.token);
    }
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data;
  },

  logout: () => {
    removeToken();
  },
};
