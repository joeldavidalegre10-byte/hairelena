import crypto from 'node:crypto';
import { getDb, transaction } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export interface PendingServiceDetail {
  commission_id: string;
  sale_id: string;
  sale_item_id: string;
  service_name: string;
  customer_name: string;
  service_date: string;
  /** Cantidad de veces que se hizo el servicio en esta línea de venta (ej. 3). */
  quantity: number;
  /** Precio de una sola unidad. */
  unit_price: number;
  /** Total cobrado por la línea (precio unitario × cantidad). */
  service_price: number;
  amount_to_pay: number;
  profit_margin_percent: number | null;
  commission_rate: number | null;
  invoice_number: string;
}

/** Utilidad pendiente de una estilista auxiliar (ingreso extra por ayudar en un servicio). */
export interface PendingUtilityDetail {
  utility_id: string;
  sale_id: string;
  sale_item_id: string;
  service_name: string;
  customer_name: string;
  service_date: string;
  main_stylist_name: string | null;
  quantity: number;
  amount_to_pay: number;
  invoice_number: string;
}

export interface StylistPendingSummary {
  stylist_id: string;
  stylist_name: string;
  stylist_email: string | null;
  /** Cantidad de servicios con comisión pendiente (sin contar utilidades). */
  pending_services_count: number;
  /** Total a pagar = comisiones pendientes + utilidades pendientes. */
  total_pending_amount: number;
  /** Solo comisiones / ganancias habituales. */
  total_pending_commissions: number;
  pending_utilities_count: number;
  /** Solo utilidades adicionales. */
  total_pending_utilities: number;
  services: PendingServiceDetail[];
  utilities: PendingUtilityDetail[];
}

export interface PayoutServiceItem {
  id: string;
  payout_id: string;
  commission_id: string | null;
  sale_item_id: string | null;
  service_name: string;
  customer_name: string | null;
  /** Cantidad de servicios de esta línea (1 si no se puede determinar). */
  quantity: number;
  unit_price: number;
  service_price: number;
  amount_paid: number;
  profit_margin_percent: number | null;
  commission_rate: number | null;
  service_date: string;
  created_at: string;
}

/** Detalle inmutable de una utilidad incluida en una liquidación. */
export interface PayoutUtilityItem {
  id: string;
  payout_id: string;
  utility_id: string | null;
  service_name: string;
  customer_name: string | null;
  main_stylist_name: string | null;
  invoice_number: string | null;
  service_date: string | null;
  amount_paid: number;
  created_at: string;
}

export interface StylistPayoutRecord {
  id: string;
  stylist_id: string;
  stylist_name: string;
  /** Total pagado = comisiones + utilidades. */
  total_amount: number;
  /** Cantidad de servicios con comisión (sin contar utilidades). */
  services_count: number;
  commissions_total: number;
  utilities_total: number;
  utilities_count: number;
  status: 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  services: PayoutServiceItem[];
  utilities: PayoutUtilityItem[];
}

// MySQL devuelve DECIMAL/SUM como string en mysql2: normalizamos a número.
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

// Filas afectadas por un UPDATE/DELETE, si el driver lo informa (changes o affectedRows).
const affected = (r: any): number | null => {
  const n = r?.changes ?? r?.affectedRows;
  return n === undefined || n === null ? null : Number(n);
};

// La cantidad y el precio unitario se leen de la línea de venta original (si todavía existe).
const PAYOUT_ITEM_COLUMNS = `
  spi.id, spi.payout_id, spi.commission_id, spi.sale_item_id, spi.service_name, spi.customer_name,
  spi.service_price, spi.amount_paid, spi.profit_margin_percent, spi.commission_rate, spi.service_date,
  spi.created_at, si.quantity AS quantity, si.unit_price AS unit_price
`;
const PAYOUT_ITEMS_FROM = `
  stylist_payout_items spi
  LEFT JOIN sale_items si ON spi.sale_item_id = si.id
`;

