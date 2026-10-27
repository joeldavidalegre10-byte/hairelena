import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { SettingsService } from './settings.service.js';
import { AuthService } from '../auth/auth.service.js';
import { getDb } from '../../db/database.js';

export class SettingsController {
  static async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SettingsService.getAll();
      data.default_profit_margin = data.default_profit_margin_percent;
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const marginVal = req.body.default_profit_margin_percent !== undefined
        ? req.body.default_profit_margin_percent
        : req.body.default_profit_margin;

      const adminPassword = req.body.admin_password || req.body.password;

      // Validación de contraseña de administrador
      if (!adminPassword) {
        res.status(400).json({
          success: false,
          message: 'Debe ingresar la contraseña de administrador para confirmar la operación',
        });
        return;
      }

      const isPasswordValid = await AuthService.verifyAdminPassword(adminPassword);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Contraseña de administrador incorrecta. Verifique sus credenciales.',
        });
        return;
      }

      if (marginVal === undefined || marginVal === null || marginVal === '') {
        res.status(400).json({
          success: false,
          message: 'El porcentaje de ganancia no puede estar vacío',
        });
        return;
      }

      const margin = Number(marginVal);
      if (isNaN(margin) || margin < 0 || margin > 100) {
        res.status(400).json({
          success: false,
          message: 'El porcentaje de ganancia general debe ser un número válido entre 0 y 100',
        });
        return;
      }

      await SettingsService.setDefaultProfitMargin(margin);

      const data = await SettingsService.getAll();
      data.default_profit_margin = data.default_profit_margin_percent;
      res.json({ success: true, message: 'Margen general de ganancia actualizado correctamente', data });
    } catch (error) {
      next(error);
    }
  }

  static async getServicesMargins(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SettingsService.getServicesWithMargins();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async toggleServiceCustom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { custom_margin_active } = req.body;
      await SettingsService.toggleServiceCustomMargin(serviceId, Boolean(custom_margin_active));
      res.json({
        success: true,
        message: Boolean(custom_margin_active)
          ? 'Configuración particular activada para el servicio'
          : 'Configuración particular desactivada. Se aplicará el margen general predeterminado.',
        data: { service_id: serviceId, custom_margin_active: Boolean(custom_margin_active) },
      });
    } catch (error) {
      next(error);
    }
  }

  static async setStylistMargin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceId, stylistId } = req.params;
      const { profit_margin_percent } = req.body;

      if (profit_margin_percent === undefined || profit_margin_percent === null || profit_margin_percent === '') {
        res.status(400).json({
          success: false,
          message: 'Debe ingresar un porcentaje de ganancia válido',
        });
        return;
      }

      const margin = Number(profit_margin_percent);
      if (isNaN(margin) || margin < 0 || margin > 100) {
        res.status(400).json({
          success: false,
          message: 'El porcentaje debe ser un número entre 0 y 100',
        });
        return;
      }

      const isActive = req.body.is_active !== undefined ? Boolean(req.body.is_active) : undefined;
      const result = await SettingsService.setServiceStylistMargin(serviceId, stylistId, margin, isActive);
      res.json({
        success: true,
        message: 'Porcentaje configurado exitosamente para el estilista',
        data: { service_id: serviceId, stylist_id: stylistId, profit_margin_percent: result.profit_margin_percent, is_active: result.is_active },
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleStylistActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceId, stylistId } = req.params;
      const { is_active } = req.body;
      const result = await SettingsService.toggleStylistMarginActive(serviceId, stylistId, Boolean(is_active));
      res.json({
        success: true,
        message: result.is_active ? 'Porcentaje individual activado' : 'Porcentaje individual desactivado (aplica margen general)',
        data: { service_id: serviceId, stylist_id: stylistId, is_active: result.is_active }
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleStylistVisibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceId, stylistId } = req.params;
      const { is_hidden } = req.body;
      await SettingsService.toggleStylistVisibility(serviceId, stylistId, Boolean(is_hidden));
      res.json({
        success: true,
        message: Boolean(is_hidden) ? 'Estilista ocultado de la vista' : 'Estilista visible en la vista',
        data: { service_id: serviceId, stylist_id: stylistId, is_hidden: Boolean(is_hidden) }
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeStylistMargin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceId, stylistId } = req.params;
      await SettingsService.removeServiceStylistMargin(serviceId, stylistId);
      res.json({
        success: true,
        message: 'Configuración individual removida. El estilista utilizará el margen general alternativo.',
      });
    } catch (error) {
      next(error);
    }
  }
}
