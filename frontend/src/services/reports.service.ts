import { api } from './api';
import { DashboardMetrics } from '../types';

export const reportsService = {
  getDashboardMetrics: async (period: string = 'day') => {
    const res = await api.get<{ success: boolean; data: DashboardMetrics }>(`/reports/dashboard?period=${period}`);
    return res.data;
  },
};
