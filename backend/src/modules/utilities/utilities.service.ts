import crypto from 'node:crypto';
import { getDb, transaction } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { SettingsService } from '../settings/settings.service.js';

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export type UtilitySource = 'service' | 'general';
export type UtilityStatus = 'pending' | 'paid' | 'cancelled';

/** Resultado de aplicar la prioridad de configuraciones a un servicio. */
export interface UtilityResolution {
  eligible: boolean;
  /** Monto por unidad de servicio (0 si no es elegible). */
  amount: number;
  /** De dónde sale el monto: configuración específica del servicio o monto general. */
  source: UtilitySource | null;
  /** Motivo por el que no es elegible (para mostrar en pantalla / errores). */
  reason?: string;
}

export interface UtilityRecord {
  id: string;
  sale_id: string;
  sale_item_id: string;
  invoice_number: string | null;
  service_id: string | null;
  service_name: string;
  customer_name: string | null;
  main_stylist_id: string | null;
  main_stylist_name: string | null;
  helper_stylist_id: string;
  helper_stylist_name: string | null;
  quantity: number;
  unit_amount: number;
  amount: number;
  source: UtilitySource;
  status: UtilityStatus;
  payout_id: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  sale_date: string | null;
}

export const UTILITY_KEYS = {
  amount: 'utility_general_amount',
  enabled: 'utility_general_enabled',
} as const;

/* ------------------------------------------------------------------ */
/* Utilidades internas                                                */
/* ------------------------------------------------------------------ */

// MySQL devuelve DECIMAL/SUM como texto: se normaliza a número.
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const bool = (v: unknown): boolean => Boolean(Number(v));

/** Los montos son guaraníes: se guardan como enteros. */
const roundGs = (v: number): number => Math.round(v);

/**
 * Valida un monto recibido del cliente: numérico, finito y no negativo.
 * Se rechazan cadenas vacías, NaN, Infinity y negativos.
 */
export function parseAmount(raw: unknown, label = 'El monto'): number {
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    throw new AppError(`${label} es obligatorio`, 400);
  }
  if (typeof raw !== 'number' && typeof raw !== 'string') {
    throw new AppError(`${label} debe ser un número`, 400);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new AppError(`${label} debe ser un número válido`, 400);
  }
  if (value < 0) {
    throw new AppError(`${label} no puede ser negativo`, 400);
  }
  if (value > 100_000_000) {
    throw new AppError(`${label} es demasiado grande`, 400);
  }
  return roundGs(value);
}

const mapRecord = (r: any): UtilityRecord => ({
  id: r.id,
  sale_id: r.sale_id,
  sale_item_id: r.sale_item_id,
  invoice_number: r.invoice_number ?? null,
  service_id: r.service_id ?? null,
  service_name: r.service_name,
  customer_name: r.customer_name ?? null,
  main_stylist_id: r.main_stylist_id ?? null,
  main_stylist_name: r.main_stylist_name ?? null,
  helper_stylist_id: r.helper_stylist_id,
  helper_stylist_name: r.helper_stylist_name ?? null,
  quantity: num(r.quantity),
  unit_amount: num(r.unit_amount),
  amount: num(r.amount),
  source: r.source,
  status: r.status,
  payout_id: r.payout_id ?? null,
  paid_at: r.paid_at ?? null,
  cancelled_at: r.cancelled_at ?? null,
  cancel_reason: r.cancel_reason ?? null,
  created_at: r.created_at,
  sale_date: r.sale_date ?? null,
});

const RECORD_SELECT = `
  SELECT
    u.id, u.sale_id, u.sale_item_id, u.service_id, u.service_name,
    u.main_stylist_id, u.helper_stylist_id, u.quantity, u.unit_amount, u.amount,
    u.source, u.status, u.payout_id, u.paid_at, u.cancelled_at, u.cancel_reason, u.created_at,
    s.invoice_number as invoice_number,
    s.customer_name as customer_name,
    s.created_at as sale_date,
    mst.full_name as main_stylist_name,
    hst.full_name as helper_stylist_name
  FROM utilities u
  LEFT JOIN sales s ON u.sale_id = s.id
  LEFT JOIN stylists mst ON u.main_stylist_id = mst.id
  LEFT JOIN stylists hst ON u.helper_stylist_id = hst.id
`;

