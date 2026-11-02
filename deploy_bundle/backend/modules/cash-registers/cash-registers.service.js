import crypto from 'node:crypto';
import { getDb, transaction } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { resolvePermissions } from '../../config/permissions.js';
const MAX_REASON_LENGTH = 255;
// MySQL devuelve DECIMAL como texto: se convierte siempre a número antes de responder.
function toMoney(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function normalizeRegister(reg) {
    if (!reg)
        return reg;
    return {
        ...reg,
        initial_amount: toMoney(reg.initial_amount),
        expected_amount: toMoney(reg.expected_amount),
        actual_amount: toMoney(reg.actual_amount),
        difference: toMoney(reg.difference),
    };
}
function normalizeMovement(mov) {
    if (!mov)
        return mov;
    return { ...mov, amount: toMoney(mov.amount) };
}
// Valida montos que llegan del cliente (evita NaN, negativos y textos).
function parseAmount(value, label, allowZero) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) {
        throw new AppError(allowZero ? `${label} debe ser un número igual o mayor a 0` : `${label} debe ser un número mayor a 0`, 400);
    }
    return n;
}
function cleanNotes(notes) {
    if (typeof notes !== 'string')
        return null;
    const trimmed = notes.trim();
    return trimmed ? trimmed : null;
}
/**
 * Cada usuario trabaja con su propia caja. El administrador puede ver y operar
 * las cajas de cualquier usuario; el resto solo la que abrió él mismo.
 */
