import crypto from 'node:crypto';
import { getDb } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';

// MySQL devuelve las columnas DECIMAL como texto ("10.000").
// Este helper las convierte a número para que las sumas y comparaciones funcionen.
const normalizeProduct = (r: any) => {
  if (!r) return r;
  return {
    ...r,
    stock: Number(r.stock) || 0,
    min_stock: Number(r.min_stock) || 0,
    cost_price: Number(r.cost_price) || 0,
    sale_price: Number(r.sale_price) || 0,
    is_active: Boolean(r.is_active),
  };
};

type Actor = { id: string; fullName: string };

export class InventoryService {
  // Categorías
  static async listCategories() {
    const db = getDb();
    return await db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  }

  // Servicios (solo activos: los eliminados quedan ocultos pero conservan su historial)
  static async listServices() {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT s.*, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.is_active = 1
      ORDER BY s.name ASC
    `).all()) as any[];

    let variants: any[] = [];
    try {
      variants = (await db.prepare(`
        SELECT id, service_id, name, price, duration_minutes, is_active
        FROM service_variants
        WHERE is_active = 1
        ORDER BY price ASC
      `).all()) as any[];
    } catch {}

    const variantsByService = new Map<string, any[]>();
    for (const v of variants) {
      if (!variantsByService.has(v.service_id)) {
        variantsByService.set(v.service_id, []);
      }
      variantsByService.get(v.service_id)!.push({
        ...v,
        price: Number(v.price),
        is_active: Boolean(v.is_active),
      });
    }

    return rows.map((r) => ({
      ...r,
      price: Number(r.price),
      is_active: Boolean(r.is_active),
      variants: variantsByService.get(r.id) || [],
    }));
  }

  // Variantes de Servicio
  static async listServiceVariants(serviceId?: string) {
    const db = getDb();
    let query = 'SELECT * FROM service_variants WHERE is_active = 1';
    const params: any[] = [];
    if (serviceId) {
      query += ' AND service_id = ?';
      params.push(serviceId);
    }
    query += ' ORDER BY price ASC';
    return await db.prepare(query).all(...params);
  }

  static async createServiceVariant(payload: {
    service_id: string;
    name: string;
    price: number;
    duration_minutes?: number;
  }) {
    const db = getDb();
    const id = `var-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO service_variants (id, service_id, name, price, duration_minutes, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, payload.service_id, payload.name, payload.price, payload.duration_minutes || null, now);

    return await db.prepare('SELECT * FROM service_variants WHERE id = ?').get(id);
  }

  private static async getServiceWithVariants(id: string) {
    const db = getDb();
    const service = (await db.prepare('SELECT * FROM services WHERE id = ?').get(id)) as any;
    const variants = (await db
      .prepare('SELECT * FROM service_variants WHERE service_id = ? AND is_active = 1 ORDER BY price ASC')
      .all(id)) as any[];
    return {
      ...service,
      price: Number(service.price),
      variants: variants.map((v) => ({ ...v, price: Number(v.price) })),
    };
  }

  static async createService(payload: {
    category_id?: string;
    name: string;
    description?: string;
    duration_minutes?: number;
    price?: number;
    cost?: number;
    profit_margin_percent?: number | null;
    variants?: Array<{ name: string; price: number; duration_minutes?: number }>;
  }) {
    const db = getDb();
    const id = `srv-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let finalPrice = Number(payload.price) || 0;
    if (payload.variants && Array.isArray(payload.variants) && payload.variants.length > 0) {
      if (!finalPrice || finalPrice <= 0) {
        finalPrice = Number(payload.variants[0].price) || 0;
      }
    }

    await db.prepare(`
      INSERT INTO services (id, category_id, name, description, duration_minutes, price, cost, profit_margin_percent, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      payload.category_id || null,
      payload.name,
      payload.description || null,
      payload.duration_minutes || 30,
      finalPrice,
      payload.cost || 0,
      payload.profit_margin_percent !== undefined ? payload.profit_margin_percent : null,
      now,
      now
    );

    // Insertar variantes u opciones de precio si se enviaron
    if (payload.variants && Array.isArray(payload.variants) && payload.variants.length > 0) {
      const insertVarStmt = db.prepare(`
        INSERT INTO service_variants (id, service_id, name, price, duration_minutes, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `);
      for (const v of payload.variants) {
        if (v.name && v.name.trim()) {
          const varId = `var-${crypto.randomUUID().slice(0, 8)}`;
          await insertVarStmt.run(
            varId,
            id,
            v.name.trim(),
            Number(v.price) || 0,
            v.duration_minutes || null,
            now
          );
        }
      }
    }

    return await InventoryService.getServiceWithVariants(id);
  }

