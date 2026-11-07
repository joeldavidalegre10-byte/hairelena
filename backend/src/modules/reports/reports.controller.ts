import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';

export class ReportsController {
  static async dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || 'day';
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const data = await ReportsService.getDashboardMetrics(period, from, to);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