/* ------------------------------------------------------------------ */
/* Servicio                                                           */
/* ------------------------------------------------------------------ */

export class UtilitiesService {
  /* ----------------------- Configuración general ----------------------- */

  static async getGeneral(): Promise<{ amount: number; enabled: boolean }> {
    const amountRaw = await SettingsService.get(UTILITY_KEYS.amount, '0');
    // Sin configuración previa el interruptor general queda activo (con monto 0 no genera nada).
    const enabledRaw = await SettingsService.get(UTILITY_KEYS.enabled, '1');
    const amount = num(amountRaw);
    return {
      amount: amount < 0 ? 0 : amount,
      enabled: enabledRaw === '1' || enabledRaw === 'true',
    };
  }

  static async setGeneral(input: { amount?: unknown; enabled?: unknown }): Promise<{ amount: number; enabled: boolean }> {
    if (input.amount === undefined && input.enabled === undefined) {
      throw new AppError('No se recibió ningún cambio para la utilidad general', 400);
    }

    if (input.amount !== undefined) {
      const amount = parseAmount(input.amount, 'El monto de utilidad general');
      await SettingsService.set(UTILITY_KEYS.amount, String(amount));
    }
    if (input.enabled !== undefined) {
      await SettingsService.set(UTILITY_KEYS.enabled, input.enabled ? '1' : '0');
    }
    return this.getGeneral();
  }

  /* ---------------- Prioridad: servicio > general > nada --------------- */

  /**
   * Determina el monto de utilidad por unidad para un servicio:
   *  1. Configuración específica del servicio (si está habilitada, su monto; si está
   *     marcada "sin utilidad", no se genera nada).
   *  2. Si no hay configuración específica, el monto general (si está activo y > 0).
   *  3. En cualquier otro caso, no corresponde utilidad.
   * Nunca se suman ambos montos.
   */
  static async resolveForService(
    serviceId: string,
    general?: { amount: number; enabled: boolean },
  ): Promise<UtilityResolution> {
    const db = getDb();

    const specific = (await db
      .prepare('SELECT amount, is_enabled FROM service_utilities WHERE service_id = ?')
      .get(serviceId)) as { amount: unknown; is_enabled: unknown } | undefined;

    if (specific) {
      if (!bool(specific.is_enabled)) {
        return { eligible: false, amount: 0, source: null, reason: 'Este servicio no permite utilidad' };
      }
      const amount = num(specific.amount);
      if (amount > 0) {
        return { eligible: true, amount: roundGs(amount), source: 'service' };
      }
      return { eligible: false, amount: 0, source: null, reason: 'El monto de utilidad del servicio es 0' };
    }

    const gen = general ?? (await this.getGeneral());
    if (!gen.enabled) {
      return { eligible: false, amount: 0, source: null, reason: 'La utilidad general está desactivada' };
    }
    if (gen.amount <= 0) {
      return { eligible: false, amount: 0, source: null, reason: 'No hay un monto de utilidad general configurado' };
    }
    return { eligible: true, amount: roundGs(gen.amount), source: 'general' };
  }

  /* --------------------- Habilitación por estilista -------------------- */

