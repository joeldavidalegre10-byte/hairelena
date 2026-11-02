import { Request, Response, NextFunction } from 'express';
import { UtilitiesService } from './utilities.service.js';
import { AuthService } from '../auth/auth.service.js';

export class UtilitiesController {
  /** Configuración completa (pestaña Utilidad de Márgenes y ganancias). */
  static async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UtilitiesService.getConfig();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Datos livianos para el POS: qué servicios admiten utilidad y quiénes pueden ayudar. */
  static async getPosConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UtilitiesService.getPosConfig();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Monto general y/o interruptor general. Exige contraseña de administrador (igual que el margen general). */
  static async updateGeneral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminPassword = req.body.admin_password || req.body.password;

      if (!adminPassword) {
        res.status(400).json({
          success: false,
          message: 'Debe ingresar la contraseña de administrador para confirmar la operación',
        });
        return;
      }

      const isValid = await AuthService.verifyAdminPassword(adminPassword);
      if (!isValid) {
        res.status(401).json({
          success: false,
          message: 'Contraseña de administrador incorrecta. Verifique sus credenciales.',
        });
        return;
      }

      const data = await UtilitiesService.setGeneral({
        amount: req.body.amount,
        enabled: req.body.enabled,
      });
      res.json({ success: true, message: 'Utilidad general actualizada correctamente', data });
    } catch (error) {
      next(error);
    }
  }

  static async setServiceConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UtilitiesService.setServiceConfig(req.params.serviceId, {
        amount: req.body.amount,
        is_enabled: req.body.is_enabled,
      });
      res.json({ success: true, message: 'Utilidad del servicio guardada correctamente', data });
    } catch (error) {
      next(error);
    }
  }

  static async removeServiceConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UtilitiesService.removeServiceConfig(req.params.serviceId);
      res.json({
        success: true,
        message: 'Configuración específica removida. El servicio usará el monto de utilidad general.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async setStylistEnabled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UtilitiesService.setStylistEnabled(req.params.stylistId, Boolean(req.body.enabled));
      res.json({
        success: true,
        message: data.can_receive_utility
          ? 'La estilista podrá recibir utilidad como auxiliar'
          : 'La estilista ya no podrá recibir utilidad como auxiliar',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UtilitiesService.list({
        stylistId: req.query.stylist_id as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UtilitiesService.getSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
