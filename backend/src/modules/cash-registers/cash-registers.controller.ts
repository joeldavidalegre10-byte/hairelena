import { Request, Response, NextFunction } from 'express';
import { CashRegistersService } from './cash-registers.service.js';
import { AuthService } from '../auth/auth.service.js';

export class CashRegistersController {
  static async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CashRegistersService.getCurrent();
      if (!data) {
        res.json({ success: true, data: null });
        return;
      }

      // Si el usuario autenticado es cajero, ocultar importes financieros acumulados
      if (req.user?.role === 'cashier') {
        const sanitized = {
          id: data.id,
          name: data.name,
          status: data.status,
          opened_at: data.opened_at,
          initial_amount: 0,
          expected_amount: 0,
          actual_amount: 0,
          difference: 0,
        };
        res.json({ success: true, data: sanitized });
        return;
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async open(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '22222222-2222-2222-2222-222222222202';
      const initialAmount = Number(req.body.initial_amount) || 0;
      const data = await CashRegistersService.open(userId, initialAmount, req.body.notes);
      res.status(201).json({ success: true, message: 'Caja abierta exitosamente', data });
    } catch (error) {
      next(error);
    }
  }

  static async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '22222222-2222-2222-2222-222222222202';
      const actualAmount = Number(req.body.actual_amount) || 0;
      const data = await CashRegistersService.close(userId, req.params.id, actualAmount, req.body.notes);
      res.json({ success: true, message: 'Caja cerrada / Corte realizado exitosamente', data });
    } catch (error) {
      next(error);
    }
  }

  static async addMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '22222222-2222-2222-2222-222222222202';
      const { type, amount, reason } = req.body;
      const data = await CashRegistersService.addMovement(userId, req.params.id, type, Number(amount), reason);
      res.status(201).json({ success: true, message: 'Movimiento registrado', data });
    } catch (error) {
      next(error);
    }
  }

  static async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CashRegistersService.listMovements(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminPassword = req.body.admin_password || req.body.password;

      // Validación estricta de contraseña de administrador
      if (!adminPassword) {
        res.status(400).json({
          success: false,
          message: 'Debe ingresar la contraseña de administrador para autorizar la eliminación del movimiento',
        });
        return;
      }

      const isValid = AuthService.verifyAdminPassword(adminPassword);
      if (!isValid) {
        res.status(401).json({
          success: false,
          message: 'Contraseña de administrador incorrecta. Verifique sus credenciales.',
        });
        return;
      }

      const userId = req.user?.id || '22222222-2222-2222-2222-222222222202';
      const movementId = req.params.movementId || req.params.id;
      const result = await CashRegistersService.deleteMovement(userId, movementId, req.body.reason);

      res.json({
        success: true,
        message: 'Movimiento de caja eliminado exitosamente',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
