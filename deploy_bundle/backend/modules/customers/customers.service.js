import crypto from 'node:crypto';
import { getDb, transaction } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { cleanName, normalizeName, normalizePhone } from './customers.util.js';
const COLUMNS = 'id, full_name, phone, phone_normalized, notes, is_active, created_at, updated_at';
const toCustomer = (row) => ({
    ...row,
    is_active: Boolean(Number(row.is_active)),
});
const isDuplicateKeyError = (error) => error?.code === 'ER_DUP_ENTRY' ||
    error?.errno === 1062 ||
    String(error?.code || '').startsWith('SQLITE_CONSTRAINT') ||
    /UNIQUE constraint failed/i.test(String(error?.message || ''));
export class CustomersService {
    /** Lista / búsqueda para el autocompletado del POS (solo activos por defecto). */
    static async list(opts = {}) {
        const db = getDb();
        const limit = Math.min(Math.max(Number(opts.limit) || 8, 1), 200);
        const where = [];
        const params = [];
        if (!opts.includeInactive)
            where.push('is_active = 1');
        const term = cleanName(opts.q);
        if (term) {
            const nameTerm = normalizeName(term);
            const digits = term.replace(/\D/g, '');
            const parts = ['name_normalized LIKE ?'];
            params.push(`%${nameTerm}%`);
            if (digits.length >= 3) {
                parts.push('phone_normalized LIKE ?', 'phone LIKE ?');
                params.push(`%${digits}%`, `%${digits}%`);
            }
            where.push(`(${parts.join(' OR ')})`);
        }
        const sql = `
      SELECT ${COLUMNS} FROM customers
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY name_normalized ASC
      LIMIT ${limit}
    `;
        const rows = (await db.prepare(sql).all(...params));
        return rows.map(toCustomer);
    }
    static async getById(id) {
        const row = await getDb().prepare(`SELECT ${COLUMNS} FROM customers WHERE id = ?`).get(id);
        if (!row)
            throw new AppError('Cliente no encontrado', 404);
        return toCustomer(row);
    }
    static async findByPhone(phoneNorm, excludeId) {
        const db = getDb();
        const row = excludeId
            ? await db
                .prepare(`SELECT ${COLUMNS} FROM customers WHERE phone_normalized = ? AND id <> ?`)
                .get(phoneNorm, excludeId)
            : await db.prepare(`SELECT ${COLUMNS} FROM customers WHERE phone_normalized = ?`).get(phoneNorm);
        return row ? toCustomer(row) : null;
    }
    static async findByNameWithoutPhone(nameNorm) {
        const row = await getDb()
            .prepare(`SELECT ${COLUMNS} FROM customers WHERE name_normalized = ? AND phone_normalized IS NULL AND is_active = 1`)
            .get(nameNorm);
        return row ? toCustomer(row) : null;
    }
    /**
     * Crea un cliente o devuelve el que ya existe (mismo teléfono, o mismo nombre
     * cuando ninguno tiene teléfono). Así el mismo cliente nunca se duplica.
     */
    static async create(payload) {
        const fullName = cleanName(payload.full_name);
        if (fullName.length < 2)
            throw new AppError('El nombre del cliente es obligatorio (mínimo 2 letras)', 400);
        if (fullName.length > 191)
            throw new AppError('El nombre del cliente es demasiado largo', 400);
        const rawPhone = String(payload.phone ?? '').trim();
        const phoneNorm = rawPhone ? normalizePhone(rawPhone) : null;
        if (rawPhone && !phoneNorm) {
            throw new AppError('El teléfono no es válido. Ejemplo: 0981 123 456', 400);
        }
        const nameNorm = normalizeName(fullName);
        const existing = phoneNorm
            ? await CustomersService.findByPhone(phoneNorm)
            : await CustomersService.findByNameWithoutPhone(nameNorm);
        if (existing) {
            // Si estaba desactivado, se reactiva: es el mismo cliente que vuelve.
            if (!existing.is_active) {
                await getDb()
                    .prepare("UPDATE customers SET is_active = 1, updated_at = datetime('now') WHERE id = ?")
                    .run(existing.id);
                existing.is_active = true;
            }
            return { customer: existing, created: false };
        }
        const id = `cus-${crypto.randomUUID().slice(0, 8)}`;
        const now = new Date().toISOString();
        try {
            await getDb()
                .prepare(`INSERT INTO customers (id, full_name, phone, phone_normalized, name_normalized, notes, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`)
                .run(id, fullName, rawPhone || null, phoneNorm, nameNorm, payload.notes?.trim() || null, now, now);
        }
        catch (error) {
            // Dos cajeros crearon el mismo teléfono a la vez: se devuelve el ganador.
            if (phoneNorm && isDuplicateKeyError(error)) {
                const winner = await CustomersService.findByPhone(phoneNorm);
                if (winner)
                    return { customer: winner, created: false };
            }
            throw error;
        }
        return { customer: await CustomersService.getById(id), created: true };
    }
    static async update(id, payload) {
        const db = getDb();
        const current = await CustomersService.getById(id);
        const updates = [];
        const values = [];
        if (payload.full_name !== undefined) {
            const fullName = cleanName(payload.full_name);
            if (fullName.length < 2)
                throw new AppError('El nombre del cliente es obligatorio (mínimo 2 letras)', 400);
            updates.push('full_name = ?', 'name_normalized = ?');
            values.push(fullName, normalizeName(fullName));
        }
        if (payload.phone !== undefined) {
            const rawPhone = String(payload.phone ?? '').trim();
            const phoneNorm = rawPhone ? normalizePhone(rawPhone) : null;
            if (rawPhone && !phoneNorm)
                throw new AppError('El teléfono no es válido. Ejemplo: 0981 123 456', 400);
            if (phoneNorm) {
                const other = await CustomersService.findByPhone(phoneNorm, id);
                if (other)
                    throw new AppError(`Ese teléfono ya pertenece a "${other.full_name}"`, 409);
            }
            updates.push('phone = ?', 'phone_normalized = ?');
            values.push(rawPhone || null, phoneNorm);
        }
        if (payload.notes !== undefined) {
            updates.push('notes = ?');
            values.push(String(payload.notes ?? '').trim() || null);
        }
        if (payload.is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(payload.is_active ? 1 : 0);
        }
        if (updates.length > 0) {
            updates.push("updated_at = datetime('now')");
            values.push(id);
            await db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }
        return CustomersService.getById(current.id);
    }
    /**
     * Une dos clientes duplicados: todas las ventas de "source" pasan a "target"
     * y "source" queda inactivo (sin teléfono, para liberarlo).
     */
    static async merge(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) {
            throw new AppError('Elegí dos clientes distintos para unir', 400);
        }
        return transaction(async () => {
            const db = getDb();
            const source = await CustomersService.getById(sourceId);
            const target = await CustomersService.getById(targetId);
            const moved = await db
                .prepare('UPDATE sales SET customer_id = ? WHERE customer_id = ?')
                .run(target.id, source.id);
            // Si el cliente que se conserva no tiene teléfono, hereda el del duplicado.
            if (!target.phone_normalized && source.phone_normalized) {
                await db
                    .prepare('UPDATE customers SET phone = NULL, phone_normalized = NULL WHERE id = ?')
                    .run(source.id);
                await db
                    .prepare("UPDATE customers SET phone = ?, phone_normalized = ?, updated_at = datetime('now') WHERE id = ?")
                    .run(source.phone, source.phone_normalized, target.id);
            }
            else {
                await db
                    .prepare('UPDATE customers SET phone = NULL, phone_normalized = NULL WHERE id = ?')
                    .run(source.id);
            }
            await db
                .prepare("UPDATE customers SET is_active = 0, notes = ?, updated_at = datetime('now') WHERE id = ?")
                .run(`Unido con ${target.full_name} (${target.id})`, source.id);
            return { customer: await CustomersService.getById(target.id), sales_moved: moved.changes };
        });
    }
}