  static async updateService(id: string, payload: {
    category_id?: string;
    name?: string;
    description?: string;
    duration_minutes?: number;
    price?: number;
    cost?: number;
    profit_margin_percent?: number | null;
    is_active?: boolean;
    // Con "id" se actualiza la opción existente; sin "id" se crea una nueva.
    // Las opciones activas que no vengan en la lista se desactivan.
    variants?: Array<{ id?: string; name: string; price: number; duration_minutes?: number }>;
  }) {
    const db = getDb();
    const existing = await db.prepare('SELECT id FROM services WHERE id = ?').get(id);
    if (!existing) throw new AppError('Servicio no encontrado', 404);

    const updates: string[] = [];
    const values: any[] = [];

    if (payload.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(payload.category_id);
    }
    if (payload.name !== undefined) {
      updates.push('name = ?');
      values.push(payload.name);
    }
    if (payload.description !== undefined) {
      updates.push('description = ?');
      values.push(payload.description);
    }
    if (payload.duration_minutes !== undefined) {
      updates.push('duration_minutes = ?');
      values.push(payload.duration_minutes);
    }
    if (payload.price !== undefined) {
      updates.push('price = ?');
      values.push(Number(payload.price) || 0);
    }
    if (payload.cost !== undefined) {
      updates.push('cost = ?');
      values.push(payload.cost);
    }
    if (payload.profit_margin_percent !== undefined) {
      updates.push('profit_margin_percent = ?');
      values.push(payload.profit_margin_percent);
    }
    if (payload.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(payload.is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Sincronizar opciones de precio (Niño, Joven, Adulto...)
    if (Array.isArray(payload.variants)) {
      const incoming = payload.variants.filter((v) => v && String(v.name || '').trim());
      const current = (await db
        .prepare('SELECT id FROM service_variants WHERE service_id = ? AND is_active = 1')
        .all(id)) as { id: string }[];
      const currentIds = new Set(current.map((c) => c.id));
      const keepIds = new Set(incoming.filter((v) => v.id && currentIds.has(v.id)).map((v) => v.id as string));
      const now = new Date().toISOString();

      // Desactivar las opciones que ya no están en la lista
      for (const c of current) {
        if (!keepIds.has(c.id)) {
          await db.prepare('UPDATE service_variants SET is_active = 0 WHERE id = ?').run(c.id);
        }
      }

      for (const v of incoming) {
        if (v.id && currentIds.has(v.id)) {
          await db
            .prepare('UPDATE service_variants SET name = ?, price = ? WHERE id = ?')
            .run(String(v.name).trim(), Number(v.price) || 0, v.id);
        } else {
          const varId = `var-${crypto.randomUUID().slice(0, 8)}`;
          await db
            .prepare(`
              INSERT INTO service_variants (id, service_id, name, price, duration_minutes, is_active, created_at)
              VALUES (?, ?, ?, ?, ?, 1, ?)
            `)
            .run(varId, id, String(v.name).trim(), Number(v.price) || 0, v.duration_minutes || null, now);
        }
      }
    }

    return await InventoryService.getServiceWithVariants(id);
  }

  // Productos (solo activos)
  static async listProducts() {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.name ASC
    `).all()) as any[];

    return rows.map(normalizeProduct);
  }

  static async createProduct(payload: {
    category_id?: string;
    name: string;
    barcode?: string;
    sku?: string;
    description?: string;
    cost_price?: number;
    sale_price: number;
    stock?: number;
    min_stock?: number;
  }) {
    const db = getDb();
    const id = `prd-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // Si no se ingresa código de barras ni SKU, generar el código correlativo por defecto que empieza en 1
    let barcode = payload.barcode?.trim() || null;
    let sku = payload.sku?.trim() || null;

    if (!barcode && !sku) {
      let nextNum = 1;
      while (await db.prepare('SELECT id FROM products WHERE barcode = ? OR sku = ?').get(String(nextNum), String(nextNum))) {
        nextNum++;
      }
      const defaultCode = String(nextNum);
      barcode = defaultCode;
      sku = defaultCode;
    } else if (!barcode && sku) {
      barcode = sku;
    } else if (barcode && !sku) {
      sku = barcode;
    }

    await db.prepare(`
      INSERT INTO products (id, category_id, name, barcode, sku, description, cost_price, sale_price, stock, min_stock, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      payload.category_id || null,
      payload.name,
      barcode,
      sku,
      payload.description || null,
      payload.cost_price || 0,
      payload.sale_price || 0,
      payload.stock || 0,
      payload.min_stock ?? 5,
      now,
      now
    );

    const created = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return normalizeProduct(created);
  }

  static async updateProduct(id: string, payload: {
    category_id?: string | null;
    name?: string;
    barcode?: string;
    sku?: string;
    description?: string | null;
    cost_price?: number;
    sale_price?: number;
    stock?: number;
    min_stock?: number;
    is_active?: boolean;
  }) {
    const db = getDb();
    const existing = await db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) throw new AppError('Producto no encontrado', 404);

    const updates: string[] = [];
    const values: any[] = [];

    if (payload.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(payload.category_id);
    }
    if (payload.name !== undefined) {
      updates.push('name = ?');
      values.push(payload.name);
    }
    if (payload.barcode !== undefined) {
      updates.push('barcode = ?');
      values.push(payload.barcode);
    }
    if (payload.sku !== undefined) {
      updates.push('sku = ?');
      values.push(payload.sku);
    }
    if (payload.description !== undefined) {
      updates.push('description = ?');
      values.push(payload.description);
    }
    if (payload.cost_price !== undefined) {
      updates.push('cost_price = ?');
      values.push(payload.cost_price);
    }
    if (payload.sale_price !== undefined) {
      updates.push('sale_price = ?');
      values.push(payload.sale_price);
    }
    if (payload.stock !== undefined) {
      updates.push('stock = ?');
      values.push(payload.stock);
    }
    if (payload.min_stock !== undefined) {
      updates.push('min_stock = ?');
      values.push(payload.min_stock);
    }
    if (payload.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(payload.is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return normalizeProduct(updated);
  }

  static async adjustStock(id: string, adjustment: number) {
    const db = getDb();
    const product = (await db.prepare('SELECT id, stock FROM products WHERE id = ?').get(id)) as
      | { id: string; stock: number | string }
      | undefined;
    if (!product) throw new AppError('Producto no encontrado', 404);

    // El stock llega como texto desde MySQL (DECIMAL): se convierte a número antes de sumar
    const currentStock = Number(product.stock) || 0;
    const delta = Number(adjustment) || 0;
    const newStock = Math.max(0, currentStock + delta);

    await db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(newStock, id);

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return normalizeProduct(updated);
  }

  /**
   * Eliminación lógica: el registro se marca como inactivo (no se borra de la base)
   * para no romper ventas, comisiones ni reportes anteriores.
   * Deja constancia en audit_logs del motivo, quién lo pidió y qué admin autorizó.
   */
  static async deactivateItem(
    kind: 'service' | 'product',
    id: string,
    reason: string,
    requestedBy: Actor,
    authorizedBy: Actor
  ) {
    const db = getDb();
    const table = kind === 'service' ? 'services' : 'products';

    const row = (await db.prepare(`SELECT id, name, is_active FROM ${table} WHERE id = ?`).get(id)) as
      | { id: string; name: string; is_active: number }
      | undefined;
    if (!row || Number(row.is_active) !== 1) {
      throw new AppError(kind === 'service' ? 'Servicio no encontrado' : 'Producto no encontrado', 404);
    }

    await db.prepare(`UPDATE ${table} SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);

    if (kind === 'service') {
      await db.prepare('UPDATE service_variants SET is_active = 0 WHERE service_id = ?').run(id);
    }

    await db
      .prepare(`
        INSERT INTO audit_logs (id, action, target_type, target_id, user_id, user_name, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        `aud-${crypto.randomUUID().slice(0, 12)}`,
        `${kind}.delete`,
        kind,
        id,
        requestedBy.id,
        requestedBy.fullName,
        JSON.stringify({
          name: row.name,
          reason,
          requested_by: requestedBy,
          authorized_by: authorizedBy,
        })
      );

    return { id, name: row.name };
  }
}