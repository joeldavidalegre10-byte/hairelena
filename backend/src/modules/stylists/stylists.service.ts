import crypto from 'node:crypto';
import { getDb } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export class StylistsService {
  static async list() {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT id, user_id, full_name, email, phone, commission_rate, specialties, is_active, created_at, updated_at
      FROM stylists
      WHERE deleted_at IS NULL
      ORDER BY full_name ASC
    `).all()) as any[];

    return rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties || '[]') : r.specialties,
    }));
  }

  static async getById(id: string) {
    const db = getDb();
    const row = (await db.prepare('SELECT * FROM stylists WHERE id = ? AND deleted_at IS NULL').get(id)) as any;
    if (!row) {
      throw new AppError('Estilista no encontrado', 404);
    }
    return {
      ...row,
      is_active: Boolean(row.is_active),
      specialties: typeof row.specialties === 'string' ? JSON.parse(row.specialties || '[]') : row.specialties,
    };
  }

  static async create(payload: {
    user_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    commission_rate?: number;
    specialties?: string[];
  }) {
    const db = getDb();
    const id = `sty-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const specialtiesJson = JSON.stringify(payload.specialties || []);

    await db.prepare(`
      INSERT INTO stylists (id, user_id, full_name, email, phone, commission_rate, specialties, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      payload.user_id || null,
      payload.full_name,
      payload.email || null,
      payload.phone || null,
      payload.commission_rate ?? 40.0,
      specialtiesJson,
      now,
      now
    );

    return this.getById(id);
  }

  static async update(id: string, payload: {
    user_id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    commission_rate?: number;
    specialties?: string[];
    is_active?: boolean;
  }) {
    const db = getDb();
    const existing = await db.prepare('SELECT id FROM stylists WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!existing) {
      throw new AppError('Estilista no encontrado', 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (payload.full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(payload.full_name);
    }
    if (payload.email !== undefined) {
      updates.push('email = ?');
      values.push(payload.email);
    }
    if (payload.phone !== undefined) {
      updates.push('phone = ?');
      values.push(payload.phone);
    }
    if (payload.commission_rate !== undefined) {
      updates.push('commission_rate = ?');
      values.push(payload.commission_rate);
    }
    if (payload.specialties !== undefined) {
      updates.push('specialties = ?');
      values.push(JSON.stringify(payload.specialties));
    }
    if (payload.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(payload.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(`
      UPDATE stylists
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getById(id);
  }

  /**
   * Eliminación lógica: el estilista deja de existir para el sistema (no aparece
   * en listados ni se puede editar) pero su fila queda en la base de datos con
   * `deleted_at` marcado, así se conservan sus pagos, liquidaciones y ventas.
   * Las comisiones pendientes (aún no pagadas) y los márgenes personalizados se quitan.
   */
  static async remove(
    id: string,
    reason: string,
    requestedBy: { id: string; fullName?: string },
    authorizedBy: { id: string; fullName?: string }
  ) {
    const db = getDb();
    const stylist = (await db
      .prepare('SELECT id, full_name FROM stylists WHERE id = ? AND deleted_at IS NULL')
      .get(id)) as any;
    if (!stylist) {
      throw new AppError('Estilista no encontrado', 404);
    }

    await db.prepare("DELETE FROM commissions WHERE stylist_id = ? AND status = 'pending'").run(id);
    await db.prepare('DELETE FROM service_stylist_margins WHERE stylist_id = ?').run(id);
    await db.prepare(`
      UPDATE stylists
      SET is_active = 0, deleted_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    await db
      .prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        `aud-${crypto.randomUUID().slice(0, 12)}`,
        'stylist.delete',
        'stylist',
        id,
        requestedBy.id,
        requestedBy.fullName || null,
        JSON.stringify({
          name: stylist.full_name,
          reason,
          requested_by: requestedBy,
          authorized_by: authorizedBy,
        })
      );
  }
}
