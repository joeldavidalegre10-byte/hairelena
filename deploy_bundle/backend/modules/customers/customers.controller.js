import { CustomersService } from './customers.service.js';
export class CustomersController {
    static async list(req, res, next) {
        try {
            const data = await CustomersService.list({
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                includeInactive: req.query.include_inactive === '1',
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const data = await CustomersService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const { customer, created } = await CustomersService.create(req.body || {});
            res.status(created ? 201 : 200).json({
                success: true,
                message: created ? 'Cliente creado' : 'Ese cliente ya existía; se usó el registro existente',
                data: customer,
                created,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const data = await CustomersService.update(req.params.id, req.body || {});
            res.json({ success: true, message: 'Cliente actualizado', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async merge(req, res, next) {
        try {
            const data = await CustomersService.merge(req.params.id, String(req.body?.target_id || ''));
            res.json({ success: true, message: 'Clientes unidos', data });
        }
        catch (error) {
            next(error);
        }
    }
}
