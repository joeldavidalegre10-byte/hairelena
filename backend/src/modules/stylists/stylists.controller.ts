import { Request, Response, NextFunction } from 'express';
import { StylistsService } from './stylists.service.js';

export class StylistsController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let data = await StylistsService.list();

      // Si el rol es cajero, ocultar porcentaje de comisión y márgenes individuales
      if (req.user?.role === 'cashier') {
        data = data.map((st: any) => {
          const { commission_rate, ...clean } = st;
          return clean;
        });
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let data = await StylistsService.getById(req.params.id);

      if (req.user?.role === 'cashier' && data) {
        const { commission_rate, ...clean } = data as any;
        data = clean;
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await StylistsService.create(req.body);
      res.status(201).json({ success: true, message: 'Estilista registrado', data });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await StylistsService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Estilista actualizado', data });
    } catch (error) {
      next(error);
    }
  }
}