const mapPayoutItem = (it: any): PayoutServiceItem => {
  const quantity = Math.max(1, num(it.quantity));
  const servicePrice = num(it.service_price);
  return {
  id: it.id,
  payout_id: it.payout_id,
  commission_id: it.commission_id,
  sale_item_id: it.sale_item_id,
  service_name: it.service_name,
  customer_name: it.customer_name,
  quantity,
  unit_price: it.unit_price !== null && it.unit_price !== undefined ? num(it.unit_price) : servicePrice / quantity,
  service_price: servicePrice,
  amount_paid: num(it.amount_paid),
  profit_margin_percent: numOrNull(it.profit_margin_percent),
  commission_rate: numOrNull(it.commission_rate),
  service_date: it.service_date,
  created_at: it.created_at,
  };
};

const UTILITY_ITEM_COLUMNS = `
  id, payout_id, utility_id, service_name, customer_name, main_stylist_name,
  invoice_number, service_date, amount_paid, created_at
`;

const mapUtilityItem = (it: any): PayoutUtilityItem => ({
  id: it.id,
  payout_id: it.payout_id,
  utility_id: it.utility_id ?? null,
  service_name: it.service_name,
  customer_name: it.customer_name ?? null,
  main_stylist_name: it.main_stylist_name ?? null,
  invoice_number: it.invoice_number ?? null,
  service_date: it.service_date ?? null,
  amount_paid: num(it.amount_paid),
  created_at: it.created_at,
});

const mapPayout = (p: any, items: any[], utilityItems: any[] = []): StylistPayoutRecord => {
  const utilities = utilityItems.map(mapUtilityItem);
  const utilitiesTotal = utilities.reduce((sum, u) => sum + u.amount_paid, 0);
  const totalAmount = num(p.total_amount);
  const serviceItems = items.map(mapPayoutItem);
  // Servicios realizados (3 tintes = 3). Si el pago no tiene detalle, se usa lo guardado.
  const servicesDone = serviceItems.reduce((sum, it) => sum + it.quantity, 0);
  return {
    id: p.id,
    stylist_id: p.stylist_id,
    stylist_name: p.stylist_name,
    total_amount: totalAmount,
    services_count: serviceItems.length > 0 ? servicesDone : num(p.services_count),
    commissions_total: Math.max(0, totalAmount - utilitiesTotal),
    utilities_total: utilitiesTotal,
    utilities_count: utilities.length,
    status: p.status,
    notes: p.notes,
    created_at: p.created_at,
    services: serviceItems,
    utilities,
  };
};

