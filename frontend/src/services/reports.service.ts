import { api } from './api';
import { DashboardMetrics } from '../types';

export const reportsService = {
  getDashboardMetrics: async (period: string = 'day', from?: string, to?: string) => {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await api.get<{ success: boolean; data: DashboardMetrics }>(`/reports/dashboard?${params.toString()}`);
    return res.data;
  },
};
