import crypto from 'node:crypto';
import { getDb, transaction } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { SettingsService } from '../settings/settings.service.js';
const parseDetails = (raw) => {
    if (typeof raw !== 'string')
        return raw ?? {};
    try {
        return JSON.parse(raw || '{}');
    }
    catch {
        return {};
    }
};
// MySQL devuelve DECIMAL como texto ("150000.00"). Se convierte a número para
// que el frontend no concatene en lugar de sumar.
const SALE_NUMERIC_FIELDS = ['subtotal', 'discount', 'tax', 'total'];
const ITEM_NUMERIC_FIELDS = [
    'quantity',
    'unit_price',
    'subtotal',
    'commission_rate',
    'commission_amount',
    'profit_margin_percent',
    'profit_amount',
];
function normalizeRow(row, fields) {
    if (!row)
        return row;
    const out = { ...row };
    for (const f of fields) {
        if (out[f] !== null && out[f] !== undefined)
            out[f] = Number(out[f]);
    }
    return out;
}
// Parte de la venta cobrada en efectivo (la única que afecta el efectivo esperado en caja).
// Se usa igual al crear y al anular, para que ambos movimientos sean simétricos.
function cashPortion(method, details, total) {
    if (method === 'cash')
        return total;
    if (method === 'mixed') {
        const cash = Number(details?.cash) || 0;
        return Math.min(Math.max(0, cash), total);
    }
    return 0;
}
// Fecha corta YYMMDD en hora de Paraguay para el número de ticket.
function ticketDatePart() {
    const now = new Date();
    let iso;
    try {
        iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(now); // YYYY-MM-DD
    }
    catch {
        iso = now.toISOString().slice(0, 10);
    }
    return iso.slice(2).replace(/-/g, '');
}
export class SalesService {
    static async list(cashierId, role) {
        const db = getDb();
        const onlyCashier = role === 'cashier' && !!cashierId;
        const sales = (onlyCashier
            ? await db.prepare(`
          SELECT s.*, u.full_name as cashier_name
          FROM sales s
          LEFT JOIN users u ON s.cashier_id = u.id
          WHERE s.cashier_id = ?
          ORDER BY s.created_at DESC
        `).all(cashierId)
            : await db.prepare(`
          SELECT s.*, u.full_name as cashier_name
          FROM sales s
          LEFT JOIN users u ON s.cashier_id = u.id
          ORDER BY s.created_at DESC
        `).all());
        // Una sola consulta para todos los ítems (evita una consulta por venta)
        const itemsSql = `
      SELECT si.*, st.full_name as stylist_name
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN stylists st ON si.stylist_id = st.id
      ${onlyCashier ? 'WHERE s.cashier_id = ?' : ''}
    `;
        const allItems = (onlyCashier
            ? await db.prepare(itemsSql).all(cashierId)
            : await db.prepare(itemsSql).all());
        const itemsBySale = new Map();
        for (const it of allItems) {
            const normalized = normalizeRow(it, ITEM_NUMERIC_FIELDS);
            const bucket = itemsBySale.get(it.sale_id);
            if (bucket)
                bucket.push(normalized);
            else
                itemsBySale.set(it.sale_id, [normalized]);
        }
        return sales.map((sale) => ({
            ...normalizeRow(sale, SALE_NUMERIC_FIELDS),
            payment_details: parseDetails(sale.payment_details),
            items: itemsBySale.get(sale.id) || [],
        }));
    }
    static async getById(id) {
        const db = getDb();
        const sale = (await db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.id = ?
    `).get(id));
        if (!sale)
            throw new AppError('Venta no encontrada', 404);
        const items = (await db.prepare(`
      SELECT si.*, st.full_name as stylist_name
      FROM sale_items si
      LEFT JOIN stylists st ON si.stylist_id = st.id
      WHERE si.sale_id = ?
    `).all(id));
        return {
            ...normalizeRow(sale, SALE_NUMERIC_FIELDS),
            payment_details: parseDetails(sale.payment_details),
            items: items.map((it) => normalizeRow(it, ITEM_NUMERIC_FIELDS)),
        };
    }
    static async create(cashierId, rawInput) {
        if (!rawInput.items || rawInput.items.length === 0) {
            throw new AppError('El ticket debe incluir al menos un producto o servicio', 400);
        }
        // Validación de cada línea: el cliente no debe poder enviar cantidades o precios
        // negativos (sumarían stock, restarían efectivo, etc.).
        const items = rawInput.items.map((it) => {
            if (it.item_type !== 'service' && it.item_type !== 'product') {
                throw new AppError(`Tipo de ítem inválido en "${it.item_name}"`, 400);
            }
            const quantity = Number(it.quantity);
            const unitPrice = Number(it.unit_price);
            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new AppError(`La cantidad de "${it.item_name}" debe ser un entero mayor a 0`, 400);
            }
            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new AppError(`El precio de "${it.item_name}" no es válido`, 400);
            }
            // Cada servicio debe tener un estilista asignado
            if (it.item_type === 'service' && !it.stylist_id) {
                throw new AppError(`El servicio "${it.item_name}" requiere obligatoriamente la selección de un estilista responsable`, 400);
            }
            return { ...it, quantity, unit_price: unitPrice };
        });
        const input = { ...rawInput, items };
        const subtotal = items.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
        const rawDiscount = Number(input.discount ?? 0);
        if (!Number.isFinite(rawDiscount)) {
            throw new AppError('El descuento no es válido', 400);
        }
        const discount = Math.min(Math.max(0, rawDiscount), subtotal);
        const tax = 0;
        const total = Math.max(0, subtotal - discount + tax);
        return await transaction(async () => {
            const db = getDb();
            // 1. Verificar caja registradora activa (obligatoria para registrar ventas)
            const activeReg = (await db.prepare("SELECT id, status FROM cash_registers WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1").get());
            if (!activeReg) {
                throw new AppError('No es posible registrar ventas: la caja registradora se encuentra cerrada. Debe abrirse un turno de caja para operar.', 400);
            }
            const registerId = activeReg.id;
            // 2. Obtener configuración general de margen de ganancia
            const defaultProfitMargin = Number(await SettingsService.getDefaultProfitMargin());
            const saleId = `sale-${crypto.randomUUID().slice(0, 8)}`;
            const now = new Date().toISOString();
            // Ticket: fecha (hora de Paraguay) + 6 hex aleatorios. El esquema anterior usaba
            // los últimos 6 dígitos de Date.now() y se repetía cada ~16 minutos.
            const invoiceNumber = `TK-${ticketDatePart()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const paymentDetailsStr = JSON.stringify(input.payment_details || {});
            // 3. Insertar venta principal
            await db.prepare(`
        INSERT INTO sales (
          id, invoice_number, register_id, cashier_id, customer_name, customer_phone,
          subtotal, discount, tax, total, payment_method, payment_details, status, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(saleId, invoiceNumber, registerId, cashierId, input.customer_name || 'Consumidor Final', input.customer_phone || null, subtotal, discount, tax, total, input.payment_method, paymentDetailsStr, input.notes || null, now);
            // 4. Procesar ítems, stock, comisiones y ganancias
            const insertItem = db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, item_type, item_id, item_name, quantity, unit_price,
          subtotal, stylist_id, commission_rate, commission_amount, profit_margin_percent, profit_amount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertCommission = db.prepare(`
        INSERT INTO commissions (
          id, stylist_id, sale_id, sale_item_id, amount, status, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `);
            // MAX(a, b) con dos argumentos no existe en MySQL (allí MAX es agregada):
            // se usa CASE, que funciona igual en SQLite y MySQL. No baja de 0.
            const updateStock = db.prepare(`
        UPDATE products
        SET stock = CASE WHEN stock > ? THEN stock - ? ELSE 0 END, updated_at = datetime('now')
        WHERE id = ?
      `);
            const processedItems = [];
            for (const item of input.items) {
                const itemSubtotal = item.quantity * item.unit_price;
                const itemId = `si-${crypto.randomUUID().slice(0, 8)}`;
                let commRate = 0;
                let commAmount = 0;
                let profitMarginPercent = 0;
                let profitAmount = 0;
                if (item.item_type === 'service') {
                    const srv = (await db.prepare('SELECT custom_margin_active FROM services WHERE id = ?').get(item.item_id));
                    const isCustomActive = Boolean(Number(srv?.custom_margin_active));
                    let appliedProfitMargin = defaultProfitMargin;
                    if (isCustomActive && item.stylist_id) {
                        const customStylistMargin = (await db.prepare(`
              SELECT profit_margin_percent, is_active
              FROM service_stylist_margins
              WHERE service_id = ? AND stylist_id = ?
            `).get(item.item_id, item.stylist_id));
                        if (customStylistMargin &&
                            Boolean(Number(customStylistMargin.is_active)) &&
                            customStylistMargin.profit_margin_percent !== null &&
                            customStylistMargin.profit_margin_percent !== undefined &&
                            Math.abs(Number(customStylistMargin.profit_margin_percent) - defaultProfitMargin) > 0.001) {
                            appliedProfitMargin = Number(customStylistMargin.profit_margin_percent);
                        }
                    }
                    profitMarginPercent = appliedProfitMargin;
                    profitAmount = Math.round((itemSubtotal * profitMarginPercent) / 100);
                    commRate = Math.max(0, 100 - profitMarginPercent);
                    commAmount = Math.max(0, itemSubtotal - profitAmount);
                }
                else {
                    // Producto retail
                    const prd = (await db.prepare('SELECT cost_price FROM products WHERE id = ?').get(item.item_id));
                    const cost = prd ? Number(prd.cost_price) * item.quantity : 0;
                    profitAmount = Math.max(0, itemSubtotal - cost);
                    profitMarginPercent = itemSubtotal > 0 ? Number(((profitAmount / itemSubtotal) * 100).toFixed(2)) : 0;
                }
                await insertItem.run(itemId, saleId, item.item_type, item.item_id, item.item_name, item.quantity, item.unit_price, itemSubtotal, item.stylist_id || null, commRate, commAmount, profitMarginPercent, profitAmount);
                // Descontar inventario si es producto
                if (item.item_type === 'product') {
                    await updateStock.run(item.quantity, item.quantity, item.item_id);
                }
                // Registrar comisión si corresponde a un estilista
                if (item.stylist_id && commAmount > 0) {
                    const commId = `comm-${crypto.randomUUID().slice(0, 8)}`;
                    await insertCommission.run(commId, item.stylist_id, saleId, itemId, commAmount, `Comisión por ${item.item_name} (Ticket ${invoiceNumber})`, now);
                }
                processedItems.push({
                    id: itemId,
                    sale_id: saleId,
                    ...item,
                    subtotal: itemSubtotal,
                    commission_rate: commRate,
                    commission_amount: commAmount,
                    profit_margin_percent: profitMarginPercent,
                    profit_amount: profitAmount,
                });
            }
            // 5. Si el pago fue en efectivo o mixto con efectivo, registrar en la caja
            const cashAmountToAdd = cashPortion(input.payment_method, input.payment_details, total);
            if (cashAmountToAdd > 0) {
                await db.prepare(`
          UPDATE cash_registers
          SET expected_amount = expected_amount + ?
          WHERE id = ?
        `).run(cashAmountToAdd, registerId);
            }
            return {
                id: saleId,
                invoice_number: invoiceNumber,
                register_id: registerId,
                cashier_id: cashierId,
                customer_name: input.customer_name || 'Consumidor Final',
                customer_phone: input.customer_phone,
                subtotal,
                discount,
                tax,
                total,
                payment_method: input.payment_method,
                payment_details: input.payment_details,
                status: 'completed',
                created_at: now,
                items: processedItems,
            };
        });
    }
    static async cancelSale(userId, saleId, reason) {
        return await transaction(async () => {
            const db = getDb();
            const sale = (await db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId));
            if (!sale) {
                throw new AppError('Venta no encontrada', 404);
            }
            if (sale.status === 'cancelled') {
                throw new AppError('Esta venta ya se encuentra anulada/cancelada previamente', 400);
            }
            // Validar si existen comisiones ya pagadas en liquidaciones históricas
            const paidCommissions = (await db.prepare(`
        SELECT c.id, c.status, c.payout_id, st.full_name as stylist_name
        FROM commissions c
        JOIN stylists st ON c.stylist_id = st.id
        WHERE c.sale_id = ? AND (c.status = 'paid' OR c.payout_id IS NOT NULL)
      `).all(saleId));
            if (paidCommissions.length > 0) {
                throw new AppError(`No es posible anular la venta: incluye servicios cuyas comisiones ya fueron liquidadas y abonadas al estilista (${paidCommissions[0].stylist_name}) en el historial de pagos`, 400);
            }
            // Obtener ítems de la venta
            const items = (await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId));
            // 1. Revertir inventario de productos vendidos
            const restoreStock = db.prepare(`
        UPDATE products
        SET stock = stock + ?, updated_at = datetime('now')
        WHERE id = ?
      `);
            for (const item of items) {
                if (item.item_type === 'product' && item.item_id) {
                    await restoreStock.run(Number(item.quantity), item.item_id);
                }
            }
            // 2. Eliminar comisiones pendientes asociadas a la venta
            await db.prepare("DELETE FROM commissions WHERE sale_id = ? AND status = 'pending'").run(saleId);
            // 3. Ajustar saldo esperado en caja registradora si la caja está abierta y hubo cobro en efectivo
            let cashReverted = 0;
            if (sale.register_id) {
                const reg = (await db.prepare('SELECT id, status, expected_amount FROM cash_registers WHERE id = ?').get(sale.register_id));
                if (reg && reg.status === 'open') {
                    cashReverted = cashPortion(sale.payment_method, parseDetails(sale.payment_details), Number(sale.total) || 0);
                    if (cashReverted > 0) {
                        // CASE en lugar de MAX(0, a - b): compatible con SQLite y MySQL.
                        await db.prepare(`
              UPDATE cash_registers
              SET expected_amount = CASE WHEN expected_amount > ? THEN expected_amount - ? ELSE 0 END
              WHERE id = ?
            `).run(cashReverted, cashReverted, sale.register_id);
                    }
                }
            }
            const now = new Date().toISOString();
            const cancelReason = reason && reason.trim() ? reason.trim() : 'Error en cobro corregido por administrador';
            // 4. Actualizar estado de la venta a 'cancelled'.
            // La nota se arma aquí (no con ||) para no depender del modo SQL de la conexión.
            const previousNotes = sale.notes ? String(sale.notes) : '';
            const newNotes = previousNotes
                ? `${previousNotes} | Anulada: ${cancelReason}`
                : `Anulada: ${cancelReason}`;
            await db.prepare(`
        UPDATE sales
        SET status = 'cancelled', notes = ?
        WHERE id = ?
      `).run(newNotes, saleId);
            // 5. Registrar en tabla de auditoría
            const auditId = `aud-${crypto.randomUUID().slice(0, 8)}`;
            const user = (await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId));
            const userName = user?.full_name || 'Usuario del sistema';
            await db.prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details, created_at)
        VALUES (?, 'cancel_sale', 'sale', ?, ?, ?, ?, ?)
      `).run(auditId, saleId, userId, userName, JSON.stringify({
                invoice_number: sale.invoice_number,
                total: Number(sale.total),
                cash_reverted: cashReverted,
                items_count: items.length,
                reason: cancelReason,
            }), now);
            // Obtener venta actualizada
            const updated = (await db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId));
            return normalizeRow(updated, SALE_NUMERIC_FIELDS);
        });
    }
}
