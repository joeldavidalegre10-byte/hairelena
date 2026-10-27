import { api } from './api';
import { CashRegister, CashMovement } from '../types';

export const cashRegisterService = {
  getCurrent: async () => {
    const res = await api.get<{ success: boolean; data: CashRegister }>('/cash-registers/current');
    return res.data;
  },

  open: async (initialAmount: number, notes?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: CashRegister }>('/cash-registers/open', {
      initial_amount: initialAmount,
      notes,
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