  /** Estilistas activas (no eliminadas) con su indicador de habilitación. */
  static async listStylistsWithStatus(): Promise<Array<{ id: string; full_name: string; is_active: boolean; can_receive_utility: boolean }>> {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT st.id, st.full_name, st.is_active, COALESCE(us.is_enabled, 0) as can_receive
      FROM stylists st
      LEFT JOIN stylist_utility_settings us ON us.stylist_id = st.id
      WHERE st.deleted_at IS NULL AND st.is_active = 1
      ORDER BY st.full_name ASC
    `).all()) as any[];

    return rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      is_active: bool(r.is_active),
      can_receive_utility: bool(r.can_receive),
    }));
  }

  static async setStylistEnabled(stylistId: string, enabled: boolean): Promise<{ stylist_id: string; can_receive_utility: boolean }> {
    const db = getDb();
    const stylist = await db
      .prepare('SELECT id FROM stylists WHERE id = ? AND deleted_at IS NULL')
      .get(stylistId);
    if (!stylist) {
      throw new AppError('Estilista no encontrado', 404);
    }

    const now = new Date().toISOString();
    const existing = await db
      .prepare('SELECT stylist_id FROM stylist_utility_settings WHERE stylist_id = ?')
      .get(stylistId);

    if (existing) {
      await db
        .prepare('UPDATE stylist_utility_settings SET is_enabled = ?, updated_at = ? WHERE stylist_id = ?')
        .run(enabled ? 1 : 0, now, stylistId);
    } else {
      await db
        .prepare('INSERT INTO stylist_utility_settings (stylist_id, is_enabled, updated_at) VALUES (?, ?, ?)')
        .run(stylistId, enabled ? 1 : 0, now);
    }
    return { stylist_id: stylistId, can_receive_utility: enabled };
  }

  /**
   * Comprueba (del lado del servidor) que una estilista puede actuar como auxiliar.
   * Lanza AppError con un mensaje claro si no puede.
   */
  static async assertHelperAllowed(helperId: string, mainStylistId?: string | null): Promise<{ id: string; full_name: string }> {
    if (mainStylistId && helperId === mainStylistId) {
      throw new AppError('La estilista auxiliar no puede ser la misma que la estilista principal del servicio', 400);
    }

    const db = getDb();
    const helper = (await db.prepare(`
      SELECT st.id, st.full_name, st.is_active, COALESCE(us.is_enabled, 0) as can_receive
      FROM stylists st
      LEFT JOIN stylist_utility_settings us ON us.stylist_id = st.id
      WHERE st.id = ? AND st.deleted_at IS NULL
    `).get(helperId)) as any;

    if (!helper) {
      throw new AppError('La estilista auxiliar seleccionada no existe', 400);
    }
    if (!bool(helper.is_active)) {
      throw new AppError(`La estilista auxiliar "${helper.full_name}" no está activa`, 400);
    }
    if (!bool(helper.can_receive)) {
      throw new AppError(`"${helper.full_name}" no está habilitada para recibir utilidad como estilista auxiliar`, 400);
    }
    return { id: helper.id, full_name: helper.full_name };
  }

  /* ---------------------- Configuración por servicio ------------------- */

  static async setServiceConfig(
    serviceId: string,
    input: { amount?: unknown; is_enabled?: unknown },
  ): Promise<{ service_id: string; amount: number; is_enabled: boolean }> {
    const db = getDb();
    const service = await db.prepare('SELECT id FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      throw new AppError('Servicio no encontrado', 404);
    }

    const existing = (await db
      .prepare('SELECT amount, is_enabled FROM service_utilities WHERE service_id = ?')
      .get(serviceId)) as { amount: unknown; is_enabled: unknown } | undefined;

    const isEnabled = input.is_enabled === undefined ? (existing ? bool(existing.is_enabled) : true) : Boolean(input.is_enabled);

    let amount: number;
    if (input.amount !== undefined) {
      amount = parseAmount(input.amount, 'El monto de utilidad del servicio');
    } else if (existing) {
      amount = num(existing.amount);
    } else {
      throw new AppError('El monto de utilidad del servicio es obligatorio', 400);
    }

    if (isEnabled && amount <= 0) {
      throw new AppError('El monto de utilidad debe ser mayor a 0. Si el servicio no debe generar utilidad, desactivá la opción "Permite utilidad".', 400);
    }

    const now = new Date().toISOString();
    if (existing) {
      await db
        .prepare('UPDATE service_utilities SET amount = ?, is_enabled = ?, updated_at = ? WHERE service_id = ?')
        .run(amount, isEnabled ? 1 : 0, now, serviceId);
    } else {
      await db
        .prepare(`
          INSERT INTO service_utilities (id, service_id, amount, is_enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(`su-${crypto.randomUUID().slice(0, 8)}`, serviceId, amount, isEnabled ? 1 : 0, now, now);
    }
    return { service_id: serviceId, amount, is_enabled: isEnabled };
  }

