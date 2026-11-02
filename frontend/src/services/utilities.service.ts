import { api } from './api';
import { PosUtilityConfig, UtilityConfig, UtilityRecord, UtilitySummary } from '../types';

type Res<T> = { success: boolean; message?: string; data: T };

export const utilitiesService = {
  getConfig: async (): Promise<UtilityConfig> => (await api.get<Res<UtilityConfig>>('/utilities/config')).data,

  getPosConfig: async (): Promise<PosUtilityConfig> =>
    (await api.get<Res<PosUtilityConfig>>('/utilities/pos-config')).data,

  updateGeneral: async (
    input: { amount?: number; enabled?: boolean },
    adminPassword: string
  ): Promise<{ amount: number; enabled: boolean }> =>
    (await api.put<Res<{ amount: number; enabled: boolean }>>('/utilities/general', {
      ...input,
      admin_password: adminPassword,
    })).data,

  setServiceConfig: async (serviceId: string, input: { amount?: number; is_enabled?: boolean }) =>
    (await api.put<Res<any>>(`/utilities/services/${serviceId}`, input)).data,

  removeServiceConfig: async (serviceId: string) => {
    await api.delete<Res<null>>(`/utilities/services/${serviceId}`);
  },

  setStylistEnabled: async (stylistId: string, enabled: boolean) =>
    (await api.put<Res<any>>(`/utilities/stylists/${stylistId}`, { enabled })).data,

  list: async (status?: string): Promise<UtilityRecord[]> =>
    (await api.get<Res<UtilityRecord[]>>('/utilities', { status })).data,

  summary: async (): Promise<UtilitySummary> => (await api.get<Res<UtilitySummary>>('/utilities/summary')).data,

  cancelPending: async (utilityId: string, adminPassword: string, reason?: string) =>
    (await api.delete<Res<any>>(`/commissions/utilities/${utilityId}`, { admin_password: adminPassword, reason })).data,
};
