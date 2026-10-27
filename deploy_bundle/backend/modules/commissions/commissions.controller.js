import { CommissionsService } from './commissions.service.js';
import { AuthService } from '../auth/auth.service.js';
export class CommissionsController {
    /**
     * Obtiene la lista de estilistas con servicios pendientes de pago
     */
    static async getPendingByStylist(req, res, next) {
        try {
            const search = req.query.search;
            const data = await CommissionsService.getPendingByStylist(search);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Ejecuta el pago para un estilista ("Pagar ahora")
     */
    static async createPayout(req, res, next) {
        try {
            const { stylist_id, notes } = req.body;
            const data = await CommissionsService.createPayout(stylist_id, notes);
            res.status(201).json({
                success: true,
                message: 'Pago al profesional registrado exitosamente',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Obtiene el historial de pagos realizados (Sección "Pagados")
     */
    static async listPayouts(req, res, next) {
        try {
            const stylistId = req.query.stylist_id;
            const search = req.query.search;
            const data = await CommissionsService.listPayouts(stylistId, search);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Obtiene el detalle de un pago específico
     */
    static async getPayoutById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await CommissionsService.getPayoutById(id);
            if (!data) {
                res.status(404).json({ success: false, message: 'Registro de pago no encontrado' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async list(req, res, next) {
        try {
            const stylistId = req.query.stylist_id;
            const status = req.query.status;
            const data = await CommissionsService.list(stylistId, status);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async markAsPaid(req, res, next) {
        try {
            const { ids, notes } = req.body;
            const result = await CommissionsService.markAsPaid(ids || [], notes);
            res.json({ success: true, message: 'Comisiones marcadas como pagadas', data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async summary(_req, res, next) {
        try {
            const data = await CommissionsService.getSummary();
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * 3.1. Revertir pago: Anula el pago histórico y devuelve sus servicios a 'Por pagar'
     */
    static async revertPayout(req, res, next) {
        try {
            const adminPassword = req.body.admin_password || req.body.password;
            if (!adminPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Debe ingresar la contraseña de administrador para autorizar la reversión del pago',
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
            const userId = req.user?.id || 'u-admin-01';
            const data = await CommissionsService.revertPayout(userId, req.params.id, req.body.reason);
            res.json({
                success: true,
                message: 'Pago revertido exitosamente. Los servicios han vuelto a la sección de pendientes.',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * 3.2. Eliminar un servicio pendiente individual
     */
    static async deletePendingCommission(req, res, next) {
        try {
            const adminPassword = req.body.admin_password || req.body.password;
            if (!adminPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Debe ingresar la contraseña de administrador para autorizar la exclusión del servicio',
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
            const userId = req.user?.id || 'u-admin-01';
            const data = await CommissionsService.deletePendingCommission(userId, req.params.id, req.body.reason);
            res.json({
                success: true,
                message: 'Servicio excluido exitosamente de la liquidación del profesional',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * 3.3. Eliminar todos los servicios pendientes de un estilista
     */
    static async deleteAllPendingByStylist(req, res, next) {
        try {
            const adminPassword = req.body.admin_password || req.body.password;
            if (!adminPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Debe ingresar la contraseña de administrador para autorizar la eliminación de pendientes',
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
            const userId = req.user?.id || 'u-admin-01';
            const data = await CommissionsService.deleteAllPendingByStylist(userId, req.params.stylistId, req.body.reason);
            res.json({
                success: true,
                message: 'Todos los servicios pendientes del estilista fueron eliminados exitosamente',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