  /** Quita la configuración específica: el servicio vuelve a usar el monto general. */
  static async removeServiceConfig(serviceId: string): Promise<void> {
    const db = getDb();
    await db.prepare('DELETE FROM service_utilities WHERE service_id = ?').run(serviceId);
  }

  /* ----------------------- Pantalla de configuración ------------------- */

  static async getConfig() {
    const db = getDb();
    const general = await this.getGeneral();

    const services = (await db.prepare(`
      SELECT s.id, s.name, s.price, c.name as category_name,
             su.amount as specific_amount, su.is_enabled as specific_enabled,
             CASE WHEN su.id IS NULL THEN 0 ELSE 1 END as has_specific
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN service_utilities su ON su.service_id = s.id
      WHERE s.is_active = 1
      ORDER BY s.name ASC
    `).all()) as any[];

    const serviceRows = await Promise.all(
      services.map(async (s) => {
        const resolution = await this.resolveForService(s.id, general);
        const hasSpecific = bool(s.has_specific);
        const mode: 'general' | 'custom' | 'disabled' = !hasSpecific
          ? 'general'
          : bool(s.specific_enabled)
            ? 'custom'
            : 'disabled';
        return {
          id: s.id,
          name: s.name,
          price: num(s.price),
          category_name: s.category_name ?? null,
          mode,
          specific_amount: hasSpecific ? num(s.specific_amount) : null,
          effective_amount: resolution.amount,
          eligible: resolution.eligible,
          source: resolution.source,
          reason: resolution.reason ?? null,
        };
      }),
    );

    return {
      general,
      services: serviceRows,
      stylists: await this.listStylistsWithStatus(),
      summary: await this.getSummary(),
    };
  }

  /* --------------------------- Datos para el POS ----------------------- */

  /**
   * Información mínima que necesita el POS: por cada servicio, si admite utilidad y
   * cuánto, y la lista de estilistas habilitadas para ser auxiliares.
   */
  static async getPosConfig() {
    const db = getDb();
    const general = await this.getGeneral();

    const services = (await db
      .prepare('SELECT id FROM services WHERE is_active = 1')
      .all()) as Array<{ id: string }>;

    const byService: Record<string, { eligible: boolean; amount: number; source: UtilitySource | null }> = {};
    for (const s of services) {
      const r = await this.resolveForService(s.id, general);
      byService[s.id] = { eligible: r.eligible, amount: r.amount, source: r.source };
    }

    const helpers = (await this.listStylistsWithStatus())
      .filter((st) => st.can_receive_utility)
      .map((st) => ({ id: st.id, full_name: st.full_name }));

    return { services: byService, helpers };
  }

  /* --------------------------- Registro en ventas ---------------------- */

