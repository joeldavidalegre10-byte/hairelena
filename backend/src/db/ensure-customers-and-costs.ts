import { getDb, transaction } from './database.js';
import {
  cleanName,
  isConsumidorFinal,
  normalizeName,
  normalizePhone,
} from '../modules/customers/customers.util.js';
import crypto from 'node:crypto';

/**
 * Migración aditiva (segura de ejecutar en cada arranque):
 *  - tabla `customers`
 *  - sales.customer_id
 *  - sale_items.cost_amount (costo registrado al momento de la venta)
 *  - services.cost_confirmed (el dueño confirmó que el costo es correcto, incluso si es 0)
 *  - rellena cost_amount de productos y crea clientes a partir de ventas viejas
 * No borra ni modifica datos existentes de ventas, comisiones ni caja.
 */
export async function ensureCustomersAndCostColumns(): Promise<void> {
  const db = getDb();
  const isMySQL = db.isMySQL();

  const hasColumn = async (table: string, column: string): Promise<boolean> => {
    if (isMySQL) {
      const row = await db
        .prepare(
          `SELECT COUNT(*) AS n FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`
        )
        .get(table, column);
      return Number(row?.n) > 0;
    }
    const cols = (await db.prepare(`PRAGMA table_info(${table})`).all()) as Array<{ name: string }>;
    return cols.some((c) => c.name === column);
  };

  const hasIndex = async (table: string, index: string): Promise<boolean> => {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`
      )
      .get(table, index);
    return Number(row?.n) > 0;
  };

  const addColumn = async (table: string, column: string, mysqlDef: string, sqliteDef: string) => {
    if (await hasColumn(table, column)) return;
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${isMySQL ? mysqlDef : sqliteDef}`);
    console.log(`Columna ${table}.${column} agregada.`);
  };

  try {
    /* ---------------- tabla customers ---------------- */
    if (isMySQL) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id               VARCHAR(64)  NOT NULL,
          full_name        VARCHAR(191) NOT NULL,
          phone            VARCHAR(40)  NULL,
          phone_normalized VARCHAR(20)  NULL,
          name_normalized  VARCHAR(191) NOT NULL,
          notes            TEXT         NULL,
          is_active        TINYINT(1)   NOT NULL DEFAULT 1,
          created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_customers_phone (phone_normalized),
          KEY idx_customers_name (name_normalized)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id               TEXT PRIMARY KEY,
          full_name        TEXT NOT NULL,
          phone            TEXT,
          phone_normalized TEXT,
          name_normalized  TEXT NOT NULL,
          notes            TEXT,
          is_active        INTEGER NOT NULL DEFAULT 1,
          created_at       TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone ON customers(phone_normalized);
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name_normalized);
      `);
    }

    /* ---------------- columnas nuevas ---------------- */
    await addColumn('sales', 'customer_id', 'VARCHAR(64) NULL DEFAULT NULL', 'TEXT');
    await addColumn('sale_items', 'cost_amount', 'DECIMAL(14,2) NULL DEFAULT NULL', 'REAL');
    await addColumn('services', 'cost_confirmed', 'TINYINT(1) NOT NULL DEFAULT 0', 'INTEGER NOT NULL DEFAULT 0');

    if (isMySQL) {
      if (!(await hasIndex('sales', 'idx_sales_customer'))) {
        await db.exec('CREATE INDEX idx_sales_customer ON sales (customer_id)');
      }
    } else {
      await db.exec('CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)');
    }

    /* ------------- costo histórico de productos -------------
     * En productos el costo ya estaba implícito: profit_amount = subtotal - costo.
     * Los servicios viejos quedan en NULL (= "sin dato"), no en 0. */
    await db.exec(`
      UPDATE sale_items
      SET cost_amount = CASE WHEN subtotal > profit_amount THEN subtotal - profit_amount ELSE 0 END
      WHERE item_type = 'product' AND cost_amount IS NULL
    `);

    await backfillCustomersFromSales();
    console.log('Clientes y costos verificados.');
  } catch (error) {
    console.warn(
      'No se pudo preparar clientes/costos automáticamente. Ejecutá sql/agregar_clientes_y_costos.sql en phpMyAdmin.',
      error
    );
  }
}

/**
 * Convierte el texto libre de ventas anteriores en clientes reales.
 * Agrupa por teléfono normalizado; si no hay teléfono, por nombre normalizado
 * (sin tildes ni mayúsculas). Solo toca ventas que todavía no tienen customer_id.
 */
async function backfillCustomersFromSales(): Promise<void> {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT id, customer_name, customer_phone FROM sales
       WHERE customer_id IS NULL AND customer_name IS NOT NULL
       ORDER BY created_at ASC`
    )
    .all()) as Array<{ id: string; customer_name: string; customer_phone: string | null }>;

  const candidates = rows
    .map((r) => ({
      saleId: r.id,
      name: cleanName(r.customer_name),
      nameNorm: normalizeName(r.customer_name),
      phoneNorm: normalizePhone(r.customer_phone),
      phoneRaw: String(r.customer_phone ?? '').trim(),
    }))
    .filter((r) => r.name && !isConsumidorFinal(r.name));

  if (candidates.length === 0) return;

  interface Group {
    key: string;
    phoneNorm: string | null;
    phoneRaw: string;
    nameNorm: string;
    spellings: Map<string, number>;
    saleIds: string[];
  }
  const groups = new Map<string, Group>();
  const group = (key: string, c: (typeof candidates)[number]): Group => {
    let g = groups.get(key);
    if (!g) {
      g = { key, phoneNorm: c.phoneNorm, phoneRaw: c.phoneRaw, nameNorm: c.nameNorm, spellings: new Map(), saleIds: [] };
      groups.set(key, g);
    }
    return g;
  };

  // 1) ventas con teléfono
  for (const c of candidates.filter((x) => x.phoneNorm)) {
    const g = group(`p:${c.phoneNorm}`, c);
    g.spellings.set(c.name, (g.spellings.get(c.name) || 0) + 1);
    g.saleIds.push(c.saleId);
  }
  // 2) ventas solo con nombre: si ese nombre pertenece a un único teléfono, se suman a él
  const phoneGroupsByName = new Map<string, Set<Group>>();
  for (const g of groups.values()) {
    for (const name of g.spellings.keys()) {
      const k = normalizeName(name);
      if (!phoneGroupsByName.has(k)) phoneGroupsByName.set(k, new Set());
      phoneGroupsByName.get(k)!.add(g);
    }
  }
  for (const c of candidates.filter((x) => !x.phoneNorm)) {
    const match = phoneGroupsByName.get(c.nameNorm);
    const g = match && match.size === 1 ? [...match][0] : group(`n:${c.nameNorm}`, c);
    g.spellings.set(c.name, (g.spellings.get(c.name) || 0) + 1);
    g.saleIds.push(c.saleId);
  }

  let created = 0;
  await transaction(async () => {
    for (const g of groups.values()) {
      const bestName = [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];

      let customer = g.phoneNorm
        ? await db.prepare('SELECT id FROM customers WHERE phone_normalized = ?').get(g.phoneNorm)
        : await db
            .prepare('SELECT id FROM customers WHERE name_normalized = ? AND phone_normalized IS NULL')
            .get(g.nameNorm);

      if (!customer) {
        const id = `cus-${crypto.randomUUID().slice(0, 8)}`;
        const now = new Date().toISOString();
        await db
          .prepare(
            `INSERT INTO customers (id, full_name, phone, phone_normalized, name_normalized, notes, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
          )
          .run(id, bestName, g.phoneRaw || null, g.phoneNorm, normalizeName(bestName), 'Importado de ventas anteriores', now, now);
        customer = { id };
        created++;
      }

      for (let i = 0; i < g.saleIds.length; i += 200) {
        const chunk = g.saleIds.slice(i, i + 200);
        await db
          .prepare(`UPDATE sales SET customer_id = ? WHERE id IN (${chunk.map(() => '?').join(',')})`)
          .run(customer.id, ...chunk);
      }
    }
  });
  console.log(`Clientes importados desde ventas anteriores: ${created}.`);
}
