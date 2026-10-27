import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getDb } from '../db/database.js';
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Token de autorización no proporcionado o formato inválido',
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const db = getDb();
        const user = (await db.prepare(`
      SELECT id, email, full_name, role, is_active
      FROM users
      WHERE id = ?
    `).get(decoded.id));
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no encontrado en la base de datos',
            });
            return;
        }
        if (user.is_active !== 1) {
            res.status(403).json({
                success: false,
                message: 'Usuario inactivo. Contacte al administrador.',
            });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.full_name,
        };
        next();
    }
    catch (err) {
        res.status(401).json({
            success: false,
            message: 'Token inválido o expirado',
            error: err.message,
        });
    }
};