export class CommissionsService {
  /**
   * Agrupa los servicios pendientes por estilista (Sección "Por pagar").
   */
  static async getPendingByStylist(search?: string): Promise<StylistPendingSummary[]> {
    const db = getDb();

    let query = `
      SELECT
        c.id as commission_id,
        c.amount as amount_to_pay,
        c.created_at as commission_created_at,
        st.id as stylist_id,
        st.full_name as stylist_name,
        st.email as stylist_email,
        si.id as sale_item_id,
        si.item_name as service_name,
        (si.unit_price * si.quantity) as service_price,
        si.quantity as quantity,
        si.unit_price as unit_price,
        si.profit_margin_percent,
        si.commission_rate,
        COALESCE(s.customer_name, 'Consumidor Final') as customer_name,
        s.id as sale_id,
        s.created_at as service_date,
        s.invoice_number
      FROM commissions c
      JOIN stylists st ON c.stylist_id = st.id
      JOIN sale_items si ON c.sale_item_id = si.id
      JOIN sales s ON c.sale_id = s.id
      WHERE c.status = 'pending' AND s.status = 'completed'
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(st.full_name) LIKE ? OR LOWER(si.item_name) LIKE ? OR LOWER(s.customer_name) LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY st.full_name ASC, c.created_at ASC`;

    const rows = (await db.prepare(query).all(...params)) as any[];

    // Agrupar por estilista
    const stylistMap = new Map<string, StylistPendingSummary>();

    const ensureEntry = (r: { stylist_id: string; stylist_name: string; stylist_email?: string | null }) => {
      if (!stylistMap.has(r.stylist_id)) {
        stylistMap.set(r.stylist_id, {
          stylist_id: r.stylist_id,
          stylist_name: r.stylist_name,
          stylist_email: r.stylist_email || null,
          pending_services_count: 0,
          total_pending_amount: 0,
          total_pending_commissions: 0,
          pending_utilities_count: 0,
          total_pending_utilities: 0,
          services: [],
          utilities: [],
        });
      }
      return stylistMap.get(r.stylist_id)!;
    };

    for (const r of rows) {
      const entry = ensureEntry(r);
      // Cuenta servicios realizados (3 tintes en una línea = 3), no líneas de venta.
      entry.pending_services_count += Math.max(1, num(r.quantity));
      entry.total_pending_commissions += num(r.amount_to_pay);
      entry.total_pending_amount += num(r.amount_to_pay);
      entry.services.push({
        commission_id: r.commission_id,
        sale_id: r.sale_id,
        sale_item_id: r.sale_item_id,
        service_name: r.service_name,
        customer_name: r.customer_name,
        service_date: r.service_date,
        quantity: Math.max(1, num(r.quantity)),
        unit_price: num(r.unit_price),
        service_price: num(r.service_price),
        amount_to_pay: num(r.amount_to_pay),
        profit_margin_percent: numOrNull(r.profit_margin_percent),
        commission_rate: numOrNull(r.commission_rate),
        invoice_number: r.invoice_number,
      });
    }

    // Utilidades pendientes de las estilistas auxiliares (concepto adicional a las comisiones)
    let utilityQuery = `
      SELECT
        u.id as utility_id,
        u.amount as amount_to_pay,
        u.quantity,
        u.service_name,
        u.sale_item_id,
        st.id as stylist_id,
        st.full_name as stylist_name,
        st.email as stylist_email,
        mst.full_name as main_stylist_name,
        COALESCE(s.customer_name, 'Consumidor Final') as customer_name,
        s.id as sale_id,
        s.created_at as service_date,
        s.invoice_number
      FROM utilities u
      JOIN stylists st ON u.helper_stylist_id = st.id
      JOIN sales s ON u.sale_id = s.id
      LEFT JOIN stylists mst ON u.main_stylist_id = mst.id
      WHERE u.status = 'pending' AND s.status = 'completed'
    `;
    const utilityParams: any[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      utilityQuery += ` AND (LOWER(st.full_name) LIKE ? OR LOWER(u.service_name) LIKE ? OR LOWER(s.customer_name) LIKE ?)`;
      utilityParams.push(term, term, term);
    }

    utilityQuery += ` ORDER BY st.full_name ASC, u.created_at ASC`;

    const utilityRows = (await db.prepare(utilityQuery).all(...utilityParams)) as any[];

    for (const r of utilityRows) {
      const entry = ensureEntry(r);
      entry.pending_utilities_count += 1;
      entry.total_pending_utilities += num(r.amount_to_pay);
      entry.total_pending_amount += num(r.amount_to_pay);
      entry.utilities.push({
        utility_id: r.utility_id,
        sale_id: r.sale_id,
        sale_item_id: r.sale_item_id,
        service_name: r.service_name,
        customer_name: r.customer_name,
        service_date: r.service_date,
        main_stylist_name: r.main_stylist_name ?? null,
        quantity: num(r.quantity),
        amount_to_pay: num(r.amount_to_pay),
        invoice_number: r.invoice_number,
      });
    }

    return Array.from(stylistMap.values())
      .filter((s) => s.pending_services_count > 0 || s.pending_utilities_count > 0)
      .sort((a, b) => a.stylist_name.localeCompare(b.stylist_name));
  }

