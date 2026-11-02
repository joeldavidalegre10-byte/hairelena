import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ROLE_DEFAULT_PERMISSIONS, resolvePermissions, sanitizePermissions, } from '../../config/permissions.js';
const VALID_ROLES = ['admin', 'cashier', 'stylist'];
const USER_COLUMNS = 'id, username, email, full_name, role, phone, is_active, permissions, created_at';
/** Devuelve el usuario con la lista de permisos ya resuelta (array de claves). */
function shape(row) {
    const { permissions, ...rest } = row;
    return { ...rest, permissions: resolvePermissions(row.role, permissions) };
}
function assertValidRole(role) {
    if (!VALID_ROLES.includes(role)) {
        throw new AppError('Rol inválido', 400);
    }
}
/** Valida la lista que llega del formulario: debe ser un arreglo con al menos un permiso válido. */
function parsePermissionsInput(input) {
    if (!Array.isArray(input)) {
        throw new AppError('Los permisos deben enviarse como una lista', 400);
    }
    const clean = sanitizePermissions(input);
    if (clean.length === 0) {
        throw new AppError('Selecciona al menos un permiso para el usuario', 400);
    }
    return clean;
}
export class UsersService {
    static async list() {
        const db = getDb();
        const rows = (await db.prepare(`
      SELECT ${USER_COLUMNS}
      FROM users
      ORDER BY created_at DESC
    `).all());
        return rows.map(shape);
    }
    static async getById(id) {
        const db = getDb();
        const user = (await db.prepare(`
      SELECT ${USER_COLUMNS}
      FROM users
      WHERE id = ?
    `).get(id));
        if (!user) {
            throw new AppError('Usuario no encontrado', 404);
        }
        return shape(user);
    }
    /**
     * Evita quedarse sin nadie que pueda administrar usuarios:
     * debe existir siempre otro usuario ACTIVO con el permiso «settings».
     */
    static async assertAnotherUserManagesUsers(targetId, message) {
        const db = getDb();
        const rows = (await db
            .prepare('SELECT id, role, is_active, permissions FROM users')
            .all());
        const others = rows.filter((r) => r.id !== targetId &&
            Number(r.is_active) === 1 &&
            resolvePermissions(r.role, r.permissions).includes('settings'));
        if (others.length === 0) {
            throw new AppError(message, 400);
        }
    }
    static async writeAudit(action, targetId, actor, details) {
        const db = getDb();
        await db
            .prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
            .run(`aud-${crypto.randomUUID().slice(0, 12)}`, action, 'user', targetId, actor.id, actor.fullName || null, JSON.stringify(details));
    }
    static async create(payload, actor) {
        const db = getDb();
        const username = (payload.username || payload.email?.split('@')[0] || '').trim().toLowerCase();
        if (!username) {
            throw new AppError('Debes ingresar un nombre de usuario', 400);
        }
        const plainPass = (payload.password || '').trim();
        if (!plainPass || plainPass.length < 3) {
            throw new AppError('La contraseña debe tener al menos 3 caracteres', 400);
        }
        const role = payload.role || 'admin';
        assertValidRole(role);
        // Si no se envían permisos se usan los del rol; si se envían, mandan los elegidos.
        const permissions = payload.permissions === undefined
            ? [...ROLE_DEFAULT_PERMISSIONS[role]]
            : parsePermissionsInput(payload.permissions);
        if (permissions.length === 0) {
            throw new AppError('Selecciona al menos un permiso para el usuario', 400);
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
      INSERT INTO users (id, username, email, password_hash, full_name, role, phone, is_active, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(id, username, email, passwordHash, fullName, role, payload.phone || null, JSON.stringify(permissions), now, now);
        if (actor) {
            await this.writeAudit('user.create', id, actor, { username, role, permissions });
        }
        return this.getById(id);
    }
    static async update(id, payload, actor) {
        const db = getDb();
        const current = (await db
            .prepare('SELECT id, username, email, role, is_active, permissions FROM users WHERE id = ?')
            .get(id));
        if (!current) {
            throw new AppError('Usuario no encontrado', 404);
        }
        const isSelf = actor?.id === id;
        const currentPermissions = resolvePermissions(current.role, current.permissions);
        const wasManagingUsers = Number(current.is_active) === 1 && currentPermissions.includes('settings');
        // Estado final que tendría el usuario después del cambio
        const newRole = payload.role !== undefined ? payload.role : current.role;
        if (payload.role !== undefined)
            assertValidRole(payload.role);
        const newPermissions = payload.permissions !== undefined
            ? parsePermissionsInput(payload.permissions)
            : resolvePermissions(newRole, current.permissions);
        const newActive = payload.is_active !== undefined ? Boolean(payload.is_active) : Number(current.is_active) === 1;
        if (isSelf && !newActive) {
            throw new AppError('No puedes desactivar tu propio usuario', 400);
        }
        if (wasManagingUsers && (!newActive || !newPermissions.includes('settings'))) {
            await this.assertAnotherUserManagesUsers(id, 'Debe quedar al menos otro usuario activo con el permiso de Configuración. Asígnaselo a otra cuenta antes de continuar.');
        }
        const updates = [];
        const values = [];
        if (payload.username !== undefined) {
            const newUsername = String(payload.username).trim().toLowerCase();
            if (!newUsername) {
                throw new AppError('El nombre de usuario no puede estar vacío', 400);
            }
            if (newUsername !== String(current.username || '').toLowerCase()) {
                // El correo se genera a partir del usuario: se mantiene sincronizado solo si era el automático
                const oldAutoEmail = `${String(current.username || '').toLowerCase()}@elitestudio.com`;
                const newEmail = String(current.email).toLowerCase() === oldAutoEmail
                    ? `${newUsername}@elitestudio.com`
                    : String(current.email).toLowerCase();
                const duplicate = await db
                    .prepare('SELECT id FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id <> ?')
                    .get(newUsername, newEmail, id);
                if (duplicate) {
                    throw new AppError(`El nombre de usuario «${newUsername}» ya está registrado`, 400);
                }
                updates.push('username = ?');
                values.push(newUsername);
                if (newEmail !== String(current.email).toLowerCase()) {
                    updates.push('email = ?');
                    values.push(newEmail);
                }
            }
        }
        if (payload.full_name !== undefined) {
            const fullName = String(payload.full_name).trim();
            if (!fullName) {
                throw new AppError('El nombre completo no puede estar vacío', 400);
            }
            updates.push('full_name = ?');
            values.push(fullName);
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
            if (String(payload.password).trim().length < 3) {
                throw new AppError('La contraseña debe tener al menos 3 caracteres', 400);
            }
            updates.push('password_hash = ?');
            values.push(bcrypt.hashSync(String(payload.password).trim(), 10));
        }
        if (payload.permissions !== undefined) {
            updates.push('permissions = ?');
            values.push(JSON.stringify(newPermissions));
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
        if (actor && (payload.permissions !== undefined || payload.role !== undefined)) {
            await this.writeAudit('user.permissions_update', id, actor, {
                username: current.username,
                role: { from: current.role, to: newRole },
                permissions: { from: currentPermissions, to: newPermissions },
            });
        }
        return this.getById(id);
    }
    static async remove(id, requestedBy, authorizedBy) {
        const db = getDb();
        if (requestedBy.id === id) {
            throw new AppError('No puedes eliminar tu propio usuario', 400);
        }
        const target = (await db
            .prepare('SELECT id, username, full_name, role, is_active, permissions FROM users WHERE id = ?')
            .get(id));
        if (!target) {
            throw new AppError('Usuario no encontrado', 404);
        }
        const managesUsers = Number(target.is_active) === 1 && resolvePermissions(target.role, target.permissions).includes('settings');
        if (managesUsers) {
            await this.assertAnotherUserManagesUsers(id, 'No puedes eliminar a la única cuenta que administra los usuarios del sistema.');
        }
        // Las ventas, movimientos de caja y auditorías quedan guardados (la relación pasa a NULL).
        await db.prepare('DELETE FROM users WHERE id = ?').run(id);
        await this.writeAudit('user.delete', id, requestedBy, {
            username: target.username,
            full_name: target.full_name,
            role: target.role,
            requested_by: requestedBy,
            authorized_by: authorizedBy,
        });
    }
}
