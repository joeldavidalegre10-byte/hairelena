import crypto from 'node:crypto';
import { getDb, transaction } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
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
export class CashRegistersService {
    static async getCurrent() {
        const db = getDb();
        const register = (await db.prepare(`
      SELECT *
      FROM cash_registers
      WHERE status = 'open'
      ORDER BY opened_at DESC
      LIMIT 1
    `).get());
        if (!register) {
            throw new AppError('No hay ninguna caja registradora abierta actualmente', 404);
        }
        return normalizeRegister(register);
    }
    static async open(userId, initialAmount, notes) {
        const amount = parseAmount(initialAmount, 'El monto inicial', true);
        return await transaction(async () => {
            const db = getDb();
            // Ya no se cierran cajas previas en silencio: quedaban sin monto contado ni diferencia.
            const existing = (await db.prepare(`
        SELECT id FROM cash_registers WHERE status = 'open' LIMIT 1
      `).get());
            if (existing) {
                throw new AppError('Ya hay una caja abierta. Ciérrala antes de abrir una nueva.', 409);
            }
            const id = `reg-${crypto.randomUUID().slice(0, 8)}`;
            const now = new Date().toISOString();
            await db.prepare(`
        INSERT INTO cash_registers (
          id, name, status, opened_at, opened_by, initial_amount, expected_amount, actual_amount, difference, notes, created_at
        )
        VALUES (?, 'Caja Principal', 'open', ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(id, now, userId, amount, amount, amount, cleanNotes(notes), now);
            return normalizeRegister(await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(id));
        });
    }
    static async close(userId, registerId, actualAmount, notes) {
        const actual = parseAmount(actualAmount, 'El monto contado', true);
        return await transaction(async () => {
            const db = getDb();
            const reg = (await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(registerId));
            if (!reg)
                throw new AppError('Caja no encontrada', 404);
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
      `).run(now, userId, actual, actual, cleanNotes(notes) || reg.notes || null, registerId);
            return normalizeRegister(await db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(registerId));
        });
    }
    static async addMovement(userId, registerId, type, amount, reason) {
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
            const reg = (await db.prepare('SELECT id, status, expected_amount FROM cash_registers WHERE id = ?').get(registerId));
            if (!reg)
                throw new AppError('Caja no encontrada', 404);
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
      `).run(id, registerId, type, value, cleanReason, userId, now);
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
    static async listMovements(registerId) {
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
