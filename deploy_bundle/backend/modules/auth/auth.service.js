import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../../db/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
// Hash falso para comparar siempre contra bcrypt, exista o no el usuario.
// Evita que el tiempo de respuesta revele qué usuarios existen.
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', 10);
const INVALID_CREDENTIALS = 'Credenciales inválidas. Verifica tu usuario y contraseña.';
export class AuthService {
    static async login(identifier, password) {
        if (!identifier || !identifier.trim()) {
            throw new AppError('Debes ingresar tu usuario', 400);
        }
        if (!password || typeof password !== 'string') {
            throw new AppError('Debes ingresar tu contraseña', 400);
        }
        const cleanIdentifier = identifier.trim();
        const db = getDb();
        const user = (await db.prepare(`
      SELECT id, username, email, password_hash, full_name, role, is_active
      FROM users
      WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(cleanIdentifier, cleanIdentifier));
        // Siempre se ejecuta una comparación bcrypt (async, no bloquea el servidor).
        const isValid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
        if (!user || !isValid) {
            throw new AppError(INVALID_CREDENTIALS, 401);
        }
        // Se informa "inactivo" solo después de validar la contraseña.
        if (Number(user.is_active) !== 1) {
            throw new AppError('Tu usuario se encuentra inactivo. Contacta a un administrador.', 403);
        }
        const token = jwt.sign({
            id: user.id,
            username: user.username || user.email,
            email: user.email,
            role: user.role,
        }, env.JWT_SECRET, {
            algorithm: 'HS256',
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d'),
        });
        return {
            token,
            user: {
                id: user.id,
                username: user.username || user.email,
                email: user.email,
                role: user.role,
                fullName: user.full_name,
            },
        };
    }
    static async getProfile(userId) {
        const db = getDb();
        const user = await db.prepare(`
      SELECT id, username, email, full_name, role, phone, is_active, created_at
      FROM users
      WHERE id = ?
    `).get(userId);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }
        return user;
    }
    /**
     * Valida la contraseña de un administrador activo para autorizar operaciones
     * sensibles (anulaciones, eliminaciones, cambios de ganancias).
     * Ya NO existe contraseña maestra: solo cuentan los hashes de la base de datos.
     */
    static async verifyAdminPassword(password) {
        if (!password || typeof password !== 'string') {
            return false;
        }
        const db = getDb();
        const adminUsers = (await db.prepare(`
      SELECT password_hash
      FROM users
      WHERE role = 'admin' AND is_active = 1
    `).all());
        for (const admin of adminUsers) {
            if (admin.password_hash && (await bcrypt.compare(password, admin.password_hash))) {
                return true;
            }
        }
        return false;
    }
}
