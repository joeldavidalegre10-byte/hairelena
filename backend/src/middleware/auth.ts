import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getDb } from '../db/database.js';
import { PermissionKey, resolvePermissions } from '../config/permissions.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'cashier' | 'stylist';
  fullName: string;
  permissions: PermissionKey[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'cashier' | 'stylist';
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const db = getDb();

    const user = (await db.prepare(`
      SELECT id, email, full_name, role, is_active, permissions
      FROM users
      WHERE id = ?
    `).get(decoded.id)) as { id: string; email: string; full_name: string; role: 'admin' | 'cashier' | 'stylist'; is_active: number; permissions: string | null } | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado en la base de datos',
      });
      return;
    }

    if (Number(user.is_active) !== 1) {
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
      permissions: resolvePermissions(user.role, user.permissions),
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: err.message,
    });
  }
};
