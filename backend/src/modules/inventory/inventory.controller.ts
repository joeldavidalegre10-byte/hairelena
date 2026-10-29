import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service.js';
import { AuthService } from '../auth/auth.service.js'; // Ajusta la ruta si tu auth.service está en otra carpeta
import { AppError } from '../../middleware/errorHandler.js';

// Límite de intentos fallidos de contraseña de admin por usuario (en memoria)
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

export class InventoryController {
  static async listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.listCategories();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let data = await InventoryService.listServices();

      // Si el usuario es cajero, ocultar porcentajes de ganancia, costos y configuración de margen
      if (req.user?.role === 'cashier') {
        data = data.map((srv: any) => {
          const { profit_margin_percent, cost, custom_margin_active, ...clean } = srv;
          return clean;
        });
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.createService(req.body);
      res.status(201).json({ success: true, message: 'Servicio creado', data });
    } catch (error) {
      next(error);
    }
  }

  static async updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.updateService(req.params.id, req.body);
      res.json({ success: true, message: 'Servicio actualizado', data });
    } catch (error) {
      next(error);
    }
  }

  static async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let data = await InventoryService.listProducts();

      // Si el usuario es cajero, ocultar el precio de costo del producto
      if (req.user?.role === 'cashier') {
        data = data.map((prd: any) => {
          const { cost_price, ...clean } = prd;
          return clean;
        });
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.createProduct(req.body);
      res.status(201).json({ success: true, message: 'Producto registrado', data });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await InventoryService.updateProduct(req.params.id, req.body);
      res.json({ success: true, message: 'Producto actualizado', data });
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adjustment = Number(req.body.adjustment) || 0;
      const data = await InventoryService.adjustStock(req.params.id, adjustment);
      res.json({ success: true, message: 'Stock actualizado', data });
    } catch (error) {
      next(error);
    }
  }

  // Eliminación (lógica) con motivo y contraseña de administrador
  private static async handleDelete(
    kind: 'service' | 'product',
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw new AppError('No autenticado', 401);

      const reason = String(req.body?.reason ?? '').trim();
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (reason.length < 3) {
        throw new AppError('Debes indicar el motivo de la eliminación', 400);
      }
      if (!password) {
        throw new AppError('Debes ingresar la contraseña de un administrador', 400);
      }

      // Bloqueo temporal tras demasiados intentos fallidos
      const key = req.user.id;
      const state = failedAttempts.get(key);
      if (state && state.lockedUntil > Date.now()) {
        const mins = Math.ceil((state.lockedUntil - Date.now()) / 60000);
        throw new AppError(`Demasiados intentos fallidos. Intenta de nuevo en ${mins} min.`, 429);
      }

      const admin = await AuthService.verifyAdminWithUser(password);
      if (!admin) {
        const count = (state && state.lockedUntil <= Date.now() ? 0 : state?.count || 0) + 1;
        failedAttempts.set(key, {
          count,
          lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
        });
        throw new AppError('Contraseña de administrador incorrecta', 403);
      }
      failedAttempts.delete(key);

      const result = await InventoryService.deactivateItem(
        kind,
        req.params.id,
        reason,
        { id: req.user.id, fullName: req.user.fullName },
        { id: admin.id, fullName: admin.fullName }
      );

      res.json({
        success: true,
        message: kind === 'service' ? 'Servicio eliminado' : 'Producto eliminado',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
    return InventoryController.handleDelete('service', req, res, next);
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    return InventoryController.handleDelete('product', req, res, next);
  }
}