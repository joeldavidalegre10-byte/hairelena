import { ReportsService } from './reports.service.js';
export class ReportsController {
    static async dashboard(req, res, next) {
        try {
            const period = req.query.period || 'day';
            const data = await ReportsService.getDashboardMetrics(period);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
