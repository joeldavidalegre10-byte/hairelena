import { api } from './api';
import { StylistPendingSummary, StylistPayoutRecord } from '../types';

export const payoutsService = {
  /**
   * Obtiene la lista de estilistas con servicios pendientes de pago
   */
  getPendingByStylist: async (search?: string): Promise<StylistPendingSummary[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await api.get<{ success: boolean; data: StylistPendingSummary[] }>(`/commissions/pending${params}`);
    return res.data || [];
  },

  /**
   * Registra el pago a un estilista ("Pagar ahora")
   */
  createPayout: async (stylistId: string, notes?: string): Promise<StylistPayoutRecord> => {
    const res = await api.post<{ success: boolean; message: string; data: StylistPayoutRecord }>('/commissions/payouts', {
      stylist_id: stylistId,
      notes,
    });
    return res.data;
  },

  /**
   * Obtiene el historial de pagos realizados (Sección "Pagados")
   */
  listPayouts: async (stylistId?: string, search?: string): Promise<StylistPayoutRecord[]> => {
    const queryParts: string[] = [];
    if (stylistId) queryParts.push(`stylist_id=${encodeURIComponent(stylistId)}`);
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await api.get<{ success: boolean; data: StylistPayoutRecord[] }>(`/commissions/payouts${qs}`);
    return res.data || [];
  },

  /**
   * Obtiene el detalle de un pago específico
   */
  getPayoutById: async (payoutId: string): Promise<StylistPayoutRecord> => {
    const res = await api.get<{ success: boolean; data: StylistPayoutRecord }>(`/commissions/payouts/${payoutId}`);
    return res.data;
  },

  /**
   * 3.1 Revertir pago histórico
   */
  revertPayout: async (payoutId: string, adminPassword: string, reason?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>(
      `/commissions/payouts/${payoutId}/revert`,
      { admin_password: adminPassword, reason }
    );
    return res.data;
  },

  /**
   * 3.2 Eliminar un servicio pendiente individual
   */
  deletePendingCommission: async (commissionId: string, adminPassword: string, reason?: string) => {
    const res = await api.delete<{ success: boolean; message: string; data: any }>(
      `/commissions/pending/${commissionId}`,
      { admin_password: adminPassword, reason }
    );
    return res.data;
  },

  /**
   * 3.3 Eliminar todos los servicios pendientes de un estilista
   */
  deleteAllPendingByStylist: async (stylistId: string, adminPassword: string, reason?: string) => {
    const res = await api.delete<{ success: boolean; message: string; data: any }>(
      `/commissions/stylists/${stylistId}/pending`,
      { admin_password: adminPassword, reason }
    );
    return res.data;
  },
};
