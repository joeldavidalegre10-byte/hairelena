import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';

export class ReportsController {
  static async dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || 'day';
      const data = await ReportsService.getDashboardMetrics(period);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
