import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../../db/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { resolvePermissions } from '../../config/permissions.js';

// Hash falso para comparar siempre contra bcrypt, exista o no el usuario.
// Evita que el tiempo de respuesta revele qué usuarios existen.
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', 10);

const INVALID_CREDENTIALS = 'Credenciales inválidas. Verifica tu usuario y contraseña.';

export class AuthService {
  static async login(identifier: string, password?: string) {
    if (!identifier || !identifier.trim()) {
      throw new AppError('Debes ingresar tu usuario', 400);
    }
    if (!password || typeof password !== 'string') {
      throw new AppError('Debes ingresar tu contraseña', 400);
    }

    const cleanIdentifier = identifier.trim();
    const db = getDb();
    const user = (await db.prepare(`
      SELECT id, username, email, password_hash, full_name, role, is_active, permissions
      FROM users
      WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(cleanIdentifier, cleanIdentifier)) as {
      id: string;
      username?: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: 'admin' | 'cashier' | 'stylist';
      is_active: number;
      permissions?: string | null;
    } | undefined;

    // Siempre se ejecuta una comparación bcrypt (async, no bloquea el servidor).
    const isValid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

    if (!user || !isValid) {
      throw new AppError(INVALID_CREDENTIALS, 401);
    }

    // Se informa "inactivo" solo después de validar la contraseña.
    if (Number(user.is_active) !== 1) {
      throw new AppError('Tu usuario se encuentra inactivo. Contacta a un administrador.', 403);
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
      }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        fullName: user.full_name,
        permissions: resolvePermissions(user.role, user.permissions),
      },
    };
  }

  static async getProfile(userId: string) {
    const db = getDb();
    const user = (await db.prepare(`
      SELECT id, username, email, full_name, role, phone, is_active, permissions, created_at
      FROM users
      WHERE id = ?
    `).get(userId)) as any;

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }
    const { permissions, ...rest } = user;
    return { ...rest, permissions: resolvePermissions(user.role, permissions) };
  }

  /**
   * Valida la contraseña de un administrador activo para autorizar operaciones
   * sensibles (anulaciones, eliminaciones, cambios de ganancias).
   * Ya NO existe contraseña maestra: solo cuentan los hashes de la base de datos.
   */
  static async verifyAdminPassword(password?: string): Promise<boolean> {
    if (!password || typeof password !== 'string') {
      return false;
    }

    const db = getDb();
    const adminUsers = (await db.prepare(`
      SELECT password_hash
      FROM users
      WHERE role = 'admin' AND is_active = 1
    `).all()) as { password_hash: string }[];

    for (const admin of adminUsers) {
      if (admin.password_hash && (await bcrypt.compare(password, admin.password_hash))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Igual que verifyAdminPassword, pero devuelve qué administrador autorizó
   * (para dejar constancia en la auditoría). Devuelve null si ninguna coincide.
   */
  static async verifyAdminWithUser(
    password?: string
  ): Promise<{ id: string; fullName: string } | null> {
    if (!password || typeof password !== 'string') {
      return null;
    }

    const db = getDb();
    const adminUsers = (await db.prepare(`
      SELECT id, full_name, password_hash
      FROM users
      WHERE role = 'admin' AND is_active = 1
    `).all()) as { id: string; full_name: string; password_hash: string }[];

    for (const admin of adminUsers) {
      if (admin.password_hash && (await bcrypt.compare(password, admin.password_hash))) {
        return { id: admin.id, fullName: admin.full_name };
      }
    }

    return null;
  }
}