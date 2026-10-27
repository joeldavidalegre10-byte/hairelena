import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
export class UsersService {
    static async list() {
        const db = getDb();
        return await db.prepare(`
      SELECT id, username, email, full_name, role, phone, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    }
    static async getById(id) {
        const db = getDb();
        const user = await db.prepare(`
      SELECT id, username, email, full_name, role, phone, is_active, created_at
      FROM users
      WHERE id = ?
    `).get(id);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }
        return user;
    }
    static async create(payload) {
        const db = getDb();
        const username = (payload.username || payload.email?.split('@')[0] || '').trim().toLowerCase();
        if (!username) {
            throw new AppError('Debes ingresar un nombre de usuario', 400);
        }
        const plainPass = (payload.password || '').trim();
        if (!plainPass || plainPass.length < 3) {
            throw new AppError('La contraseña debe tener al menos 3 caracteres', 400);
        }
        const email = (payload.email || `${username}@elitestudio.com`).trim().toLowerCase();
        // Comprobar username o email duplicado
        const existing = await db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(username, email);
        if (existing) {
            throw new AppError(`El nombre de usuario o correo «${username}» ya está registrado`, 400);
        }
        const id = `u-${crypto.randomUUID().slice(0, 8)}`;
        const passwordHash = bcrypt.hashSync(plainPass, 10);
        const fullName = payload.full_name?.trim() || username;
        const now = new Date().toISOString();
        await db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, username, email, passwordHash, fullName, payload.role || 'admin', payload.phone || null, now, now);
        return this.getById(id);
    }
    static async update(id, payload) {
        const db = getDb();
        const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }
        const updates = [];
        const values = [];
        if (payload.full_name !== undefined) {
            updates.push('full_name = ?');
            values.push(payload.full_name);
        }
        if (payload.role !== undefined) {
            updates.push('role = ?');
            values.push(payload.role);
        }
        if (payload.phone !== undefined) {
            updates.push('phone = ?');
            values.push(payload.phone);
        }
        if (payload.is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(payload.is_active ? 1 : 0);
        }
        if (payload.password) {
            updates.push('password_hash = ?');
            values.push(bcrypt.hashSync(payload.password, 10));
        }
        if (updates.length === 0) {
            return this.getById(id);
        }
        updates.push("updated_at = datetime('now')");
        values.push(id);
        await db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);
        return this.getById(id);
    }
}
