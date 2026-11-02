import { api } from './api';
import { CashRegister, CashMovement, EligibleCashUser } from '../types';

export const cashRegisterService = {
  getCurrent: async () => {
    const res = await api.get<{ success: boolean; data: CashRegister }>('/cash-registers/current');
    return res.data;
  },

  /** Solo administrador: cajas de todos los usuarios. */
  listAll: async (filters?: { status?: 'open' | 'closed'; userId?: string }) => {
    const res = await api.get<{ success: boolean; data: CashRegister[] }>('/cash-registers', {
      status: filters?.status,
      user_id: filters?.userId,
    });
    return res.data;
  },

  getById: async (registerId: string) => {
    const res = await api.get<{ success: boolean; data: CashRegister }>(`/cash-registers/${registerId}`);
    return res.data;
  },

  /** Usuarios a los que el admin puede habilitarles una caja. */
  listEligibleUsers: async () => {
    const res = await api.get<{ success: boolean; data: EligibleCashUser[] }>('/cash-registers/eligible-users');
    return res.data;
  },

  /** `userId` solo lo respeta el servidor si quien llama es administrador. */
  open: async (initialAmount: number, notes?: string, userId?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: CashRegister }>('/cash-registers/open', {
      initial_amount: initialAmount,
      notes,
      user_id: userId,
    });
    return res.data;
  },

  close: async (registerId: string, actualAmount: number, notes?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: CashRegister }>(`/cash-registers/${registerId}/close`, {
      actual_amount: actualAmount,
      notes,
    });
    return res.data;
  },

  listMovements: async (registerId: string) => {
    const res = await api.get<{ success: boolean; data: CashMovement[] }>(`/cash-registers/${registerId}/movements`);
    return res.data;
  },

  addMovement: async (registerId: string, type: 'in' | 'out', amount: number, reason: string) => {
    const res = await api.post<{ success: boolean; message: string; data: CashMovement }>(`/cash-registers/${registerId}/movements`, {
      type,
      amount,
      reason,
    });
    return res.data;
  },

  deleteMovement: async (movementId: string, adminPassword: string, reason?: string) => {
    const res = await api.delete<{ success: boolean; message: string; data: any }>(`/cash-registers/movements/${movementId}`, {
      admin_password: adminPassword,
      reason,
    });
    return res.data;
  },
};