function assertCanAccess(actor, register) {
    if (actor.role === 'admin')
        return;
    if (!register || register.opened_by !== actor.id) {
        throw new AppError('Esta caja pertenece a otro usuario', 403);
    }
}
async function findRegisterOrFail(registerId) {
    const db = getDb();
    const reg = (await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(registerId));
    if (!reg)
        throw new AppError('Caja no encontrada', 404);
    return reg;
}
export class CashRegistersService {
    /** Caja abierta del propio usuario. */
    static async getCurrent(userId) {
        const db = getDb();
        const register = (await db.prepare(`
      SELECT *
      FROM cash_registers
      WHERE status = 'open' AND opened_by = ?
      ORDER BY opened_at DESC
      LIMIT 1
    `).get(userId));
        if (!register) {
            throw new AppError('No tienes ninguna caja abierta actualmente', 404);
        }
        return normalizeRegister(register);
    }
    /**
     * Listado para el administrador: todas las cajas de todos los usuarios,
     * con quién la abrió/cerró y totales de ventas y movimientos.
     */
    static async list(filters = {}) {
        const db = getDb();
        const where = [];
        const params = [];
        if (filters.status === 'open' || filters.status === 'closed') {
            where.push('cr.status = ?');
            params.push(filters.status);
        }
        if (filters.userId) {
            where.push('cr.opened_by = ?');
            params.push(filters.userId);
        }
        const limit = Math.min(Math.max(Math.trunc(Number(filters.limit)) || 100, 1), 500);
        const rows = (await db.prepare(`
      SELECT
        cr.*,
        uo.full_name AS opened_by_name,
        uc.full_name AS closed_by_name,
        (SELECT COALESCE(SUM(s.total), 0) FROM sales s
           WHERE s.register_id = cr.id AND s.status = 'completed') AS sales_total,
        (SELECT COUNT(*) FROM sales s
           WHERE s.register_id = cr.id AND s.status = 'completed') AS sales_count,
        (SELECT COALESCE(SUM(m.amount), 0) FROM cash_movements m
           WHERE m.register_id = cr.id AND m.type = 'in') AS movements_in,
        (SELECT COALESCE(SUM(m.amount), 0) FROM cash_movements m
           WHERE m.register_id = cr.id AND m.type = 'out') AS movements_out
      FROM cash_registers cr
      LEFT JOIN users uo ON cr.opened_by = uo.id
      LEFT JOIN users uc ON cr.closed_by = uc.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY (CASE WHEN cr.status = 'open' THEN 0 ELSE 1 END), cr.opened_at DESC
      LIMIT ${limit}
    `).all(...params));
        return rows.map((r) => ({
            ...normalizeRegister(r),
            sales_total: toMoney(r.sales_total),
            sales_count: Number(r.sales_count) || 0,
            movements_in: toMoney(r.movements_in),
            movements_out: toMoney(r.movements_out),
        }));
    }
    /** Detalle de una caja concreta (con el nombre de quien la abrió). */
    static async getById(actor, registerId) {
        const db = getDb();
        const reg = (await db.prepare(`
      SELECT cr.*, uo.full_name AS opened_by_name, uc.full_name AS closed_by_name
      FROM cash_registers cr
      LEFT JOIN users uo ON cr.opened_by = uo.id
      LEFT JOIN users uc ON cr.closed_by = uc.id
      WHERE cr.id = ?
    `).get(registerId));
        if (!reg)
            throw new AppError('Caja no encontrada', 404);
        assertCanAccess(actor, reg);
        return normalizeRegister(reg);
    }
    /**
     * Usuarios a los que se les puede habilitar una caja (activos y con acceso al POS o a caja),
     * indicando si ya tienen una caja abierta. Solo lo consume el administrador.
     */
    static async listEligibleUsers() {
        const db = getDb();
        const users = (await db.prepare(`
      SELECT id, full_name, role, permissions
      FROM users
      WHERE is_active = 1 AND role <> 'stylist'
      ORDER BY full_name ASC
    `).all());
        const openRows = (await db.prepare(`
      SELECT opened_by FROM cash_registers WHERE status = 'open'
    `).all());
        const withOpen = new Set(openRows.map((r) => r.opened_by));
        return users
            .filter((u) => {
            const perms = resolvePermissions(u.role, u.permissions);
            return perms.includes('pos') || perms.includes('register');
        })
            .map((u) => ({
            id: u.id,
            full_name: u.full_name,
            role: u.role,
            has_open_register: withOpen.has(u.id),
        }));
    }
    /**
     * Abre una caja. El administrador puede habilitarla para cualquier usuario (targetUserId);
     * el resto solo puede abrir la suya.
     */
    static async open(actor, targetUserId, initialAmount, notes) {
        const amount = parseAmount(initialAmount, 'El monto inicial', true);
        const userId = targetUserId || actor.id;
        if (userId !== actor.id && actor.role !== 'admin') {
            throw new AppError('Solo un administrador puede habilitar la caja de otro usuario', 403);
        }
        return await transaction(async () => {
            const db = getDb();
            // Una sola caja abierta por usuario (cada usuario puede tener la suya a la vez).
            // Ya no se cierran cajas previas en silencio: quedaban sin monto contado ni diferencia.
            const existing = (await db.prepare(`
        SELECT id FROM cash_registers WHERE status = 'open' AND opened_by = ? LIMIT 1
      `).get(userId));
            if (existing) {
                throw new AppError(userId === actor.id
                    ? 'Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.'
                    : 'Ese usuario ya tiene una caja abierta. Ciérrala antes de habilitar una nueva.', 409);
            }
            const owner = (await db.prepare('SELECT full_name, is_active FROM users WHERE id = ?').get(userId));
            if (!owner)
                throw new AppError('Usuario no encontrado', 404);
            if (Number(owner.is_active) !== 1)
                throw new AppError('El usuario seleccionado está inactivo', 400);
            const registerName = owner?.full_name ? `Caja de ${owner.full_name}` : 'Caja Principal';
            const id = `reg-${crypto.randomUUID().slice(0, 8)}`;
            const now = new Date().toISOString();
            await db.prepare(`
        INSERT INTO cash_registers (
          id, name, status, opened_at, opened_by, initial_amount, expected_amount, actual_amount, difference, notes, created_at
        )
        VALUES (?, ?, 'open', ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(id, registerName, now, userId, amount, amount, amount, cleanNotes(notes), now);
            return normalizeRegister(await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(id));
        });
    }
    static async close(actor, registerId, actualAmount, notes) {
        const actual = parseAmount(actualAmount, 'El monto contado', true);
        return await transaction(async () => {
            const db = getDb();
            const reg = await findRegisterOrFail(registerId);
            assertCanAccess(actor, reg);
            if (reg.status === 'closed') {
                throw new AppError('Esta caja ya se encuentra cerrada', 400);
            }
            const now = new Date().toISOString();
            // La diferencia se calcula en la propia sentencia con el expected_amount vigente,
            // así una venta en efectivo concurrente no deja el cierre desfasado.
            await db.prepare(`
        UPDATE cash_registers
        SET status = 'closed', closed_at = ?, closed_by = ?, actual_amount = ?,
            difference = ? - expected_amount, notes = ?
        WHERE id = ? AND status = 'open'
      `).run(now, actor.id, actual, actual, cleanNotes(notes) || reg.notes || null, registerId);
            return normalizeRegister(await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(registerId));
        });
    }
    static async addMovement(actor, registerId, type, amount, reason) {
        if (type !== 'in' && type !== 'out') {
            throw new AppError('El tipo de movimiento debe ser "in" u "out"', 400);
        }
        const value = parseAmount(amount, 'El monto del movimiento', false);
        const cleanReason = typeof reason === 'string' ? reason.trim() : '';
        if (!cleanReason) {
            throw new AppError('El motivo del movimiento es obligatorio', 400);
        }
        if (cleanReason.length > MAX_REASON_LENGTH) {
            throw new AppError(`El motivo no puede superar ${MAX_REASON_LENGTH} caracteres`, 400);
        }
        return await transaction(async () => {
            const db = getDb();
            const reg = await findRegisterOrFail(registerId);
            assertCanAccess(actor, reg);
            if (reg.status === 'closed') {
                throw new AppError('No se pueden registrar movimientos en una caja cerrada', 400);
            }
            if (type === 'out' && value > toMoney(reg.expected_amount)) {
                throw new AppError('El retiro supera el efectivo esperado en caja', 400);
            }
            const id = `mov-${crypto.randomUUID().slice(0, 8)}`;
            const now = new Date().toISOString();
            await db.prepare(`
        INSERT INTO cash_movements (id, register_id, type, amount, reason, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, registerId, type, value, cleanReason, actor.id, now);
            // Actualizar monto esperado en caja
            const delta = type === 'in' ? value : -value;
            await db.prepare(`
        UPDATE cash_registers
        SET expected_amount = expected_amount + ?
        WHERE id = ?
      `).run(delta, registerId);
            return normalizeMovement(await db.prepare('SELECT * FROM cash_movements WHERE id = ?').get(id));
        });
    }
    static async listMovements(actor, registerId) {
        assertCanAccess(actor, await findRegisterOrFail(registerId));
        const db = getDb();
        const rows = (await db.prepare(`
      SELECT cm.*, u.full_name as created_by_name
      FROM cash_movements cm
      LEFT JOIN users u ON cm.created_by = u.id
      WHERE cm.register_id = ?
      ORDER BY cm.created_at DESC
    `).all(registerId));
        return rows.map(normalizeMovement);
    }
    static async deleteMovement(userId, movementId, reason) {
        return await transaction(async () => {
            const db = getDb();
            const mov = (await db.prepare('SELECT * FROM cash_movements WHERE id = ?').get(movementId));
            if (!mov) {
                throw new AppError('Movimiento de caja no encontrado', 404);
            }
            const reg = (await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(mov.register_id));
            if (!reg) {
                throw new AppError('Caja registradora vinculada al movimiento no encontrada', 404);
            }
            // Regla de auditoría: si la caja ya está cerrada, no alterar el cierre histórico
            if (reg.status === 'closed') {
                throw new AppError('No se puede eliminar un movimiento perteneciente a una caja cerrada o período histórico cerrado', 400);
            }
            const expectedBefore = toMoney(reg.expected_amount);
            // Revertir el impacto en la caja abierta.
            // MAX(a, b) de dos argumentos no existe en MySQL (allí MAX es solo agregada): se usa CASE.
            const movAmount = toMoney(mov.amount);
            const delta = mov.type === 'in' ? -movAmount : movAmount;
            await db.prepare(`
        UPDATE cash_registers
        SET expected_amount = CASE
          WHEN expected_amount + ? < 0 THEN 0
          ELSE expected_amount + ?
        END
        WHERE id = ?
      `).run(delta, delta, mov.register_id);
            const updatedReg = normalizeRegister(await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(mov.register_id));
            // Registrar auditoría (incluye el esperado antes y después, por si el CASE tuvo que limitar a 0)
            const auditId = `aud-${crypto.randomUUID().slice(0, 8)}`;
            const now = new Date().toISOString();
            const user = (await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId));
            const userName = user?.full_name || 'Usuario del sistema';
            const cleanReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
            await db.prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details, created_at)
        VALUES (?, 'delete_movement', 'cash_movement', ?, ?, ?, ?, ?)
      `).run(auditId, mov.id, userId, userName, JSON.stringify({
                movement: { ...mov, amount: movAmount },
                reversal_delta: delta,
                expected_before: expectedBefore,
                expected_after: updatedReg.expected_amount,
                reason: cleanReason || 'Eliminación autorizada por administrador',
            }), now);
            // Eliminar el movimiento
            await db.prepare('DELETE FROM cash_movements WHERE id = ?').run(movementId);
            return {
                deletedMovementId: movementId,
                register: updatedReg,
            };
        });
    }
}