  /**
   * Valida y calcula la utilidad de una línea de venta. NO escribe en la base:
   * se usa dentro de la transacción de la venta, antes de insertar nada.
   * El monto lo determina siempre el servidor (se ignora cualquier monto del cliente).
   */
  static async prepareForSaleItem(
    item: { item_type: string; item_id: string; item_name: string; quantity: number; stylist_id?: string | null },
    helperStylistId: string,
    general?: { amount: number; enabled: boolean },
  ) {
    if (item.item_type !== 'service') {
      throw new AppError(`Solo los servicios admiten estilista auxiliar ("${item.item_name}" no es un servicio)`, 400);
    }
    if (!item.stylist_id) {
      throw new AppError(`El servicio "${item.item_name}" necesita una estilista principal antes de agregar una auxiliar`, 400);
    }

    const helper = await this.assertHelperAllowed(helperStylistId, item.stylist_id);

    const db = getDb();
    const service = (await db
      .prepare('SELECT id, name, is_active FROM services WHERE id = ?')
      .get(item.item_id)) as { id: string; name: string; is_active: unknown } | undefined;
    if (!service) {
      throw new AppError(`El servicio "${item.item_name}" no existe`, 400);
    }

    const resolution = await this.resolveForService(service.id, general);
    if (!resolution.eligible) {
      throw new AppError(
        `No se puede asignar utilidad en "${item.item_name}": ${resolution.reason ?? 'el servicio no está habilitado para utilidad'}`,
        400,
      );
    }

    const quantity = Number(item.quantity);
    const unitAmount = resolution.amount;
    return {
      helper,
      service_id: service.id,
      source: resolution.source as UtilitySource,
      quantity,
      unit_amount: unitAmount,
      amount: roundGs(unitAmount * quantity),
    };
  }

  /** Inserta la utilidad ya validada (dentro de la transacción de la venta). */
  static async insertForSaleItem(data: {
    saleId: string;
    saleItemId: string;
    serviceId: string;
    serviceName: string;
    mainStylistId: string;
    helperStylistId: string;
    quantity: number;
    unitAmount: number;
    amount: number;
    source: UtilitySource;
    invoiceNumber: string;
    createdAt: string;
  }): Promise<string> {
    const db = getDb();
    const id = `util-${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare(`
      INSERT INTO utilities (
        id, sale_id, sale_item_id, service_id, service_name, main_stylist_id, helper_stylist_id,
        quantity, unit_amount, amount, source, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id,
      data.saleId,
      data.saleItemId,
      data.serviceId,
      data.serviceName,
      data.mainStylistId,
      data.helperStylistId,
      data.quantity,
      data.unitAmount,
      data.amount,
      data.source,
      `Utilidad por ayudar en ${data.serviceName} (Ticket ${data.invoiceNumber})`,
      data.createdAt,
    );
    return id;
  }

  /* ----------------------------- Anulaciones --------------------------- */

  /**
   * Regla al anular una venta:
   *  - Si alguna utilidad de la venta ya fue liquidada → la venta NO se puede anular
   *    (igual que ocurre con las comisiones ya pagadas). Hay que revertir primero el pago.
   *  - Si están pendientes → pasan a "cancelada" (queda el rastro, no cuentan para pagos).
   */
  static async cancelForSale(saleId: string, reason: string): Promise<number> {
    const db = getDb();

    const paid = (await db.prepare(`
      SELECT u.id, hst.full_name as helper_name
      FROM utilities u
      LEFT JOIN stylists hst ON u.helper_stylist_id = hst.id
      WHERE u.sale_id = ? AND (u.status = 'paid' OR u.payout_id IS NOT NULL)
    `).all(saleId)) as any[];

    if (paid.length > 0) {
      throw new AppError(
        `No es posible anular la venta: incluye utilidades que ya fueron liquidadas y abonadas a la estilista auxiliar (${paid[0].helper_name ?? 'auxiliar'}) en el historial de pagos`,
        400,
      );
    }

    const pending = (await db
      .prepare("SELECT COUNT(*) as n FROM utilities WHERE sale_id = ? AND status = 'pending'")
      .get(saleId)) as { n: unknown } | undefined;

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE utilities
      SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?
      WHERE sale_id = ? AND status = 'pending'
    `).run(now, reason, saleId);

    return num(pending?.n);
  }

  /** Cancela una utilidad pendiente puntual (acción de administrador, con auditoría). */
  static async cancelPending(userId: string, utilityId: string, reason?: string) {
    if (!utilityId) {
      throw new AppError('Identificador de utilidad requerido', 400);
    }

    return await transaction(async () => {
      const db = getDb();
      const row = (await db.prepare(`
        ${RECORD_SELECT}
        WHERE u.id = ?
      `).get(utilityId)) as any;

      if (!row) {
        throw new AppError('La utilidad no existe', 404);
      }
      if (row.status !== 'pending') {
        throw new AppError('Solo se pueden cancelar utilidades pendientes (esta ya fue liquidada o cancelada)', 400);
      }

      const now = new Date().toISOString();
      const cancelReason = reason?.trim() || 'Utilidad excluida por administrador';

      const result = await db.prepare(`
        UPDATE utilities
        SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?
        WHERE id = ? AND status = 'pending'
      `).run(now, cancelReason, utilityId);

      if (result.changes === 0) {
        throw new AppError('La utilidad ya fue procesada en otra operación', 409);
      }

      const user = (await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId)) as any;
      await db.prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details, created_at)
        VALUES (?, 'cancel_pending_utility', 'utility', ?, ?, ?, ?, ?)
      `).run(
        `aud-${crypto.randomUUID().slice(0, 8)}`,
        utilityId,
        userId,
        user?.full_name || 'Administrador del sistema',
        JSON.stringify({
          helper_stylist_id: row.helper_stylist_id,
          helper_stylist_name: row.helper_stylist_name,
          service_name: row.service_name,
          invoice_number: row.invoice_number,
          amount: num(row.amount),
          reason: cancelReason,
        }),
        now,
      );