  static async createPayout(stylistId: string, notes?: string): Promise<StylistPayoutRecord> {
    if (!stylistId) {
      throw new AppError('Debe especificar el identificador del estilista', 400);
    }

    return await transaction(async () => {
      const db = getDb();

      // 1. Obtener comisiones pendientes
      const pending = (await db.prepare(`
        SELECT
          c.id as commission_id,
          c.amount,
          si.id as sale_item_id,
          si.item_name,
          (si.unit_price * si.quantity) as service_price,
          si.quantity as quantity,
          si.unit_price as unit_price,
          si.profit_margin_percent,
          si.commission_rate,
          COALESCE(s.customer_name, 'Consumidor Final') as customer_name,
          s.created_at as service_date
        FROM commissions c
        JOIN sale_items si ON c.sale_item_id = si.id
        JOIN sales s ON c.sale_id = s.id
        WHERE c.stylist_id = ? AND c.status = 'pending' AND s.status = 'completed'
        ORDER BY c.created_at ASC
      `).all(stylistId)) as any[];

      // 1b. Utilidades pendientes de la estilista como auxiliar (concepto adicional)
      const pendingUtilities = (await db.prepare(`
        SELECT
          u.id as utility_id,
          u.amount,
          u.service_name,
          s.invoice_number,
          COALESCE(s.customer_name, 'Consumidor Final') as customer_name,
          s.created_at as service_date,
          mst.full_name as main_stylist_name
        FROM utilities u
        JOIN sales s ON u.sale_id = s.id
        LEFT JOIN stylists mst ON u.main_stylist_id = mst.id
        WHERE u.helper_stylist_id = ? AND u.status = 'pending' AND s.status = 'completed'
        ORDER BY u.created_at ASC
      `).all(stylistId)) as any[];

      if ((!pending || pending.length === 0) && (!pendingUtilities || pendingUtilities.length === 0)) {
        throw new AppError('El estilista no tiene servicios pendientes de pago', 400);
      }

      const commissionsTotal = pending.reduce((sum, item) => sum + num(item.amount), 0);
      const utilitiesTotal = pendingUtilities.reduce((sum, item) => sum + num(item.amount), 0);
      const totalAmount = commissionsTotal + utilitiesTotal;
      if (totalAmount <= 0) {
        throw new AppError('El importe total a pagar debe ser mayor a 0', 400);
      }

      const payoutId = `payout-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();

      // 2. Insertar cabecera del pago (total = comisiones + utilidades)
      await db.prepare(`
        INSERT INTO stylist_payouts (
          id, stylist_id, total_amount, services_count, status, notes, created_at
        ) VALUES (?, ?, ?, ?, 'completed', ?, ?)
      `).run(payoutId, stylistId, totalAmount, pending.length, notes || null, now);

      // 3. Insertar cada ítem del pago (snapshot histórico inmutable)
      const insertItem = db.prepare(`
        INSERT INTO stylist_payout_items (
          id, payout_id, commission_id, sale_item_id, service_name, customer_name,
          service_price, amount_paid, profit_margin_percent, commission_rate, service_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const payoutItems: PayoutServiceItem[] = [];

      for (const p of pending) {
        const itemId = `poi-${crypto.randomUUID().slice(0, 8)}`;
        const profitMargin = numOrNull(p.profit_margin_percent);
        const commRate = numOrNull(p.commission_rate);
        const itemAmount = num(p.amount);
        const itemPrice = num(p.service_price);

        await insertItem.run(
          itemId,
          payoutId,
          p.commission_id,
          p.sale_item_id,
          p.item_name,
          p.customer_name,
          itemPrice,
          itemAmount,
          profitMargin,
          commRate,
          p.service_date,
          now
        );

        payoutItems.push({
          id: itemId,
          payout_id: payoutId,
          commission_id: p.commission_id,
          sale_item_id: p.sale_item_id,
          service_name: p.item_name,
          customer_name: p.customer_name,
          quantity: Math.max(1, num(p.quantity)),
          unit_price: num(p.unit_price),
          service_price: itemPrice,
          amount_paid: itemAmount,
          profit_margin_percent: profitMargin,
          commission_rate: commRate,
          service_date: p.service_date,
          created_at: now,
        });
      }

      // 3b. Snapshot de las utilidades incluidas en el pago
      const insertUtilityItem = db.prepare(`
        INSERT INTO stylist_payout_utility_items (
          id, payout_id, utility_id, service_name, customer_name, main_stylist_name,
          invoice_number, service_date, amount_paid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const payoutUtilities: PayoutUtilityItem[] = [];

      for (const u of pendingUtilities) {
        const itemId = `pui-${crypto.randomUUID().slice(0, 8)}`;
        const amount = num(u.amount);

        await insertUtilityItem.run(
          itemId,
          payoutId,
          u.utility_id,
          u.service_name,
          u.customer_name,
          u.main_stylist_name ?? null,
          u.invoice_number ?? null,
          u.service_date,
          amount,
          now
        );

        payoutUtilities.push({
          id: itemId,
          payout_id: payoutId,
          utility_id: u.utility_id,
          service_name: u.service_name,
          customer_name: u.customer_name,
          main_stylist_name: u.main_stylist_name ?? null,
          invoice_number: u.invoice_number ?? null,
          service_date: u.service_date,
          amount_paid: amount,
          created_at: now,
        });
      }

      // 4. Marcar comisiones como pagadas
      if (pending.length > 0) {
        const commissionIds = pending.map((p) => p.commission_id);
        const placeholders = commissionIds.map(() => '?').join(',');
        await db.prepare(`
          UPDATE commissions
          SET status = 'paid', paid_at = ?, payout_id = ?
          WHERE id IN (${placeholders}) AND status = 'pending'
        `).run(now, payoutId, ...commissionIds);

        // Prevención de pagos duplicados / colisión concurrente.
        // Se cuenta lo que realmente quedó ligado a este pago (no depende de lo que devuelva run()).
        const linked = (await db.prepare(
          'SELECT COUNT(*) as n FROM commissions WHERE payout_id = ?'
        ).get(payoutId)) as any;

        if (num(linked?.n) !== commissionIds.length) {
          throw new AppError('Conflicto de concurrencia: una o más comisiones ya fueron procesadas en otra operación', 409);
        }
      }

      // 4b. Marcar utilidades como pagadas (una utilidad solo puede pagarse una vez:
      // el UPDATE exige status = 'pending' y luego se verifica cuántas quedaron ligadas).
      if (pendingUtilities.length > 0) {
        const utilityIds = pendingUtilities.map((u) => u.utility_id);
        const utilityPlaceholders = utilityIds.map(() => '?').join(',');
        await db.prepare(`
          UPDATE utilities
          SET status = 'paid', paid_at = ?, payout_id = ?
          WHERE id IN (${utilityPlaceholders}) AND status = 'pending'
        `).run(now, payoutId, ...utilityIds);

        const linkedUtilities = (await db.prepare(
          "SELECT COUNT(*) as n FROM utilities WHERE payout_id = ? AND status = 'paid'"
        ).get(payoutId)) as any;

        if (num(linkedUtilities?.n) !== utilityIds.length) {
          throw new AppError('Conflicto de concurrencia: una o más utilidades ya fueron procesadas en otra operación', 409);
        }
      }

      const stylist = (await db.prepare('SELECT full_name FROM stylists WHERE id = ?').get(stylistId)) as any;

      return {
        id: payoutId,
        stylist_id: stylistId,
        stylist_name: stylist?.full_name || 'Estilista',
        total_amount: totalAmount,
        services_count: payoutItems.reduce((sum, it) => sum + it.quantity, 0),
        commissions_total: commissionsTotal,
        utilities_total: utilitiesTotal,
        utilities_count: payoutUtilities.length,
        status: 'completed',
        notes: notes || null,
        created_at: now,
        services: payoutItems,
        utilities: payoutUtilities,
      };
    });
  }

  static async listPayouts(stylistId?: string, search?: string): Promise<StylistPayoutRecord[]> {
    const db = getDb();

    let query = `
      SELECT
        p.id,
        p.stylist_id,
        st.full_name as stylist_name,
        p.total_amount,
        p.services_count,
        p.status,
        p.notes,
        p.created_at
      FROM stylist_payouts p
      JOIN stylists st ON p.stylist_id = st.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (stylistId) {
      query += ` AND p.stylist_id = ?`;
      params.push(stylistId);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(st.full_name) LIKE ? OR p.created_at LIKE ?)`;
      params.push(term, term);
    }

    query += ` ORDER BY p.created_at DESC`;

    const payouts = (await db.prepare(query).all(...params)) as any[];

    if (payouts.length === 0) {
      return [];
    }

    // Ítems de todos los pagos en pocas consultas (en lotes), en lugar de una por pago
    const itemsByPayout = new Map<string, any[]>();
    const ids = payouts.map((p) => p.id);
    const CHUNK = 500;

    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = (await db.prepare(`
        SELECT ${PAYOUT_ITEM_COLUMNS}
        FROM ${PAYOUT_ITEMS_FROM}
        WHERE spi.payout_id IN (${placeholders})
        ORDER BY spi.service_date ASC
      `).all(...chunk)) as any[];

      for (const row of rows) {
        const bucket = itemsByPayout.get(row.payout_id);
        if (bucket) bucket.push(row);
        else itemsByPayout.set(row.payout_id, [row]);
      }
    }

    // Utilidades incluidas en cada pago (snapshot), en lotes igual que los ítems
    const utilityItemsByPayout = new Map<string, any[]>();

    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = (await db.prepare(`
        SELECT ${UTILITY_ITEM_COLUMNS}
        FROM stylist_payout_utility_items
        WHERE payout_id IN (${placeholders})
        ORDER BY service_date ASC
      `).all(...chunk)) as any[];

      for (const row of rows) {
        const bucket = utilityItemsByPayout.get(row.payout_id);
        if (bucket) bucket.push(row);
        else utilityItemsByPayout.set(row.payout_id, [row]);
      }
    }

    return payouts.map((p) =>
      mapPayout(p, itemsByPayout.get(p.id) || [], utilityItemsByPayout.get(p.id) || [])
    );
  }

  static async getPayoutById(payoutId: string): Promise<StylistPayoutRecord | null> {
    const db = getDb();
    const p = (await db.prepare(`
      SELECT
        p.id,
        p.stylist_id,
        st.full_name as stylist_name,
        p.total_amount,
        p.services_count,
        p.status,
        p.notes,
        p.created_at
      FROM stylist_payouts p
      JOIN stylists st ON p.stylist_id = st.id
      WHERE p.id = ?
    `).get(payoutId)) as any;

    if (!p) return null;

    const items = (await db.prepare(`
      SELECT ${PAYOUT_ITEM_COLUMNS}
      FROM ${PAYOUT_ITEMS_FROM}
      WHERE spi.payout_id = ?
      ORDER BY spi.service_date ASC
    `).all(p.id)) as any[];

    const utilityItems = (await db.prepare(`
      SELECT ${UTILITY_ITEM_COLUMNS}
      FROM stylist_payout_utility_items
      WHERE payout_id = ?
      ORDER BY service_date ASC
    `).all(p.id)) as any[];

    return mapPayout(p, items, utilityItems);
  }

  static async list(stylistId?: string, status?: string) {
    const db = getDb();
    let query = `
      SELECT c.*, st.full_name as stylist_name, s.invoice_number
      FROM commissions c
      LEFT JOIN stylists st ON c.stylist_id = st.id
      LEFT JOIN sales s ON c.sale_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (stylistId) {
      query += ' AND c.stylist_id = ?';
      params.push(stylistId);
    }
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const rows = (await db.prepare(query).all(...params)) as any[];
    return rows.map((r) => ({
      ...r,
      amount: num(r.amount),
      stylists: { full_name: r.stylist_name },
    }));
  }

  static async markAsPaid(ids: string[], notes?: string) {
    if (!ids || ids.length === 0) {
      throw new AppError('Debes seleccionar al menos una comisión para liquidar', 400);
    }

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE commissions
      SET status = 'paid', paid_at = ?, notes = COALESCE(?, notes)
      WHERE id IN (${placeholders})
    `);

    await stmt.run(now, notes || null, ...ids);

    return { updatedCount: ids.length };
  }

  static async getSummary() {
    const db = getDb();
    const pending = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE status = 'pending'").get()) as any;
    const paid = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE status = 'paid'").get()) as any;
    const count = (await db.prepare('SELECT COUNT(*) as count FROM commissions').get()) as any;

    // Utilidades (concepto adicional, separado de las comisiones)
    const utilPending = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM utilities WHERE status = 'pending'").get()) as any;
    const utilPaid = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM utilities WHERE status = 'paid'").get()) as any;

    return {
      pendingTotal: num(pending?.total),
      paidTotal: num(paid?.total),
      totalCommissions: num(count?.count),
      utilitiesPendingTotal: num(utilPending?.total),
      utilitiesPaidTotal: num(utilPaid?.total),
    };
  }

  static async revertPayout(userId: string, payoutId: string, reason?: string) {
    if (!payoutId) {
      throw new AppError('Identificador de pago requerido', 400);
    }

    return await transaction(async () => {
      const db = getDb();
      const payout = (await db.prepare('SELECT * FROM stylist_payouts WHERE id = ?').get(payoutId)) as any;
      if (!payout) {
        throw new AppError('El registro de pago no existe', 404);
      }

      if (payout.status !== 'completed') {
        throw new AppError('Este pago ya se encuentra anulado o revertido previamente', 400);
      }

      const now = new Date().toISOString();
      const reversionReason = reason?.trim() || 'Reversión autorizada por administrador';

      const updateResult = await db.prepare(`
        UPDATE commissions
        SET status = 'pending', paid_at = NULL, payout_id = NULL
        WHERE payout_id = ? OR id IN (SELECT commission_id FROM stylist_payout_items WHERE payout_id = ? AND commission_id IS NOT NULL)
      `).run(payoutId, payoutId);

      // Si el driver no informa filas afectadas, se usa la cantidad registrada en el pago
      const commissionsRestored = affected(updateResult) ?? num(payout.services_count);

      // Las utilidades liquidadas en este pago vuelven a "pendiente" (podrán pagarse de nuevo,
      // pero una sola vez: el pago revertido queda anulado). Las canceladas no se tocan.
      const utilitiesBefore = (await db.prepare(
        "SELECT COUNT(*) as n, COALESCE(SUM(amount), 0) as total FROM utilities WHERE payout_id = ? AND status = 'paid'"
      ).get(payoutId)) as any;

      await db.prepare(`
        UPDATE utilities
        SET status = 'pending', paid_at = NULL, payout_id = NULL
        WHERE payout_id = ? AND status = 'paid'
      `).run(payoutId);

      const utilitiesRestored = num(utilitiesBefore?.n);
      const utilitiesRestoredTotal = num(utilitiesBefore?.total);

      await db.prepare(`
        UPDATE stylist_payouts
        SET status = 'cancelled',
            notes = CASE
              WHEN notes IS NULL OR notes = '' THEN ?
              ELSE notes || ' | ' || ?
            END
        WHERE id = ?
      `).run(`Revertido: ${reversionReason}`, `Revertido: ${reversionReason}`, payoutId);

      const auditId = `aud-${crypto.randomUUID().slice(0, 8)}`;
      const user = (await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId)) as any;
      const userName = user?.full_name || 'Administrador del sistema';

      await db.prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details, created_at)
        VALUES (?, 'revert_payout', 'payout', ?, ?, ?, ?, ?)
      `).run(
        auditId,
        payoutId,
        userId,
        userName,
        JSON.stringify({
          stylist_id: payout.stylist_id,
          total_amount: num(payout.total_amount),
          services_count: num(payout.services_count),
          commissions_restored: commissionsRestored,
          utilities_restored: utilitiesRestored,
          utilities_restored_total: utilitiesRestoredTotal,
          reason: reversionReason,
        }),
        now
      );

      return {
        id: payoutId,
        status: 'cancelled',
        commissions_restored: commissionsRestored,
        utilities_restored: utilitiesRestored,
        total_amount: num(payout.total_amount),
      };
    });
  }

  static async deletePendingCommission(userId: string, commissionId: string, reason?: string) {
    if (!commissionId) {
      throw new AppError('Identificador de servicio pendiente requerido', 400);
    }

    return await transaction(async () => {
      const db = getDb();
      const comm = (await db.prepare(`
        SELECT c.*, st.full_name as stylist_name, si.item_name as service_name, s.invoice_number
        FROM commissions c
        JOIN stylists st ON c.stylist_id = st.id
        JOIN sale_items si ON c.sale_item_id = si.id
        JOIN sales s ON c.sale_id = s.id
        WHERE c.id = ? AND c.status = 'pending'
      `).get(commissionId)) as any;

      if (!comm) {
        throw new AppError('El servicio pendiente no existe o ya fue procesado/pagado', 404);
      }

      const now = new Date().toISOString();
      const deletionReason = reason?.trim() || 'Servicio pendiente excluido por administrador';

      await db.prepare("DELETE FROM commissions WHERE id = ? AND status = 'pending'").run(commissionId);

      const auditId = `aud-${crypto.randomUUID().slice(0, 8)}`;
      const user = (await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId)) as any;
      const userName = user?.full_name || 'Administrador del sistema';

      await db.prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details, created_at)
        VALUES (?, 'delete_pending_commission', 'commission', ?, ?, ?, ?, ?)
      `).run(
        auditId,
        commissionId,
        userId,
        userName,
        JSON.stringify({
          stylist_id: comm.stylist_id,
          stylist_name: comm.stylist_name,
          service_name: comm.service_name,
          invoice_number: comm.invoice_number,
          amount: num(comm.amount),
          sale_id: comm.sale_id,
          reason: deletionReason,
        }),
        now
      );

      return {
        id: commissionId,
        stylist_id: comm.stylist_id,
        amount: num(comm.amount),
        service_name: comm.service_name,
      };
    });
  }

  static async deleteAllPendingByStylist(userId: string, stylistId: string, reason?: string) {
    if (!stylistId) {
      throw new AppError('Identificador del profesional requerido', 400);
    }

    return await transaction(async () => {
      const db = getDb();
      const pendingList = (await db.prepare(`
        SELECT c.id, c.amount, si.item_name
        FROM commissions c
        JOIN sale_items si ON c.sale_item_id = si.id
        WHERE c.stylist_id = ? AND c.status = 'pending'
      `).all(stylistId)) as any[];

      if (!pendingList || pendingList.length === 0) {
        throw new AppError('El estilista no tiene servicios pendientes para eliminar', 400);
      }

      const stylist = (await db.prepare('SELECT full_name FROM stylists WHERE id = ?').get(stylistId)) as any;
      const stylistName = stylist?.full_name || 'Estilista';
      const totalAmount = pendingList.reduce((sum, item) => sum + num(item.amount), 0);
      const count = pendingList.length;
      const now = new Date().toISOString();
      const deletionReason = reason?.trim() || 'Eliminación masiva de pendientes autorizada por administrador';

      await db.prepare("DELETE FROM commissions WHERE stylist_id = ? AND status = 'pending'").run(stylistId);

      const auditId = `aud-${crypto.randomUUID().slice(0, 8)}`;
      const user = (await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId)) as any;
      const userName = user?.full_name || 'Administrador del sistema';

      await db.prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details, created_at)
        VALUES (?, 'delete_all_pending_commissions', 'stylist', ?, ?, ?, ?, ?)
      `).run(
        auditId,
        stylistId,
        userId,
        userName,
        JSON.stringify({
          stylist_name: stylistName,
          count,
          total_amount: totalAmount,
          reason: deletionReason,
        }),
        now
      );

      return {
        stylist_id: stylistId,
        stylist_name: stylistName,
        deleted_count: count,
        total_amount: totalAmount,
      };
    });
  }
}