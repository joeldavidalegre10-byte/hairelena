import { api } from './api';
import { SystemSettings, ServiceWithMargins } from '../types';

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    const res = await api.get<{ success: boolean; data: SystemSettings }>('/settings');
    return res.data;
  },

  async updateGeneralMargin(margin: number, adminPassword: string): Promise<SystemSettings> {
    const res = await api.put<{ success: boolean; message: string; data: SystemSettings }>('/settings', {
      default_profit_margin_percent: margin,
      admin_password: adminPassword,
    });
    return res.data;
  },

  async getServicesMargins(): Promise<ServiceWithMargins[]> {
    const res = await api.get<{ success: boolean; data: ServiceWithMargins[] }>('/settings/services-margins');
    return res.data;
  },

  async toggleServiceCustom(serviceId: string, customMarginActive: boolean): Promise<any> {
    const res = await api.put<{ success: boolean; message: string; data: any }>(`/settings/services/${serviceId}/toggle`, {
      custom_margin_active: customMarginActive,
    });
    return res.data;
  },

  async setStylistMargin(serviceId: string, stylistId: string, margin: number, isActive: boolean = true): Promise<any> {
    const res = await api.put<{ success: boolean; message: string; data: any }>(`/settings/services/${serviceId}/stylists/${stylistId}`, {
      profit_margin_percent: margin,
      is_active: isActive,
    });
    return res.data;
  },

  async toggleStylistActive(serviceId: string, stylistId: string, isActive: boolean): Promise<any> {
    const res = await api.put<{ success: boolean; message: string; data: any }>(`/settings/services/${serviceId}/stylists/${stylistId}/active`, {
      is_active: isActive,
    });
    return res.data;
  },

  async toggleStylistVisibility(serviceId: string, stylistId: string, isHidden: boolean): Promise<any> {
    const res = await api.put<{ success: boolean; message: string; data: any }>(`/settings/services/${serviceId}/stylists/${stylistId}/visibility`, {
      is_hidden: isHidden,
    });
    return res.data;
  },

  async removeStylistMargin(serviceId: string, stylistId: string): Promise<any> {
    const res = await api.delete<{ success: boolean; message: string }>(`/settings/services/${serviceId}/stylists/${stylistId}`);
    return res;
  },
};
