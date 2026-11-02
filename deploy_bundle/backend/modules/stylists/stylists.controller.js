import { StylistsService } from './stylists.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AppError } from '../../middleware/errorHandler.js';
// Límite de intentos fallidos de contraseña de admin por usuario (en memoria)
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
const failedAttempts = new Map();
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
    // Eliminación (lógica) con motivo y contraseña de administrador
    static async remove(req, res, next) {
        try {
            if (!req.user)
                throw new AppError('No autenticado', 401);
            const reason = String(req.body?.reason ?? '').trim();
            const password = typeof req.body?.password === 'string' ? req.body.password : '';
            if (reason.length < 3) {
                throw new AppError('Debes indicar el motivo de la eliminación', 400);
            }
            if (!password) {
                throw new AppError('Debes ingresar la contraseña de un administrador', 400);
            }
            // Bloqueo temporal tras demasiados intentos fallidos
            const key = req.user.id;
            const state = failedAttempts.get(key);
            if (state && state.lockedUntil > Date.now()) {
                const mins = Math.ceil((state.lockedUntil - Date.now()) / 60000);
                throw new AppError(`Demasiados intentos fallidos. Intenta de nuevo en ${mins} min.`, 429);
            }
            const admin = await AuthService.verifyAdminWithUser(password);
            if (!admin) {
                const count = (state && state.lockedUntil <= Date.now() ? 0 : state?.count || 0) + 1;
                failedAttempts.set(key, {
                    count,
                    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
                });
                throw new AppError('Contraseña de administrador incorrecta', 403);
            }
            failedAttempts.delete(key);
            await StylistsService.remove(req.params.id, reason, { id: req.user.id, fullName: req.user.fullName }, { id: admin.id, fullName: admin.fullName });
            res.json({ success: true, message: 'Estilista eliminado' });
        }
        catch (error) {
            next(error);
        }
    }
}
