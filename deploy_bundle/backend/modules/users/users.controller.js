import { UsersService } from './users.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AppError } from '../../middleware/errorHandler.js';
// Límite de intentos fallidos de contraseña de admin por usuario (en memoria)
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
const failedAttempts = new Map();
const actorOf = (req) => req.user ? { id: req.user.id, fullName: req.user.fullName } : undefined;
export class UsersController {
    static async list(_req, res, next) {
        try {
            const users = await UsersService.list();
            res.json({ success: true, data: users });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const user = await UsersService.getById(req.params.id);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const created = await UsersService.create(req.body, actorOf(req));
            res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: created });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const updated = await UsersService.update(req.params.id, req.body, actorOf(req));
            res.json({ success: true, message: 'Usuario actualizado exitosamente', data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    // Eliminación definitiva: exige la contraseña de un administrador y queda en auditoría
    static async remove(req, res, next) {
        try {
            if (!req.user)
                throw new AppError('No autenticado', 401);
            const password = typeof req.body?.password === 'string' ? req.body.password : '';
            if (!password) {
                throw new AppError('Debes ingresar la contraseña de un administrador', 400);
            }
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
            await UsersService.remove(req.params.id, { id: req.user.id, fullName: req.user.fullName }, { id: admin.id, fullName: admin.fullName });
            res.json({ success: true, message: 'Usuario eliminado' });
        }
        catch (error) {
            next(error);
        }
    }
}
