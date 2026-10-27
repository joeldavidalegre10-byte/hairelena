import { SalesService } from './sales.service.js';
import { AuthService } from '../auth/auth.service.js';
export class SalesController {
    static async list(req, res, next) {
        try {
            const data = await SalesService.list(req.user?.id, req.user?.role);
            // Si el rol es cajero, ocultar porcentajes de ganancia, comisiones y rentabilidad interna
            if (req.user?.role === 'cashier' && Array.isArray(data)) {
                const sanitized = data.map((sale) => ({
                    ...sale,
                    items: Array.isArray(sale.items)
                        ? sale.items.map((item) => {
                            const { commission_rate, commission_amount, profit_margin_percent, profit_amount, ...rest } = item;
                            return rest;
                        })
                        : [],
                }));
                res.json({ success: true, data: sanitized });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const data = await SalesService.getById(req.params.id);
            // Si el rol es cajero, ocultar datos confidenciales de márgenes
            if (req.user?.role === 'cashier' && data) {
                const sanitized = {
                    ...data,
                    items: Array.isArray(data.items)
                        ? data.items.map((item) => {
                            const { commission_rate, commission_amount, profit_margin_percent, profit_amount, ...rest } = item;
                            return rest;
                        })
                        : [],
                };
                res.json({ success: true, data: sanitized });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const cashierId = req.user?.id || '22222222-2222-2222-2222-222222222202';
            const data = await SalesService.create(cashierId, req.body);
            res.status(201).json({ success: true, message: 'Venta registrada con éxito', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async cancel(req, res, next) {
        try {
            const adminPassword = req.body.admin_password || req.body.password;
            // Validación obligatoria de contraseña de administrador
            if (!adminPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Debe ingresar la contraseña de administrador para autorizar la anulación de la venta',
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
            const data = await SalesService.cancelSale(userId, req.params.id, req.body.reason);
            res.json({
                success: true,
                message: 'Venta anulada y corregida exitosamente',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