      return {
        id: utilityId,
        helper_stylist_id: row.helper_stylist_id as string,
        amount: num(row.amount),
        service_name: row.service_name as string,
      };
    });
  }

  /** Al eliminar (lógicamente) una estilista, sus utilidades pendientes dejan de ser cobrables. */
  static async cancelPendingForStylist(stylistId: string, reason: string): Promise<number> {
    const db = getDb();
    const pending = (await db
      .prepare("SELECT COUNT(*) as n FROM utilities WHERE helper_stylist_id = ? AND status = 'pending'")
      .get(stylistId)) as { n: unknown } | undefined;

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE utilities
      SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?
      WHERE helper_stylist_id = ? AND status = 'pending'
    `).run(now, reason, stylistId);

    return num(pending?.n);
  }

  /* ------------------------ Consultas y resúmenes ---------------------- */

  static async list(filters: { stylistId?: string; status?: string; search?: string } = {}): Promise<UtilityRecord[]> {
    const db = getDb();
    let query = `${RECORD_SELECT} WHERE 1=1`;
    const params: any[] = [];

    if (filters.stylistId) {
      query += ' AND u.helper_stylist_id = ?';
      params.push(filters.stylistId);
    }
    if (filters.status) {
      if (!['pending', 'paid', 'cancelled'].includes(filters.status)) {
        throw new AppError('Estado de utilidad inválido', 400);
      }
      query += ' AND u.status = ?';
      params.push(filters.status);
    }
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(hst.full_name) LIKE ? OR LOWER(mst.full_name) LIKE ? OR LOWER(u.service_name) LIKE ? OR LOWER(s.invoice_number) LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY u.created_at DESC';
    const rows = (await db.prepare(query).all(...params)) as any[];
    return rows.map(mapRecord);
  }

  static async getSummary() {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT status, COUNT(*) as n, COALESCE(SUM(amount), 0) as total
      FROM utilities
      GROUP BY status
    `).all()) as Array<{ status: UtilityStatus; n: unknown; total: unknown }>;

    const pick = (status: UtilityStatus) => {
      const r = rows.find((x) => x.status === status);
      return { count: num(r?.n), total: num(r?.total) };
    };

    const pending = pick('pending');
    const paid = pick('paid');
    const cancelled = pick('cancelled');

    return {
      pending_count: pending.count,
      pending_total: pending.total,
      paid_count: paid.count,
      paid_total: paid.total,
      cancelled_count: cancelled.count,
      cancelled_total: cancelled.total,
    };
  }
}
