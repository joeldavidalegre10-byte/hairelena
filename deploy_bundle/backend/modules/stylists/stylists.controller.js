import { StylistsService } from './stylists.service.js';
export class StylistsController {
    static async list(req, res, next) {
        try {
            let data = await StylistsService.list();
            // Si el rol es cajero, ocultar porcentaje de comisión y márgenes individuales
            if (req.user?.role === 'cashier') {
                data = data.map((st) => {
                    const { commission_rate, ...clean } = st;
                    return clean;
                });
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            let data = await StylistsService.getById(req.params.id);
            if (req.user?.role === 'cashier' && data) {
                const { commission_rate, ...clean } = data;
                data = clean;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const data = await StylistsService.create(req.body);
            res.status(201).json({ success: true, message: 'Estilista registrado', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const data = await StylistsService.update(req.params.id, req.body);
            res.json({ success: true, message: 'Estilista actualizado', data });
        }
        catch (error) {
            next(error);
        }
    }
}
