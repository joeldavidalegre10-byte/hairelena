import crypto from 'node:crypto';
import { getDb } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export class SettingsService {
  /**
   * Comparación numérica normalizada centralizada para márgenes de ganancia.
   * Evita discrepancias causadas por cadenas como '50', '50.0' o '50.00'.
   */
  static areMarginsEqual(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    const numA = Number(a);
    const numB = Number(b);
    if (isNaN(numA) || isNaN(numB)) return false;
    return Math.abs(numA - numB) < 0.001;
  }

  static async get(key: string, defaultValue: string = ''): Promise<string> {
    const db = getDb();
    const row = (await db.prepare('SELECT value FROM settings WHERE key = ?').get(key)) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  }

  static async set(key: string, value: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    const existing = await db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (existing) {
      await db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(String(value), now, key);
    } else {
      await db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, String(value), now);
    }
  }

  static async getAll(): Promise<Record<string, any>> {
    const db = getDb();
    const rows = (await db.prepare('SELECT key, value FROM settings').all()) as Array<{ key: string; value: string }>;
    const result: Record<string, any> = {
      default_profit_margin_percent: 60.0,
    };
    for (const r of rows) {
      if (r.key === 'default_profit_margin_percent') {
        result[r.key] = Number(r.value) || 60.0;
      } else {
        result[r.key] = r.value;
      }
    }
    return result;
  }

  static async getDefaultProfitMargin(): Promise<number> {
    const val = await this.get('default_profit_margin_percent', '60.0');
    const num = Number(val);
    return isNaN(num) || num < 0 ? 60.0 : num;
  }

  static async setDefaultProfitMargin(margin: number): Promise<void> {
    if (typeof margin !== 'number' || isNaN(margin) || margin < 0 || margin > 100) {
      throw new AppError('El porcentaje de ganancia debe ser un número entre 0 y 100', 400);
    }
    const db = getDb();
    const now = new Date().toISOString();
    await this.set('default_profit_margin_percent', margin.toFixed(2));

    await db.prepare(`
      UPDATE service_stylist_margins
      SET is_active = 0, updated_at = ?
      WHERE ABS(profit_margin_percent - ?) < 0.001 AND is_active = 1
    `).run(now, margin);
  }

  static async getServicesWithMargins(): Promise<any[]> {
    const db = getDb();
    const defaultMargin = await this.getDefaultProfitMargin();

    const services = (await db.prepare(`
      SELECT s.id, s.name, s.price, s.description, s.custom_margin_active, s.is_active, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.is_active = 1
      ORDER BY s.name ASC
    `).all()) as any[];

    const stylistMarginsQuery = db.prepare(`
      SELECT sm.service_id, sm.stylist_id, sm.profit_margin_percent, sm.is_active, sm.is_hidden,
             st.full_name as stylist_name, st.is_active as stylist_is_active
      FROM service_stylist_margins sm
      JOIN stylists st ON sm.stylist_id = st.id
      ORDER BY st.full_name ASC
    `);
    const allStylistMargins = (await stylistMarginsQuery.all()) as any[];

    const activeStylists = (await db.prepare(`
      SELECT id, full_name, commission_rate, is_active
      FROM stylists
      WHERE is_active = 1
      ORDER BY full_name ASC
    `).all()) as any[];

    return services.map((srv) => {
      const srvMargins = allStylistMargins.filter((m) => m.service_id === srv.id);

      const stylistsStatus = activeStylists.map((st) => {
        const found = srvMargins.find((m) => m.stylist_id === st.id);
        const hasCustom = Boolean(found);
        const marginVal = found ? found.profit_margin_percent : null;
        const isEqual = marginVal !== null && this.areMarginsEqual(marginVal, defaultMargin);

        const effectiveActive = hasCustom && !isEqual && Boolean(found?.is_active);

        return {
          stylist_id: st.id,
          stylist_name: st.full_name,
          base_commission_rate: st.commission_rate,
          has_custom_margin: hasCustom,
          profit_margin_percent: marginVal,
          is_active: effectiveActive,
          is_hidden: found ? Boolean(found.is_hidden) : false,
        };
      });

      return {
        id: srv.id,
        name: srv.name,
        price: srv.price,
        category_name: srv.category_name,
        custom_margin_active: Boolean(srv.custom_margin_active),
        stylist_margins: srvMargins,
        stylists: stylistsStatus,
      };
    });
  }

  static async toggleServiceCustomMargin(serviceId: string, active: boolean): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE services
      SET custom_margin_active = ?, updated_at = ?
      WHERE id = ?
    `).run(active ? 1 : 0, now, serviceId);
  }

  static async setServiceStylistMargin(
    serviceId: string,
    stylistId: string,
    margin: number,
    isActive?: boolean
  ): Promise<{ profit_margin_percent: number; is_active: boolean }> {
    if (typeof margin !== 'number' || isNaN(margin) || margin < 0 || margin > 100) {
      throw new AppError('El porcentaje debe ser un número válido entre 0 y 100', 400);
    }

    const defaultMargin = await this.getDefaultProfitMargin();
    const isEqual = this.areMarginsEqual(margin, defaultMargin);

    let finalIsActive: boolean;

    if (isEqual) {
      if (isActive === true) {
        throw new AppError(
          'El porcentaje individual debe ser diferente del margen de ganancia general para activar esta configuración. Modificá el porcentaje antes de continuar.',
          400
        );
      }
      finalIsActive = false;
    } else {
      finalIsActive = isActive !== undefined ? Boolean(isActive) : true;
    }

    const db = getDb();
    const existing = await db.prepare('SELECT id FROM service_stylist_margins WHERE service_id = ? AND stylist_id = ?').get(serviceId, stylistId);
    const now = new Date().toISOString();

    if (existing) {
      await db.prepare(`
        UPDATE service_stylist_margins
        SET profit_margin_percent = ?, is_active = ?, updated_at = ?
        WHERE service_id = ? AND stylist_id = ?
      `).run(margin, finalIsActive ? 1 : 0, now, serviceId, stylistId);
    } else {
      const id = `sm-${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare(`
        INSERT INTO service_stylist_margins (id, service_id, stylist_id, profit_margin_percent, is_active, is_hidden, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(id, serviceId, stylistId, margin, finalIsActive ? 1 : 0, now, now);
    }

    return { profit_margin_percent: margin, is_active: finalIsActive };
  }

  static async toggleStylistMarginActive(serviceId: string, stylistId: string, isActive: boolean): Promise<{ is_active: boolean }> {
    const db = getDb();
    const existing = (await db.prepare('SELECT id, profit_margin_percent FROM service_stylist_margins WHERE service_id = ? AND stylist_id = ?').get(serviceId, stylistId)) as { id: string; profit_margin_percent: number } | undefined;
    const defaultMargin = await this.getDefaultProfitMargin();
    const currentMargin = existing ? existing.profit_margin_percent : defaultMargin;

    if (isActive) {
      if (this.areMarginsEqual(currentMargin, defaultMargin)) {
        throw new AppError(
          'El porcentaje individual debe ser diferente del margen de ganancia general para activar esta configuración. Modificá el porcentaje antes de continuar.',
          400
        );
      }
    }

    const now = new Date().toISOString();
    if (existing) {
      await db.prepare(`
        UPDATE service_stylist_margins
        SET is_active = ?, updated_at = ?
        WHERE service_id = ? AND stylist_id = ?
      `).run(isActive ? 1 : 0, now, serviceId, stylistId);
    } else {
      const id = `sm-${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare(`
        INSERT INTO service_stylist_margins (id, service_id, stylist_id, profit_margin_percent, is_active, is_hidden, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(id, serviceId, stylistId, currentMargin, isActive ? 1 : 0, now, now);
    }

    return { is_active: isActive };
  }

  static async toggleStylistVisibility(serviceId: string, stylistId: string, isHidden: boolean): Promise<void> {
    const db = getDb();
    const existing = await db.prepare('SELECT id FROM service_stylist_margins WHERE service_id = ? AND stylist_id = ?').get(serviceId, stylistId);
    const now = new Date().toISOString();

    if (existing) {
      await db.prepare(`
        UPDATE service_stylist_margins
        SET is_hidden = ?, updated_at = ?
        WHERE service_id = ? AND stylist_id = ?
      `).run(isHidden ? 1 : 0, now, serviceId, stylistId);
    } else {
      const defaultMargin = await this.getDefaultProfitMargin();
      const id = `sm-${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare(`
        INSERT INTO service_stylist_margins (id, service_id, stylist_id, profit_margin_percent, is_active, is_hidden, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `).run(id, serviceId, stylistId, defaultMargin, isHidden ? 1 : 0, now, now);
    }
  }

  static async removeServiceStylistMargin(serviceId: string, stylistId: string): Promise<void> {
    const db = getDb();
    await db.prepare('DELETE FROM service_stylist_margins WHERE service_id = ? AND stylist_id = ?').run(serviceId, stylistId);
  }
}
