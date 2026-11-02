/**
 * Esquema del módulo "Utilidad" (ingreso extra de la estilista auxiliar).
 *
 * Solo contiene CREATE TABLE IF NOT EXISTS: es aditivo y seguro de ejecutar
 * varias veces sobre una base existente. No modifica ni borra ninguna tabla
 * ni registro actual.
 *
 * Tablas:
 *  - service_utilities            Configuración específica por servicio (monto / sin utilidad).
 *  - stylist_utility_settings     Qué estilistas pueden recibir utilidad como auxiliares.
 *  - utilities                    Utilidades generadas por cada venta (copia histórica del monto).
 *  - stylist_payout_utility_items Detalle inmutable de las utilidades incluidas en cada liquidación.
 *
 * El monto general y su interruptor viven en la tabla `settings` existente
 * (claves utility_general_amount / utility_general_enabled).
 */
export const UTILITY_TABLES = [
    'service_utilities',
    'stylist_utility_settings',
    'utilities',
    'stylist_payout_utility_items',
];
/** DDL para SQLite (desarrollo local). Se incluye también en schema.sql. */
export const SQLITE_UTILITY_DDL = [
    `CREATE TABLE IF NOT EXISTS service_utilities (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
    amount REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
    `CREATE TABLE IF NOT EXISTS stylist_utility_settings (
    stylist_id TEXT PRIMARY KEY REFERENCES stylists(id) ON DELETE CASCADE,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
    `CREATE TABLE IF NOT EXISTS utilities (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    sale_item_id TEXT NOT NULL UNIQUE REFERENCES sale_items(id) ON DELETE CASCADE,
    service_id TEXT,
    service_name TEXT NOT NULL,
    main_stylist_id TEXT REFERENCES stylists(id) ON DELETE SET NULL,
    helper_stylist_id TEXT NOT NULL REFERENCES stylists(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_amount REAL NOT NULL CHECK (unit_amount >= 0),
    amount REAL NOT NULL CHECK (amount >= 0),
    source TEXT NOT NULL DEFAULT 'general' CHECK (source IN ('service', 'general')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    payout_id TEXT REFERENCES stylist_payouts(id) ON DELETE SET NULL,
    paid_at TEXT,
    cancelled_at TEXT,
    cancel_reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
    `CREATE TABLE IF NOT EXISTS stylist_payout_utility_items (
    id TEXT PRIMARY KEY,
    payout_id TEXT NOT NULL REFERENCES stylist_payouts(id) ON DELETE CASCADE,
    utility_id TEXT REFERENCES utilities(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    customer_name TEXT,
    main_stylist_name TEXT,
    invoice_number TEXT,
    service_date TEXT,
    amount_paid REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
    `CREATE INDEX IF NOT EXISTS idx_utilities_helper_status ON utilities(helper_stylist_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_utilities_sale ON utilities(sale_id)`,
    `CREATE INDEX IF NOT EXISTS idx_utilities_payout ON utilities(payout_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payout_utility_items_payout ON stylist_payout_utility_items(payout_id)`,
];
/**
 * DDL para MySQL / MariaDB.
 * `collation` se detecta en tiempo de ejecución (la de la tabla `stylists`) para que
 * las claves foráneas y los JOIN con las tablas existentes sean siempre compatibles.
 * Con `withForeignKeys = false` se crean las mismas tablas sin FOREIGN KEY
 * (respaldo por si el servidor rechazara alguna restricción).
 */
export function mysqlUtilityDdl(collation = 'utf8mb4_unicode_ci', withForeignKeys = true) {
    const charset = collation.split('_')[0] || 'utf8mb4';
    const options = `ENGINE=InnoDB DEFAULT CHARSET=${charset} COLLATE=${collation}`;
    const fk = (sql) => (withForeignKeys ? `,\n    ${sql}` : '');
    return [
        `CREATE TABLE IF NOT EXISTS service_utilities (
    id          VARCHAR(64)   NOT NULL,
    service_id  VARCHAR(64)   NOT NULL,
    amount      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    is_enabled  TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_service_utilities_service (service_id),
    CONSTRAINT chk_service_utilities_amount CHECK (amount >= 0)${fk(`CONSTRAINT fk_service_utilities_service FOREIGN KEY (service_id) REFERENCES services(id)
        ON UPDATE CASCADE ON DELETE CASCADE`)}
  ) ${options}`,
        `CREATE TABLE IF NOT EXISTS stylist_utility_settings (
    stylist_id  VARCHAR(64) NOT NULL,
    is_enabled  TINYINT(1)  NOT NULL DEFAULT 0,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (stylist_id)${fk(`CONSTRAINT fk_stylist_utility_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE CASCADE`)}
  ) ${options}`,
        `CREATE TABLE IF NOT EXISTS utilities (
    id                VARCHAR(64)   NOT NULL,
    sale_id           VARCHAR(64)   NOT NULL,
    sale_item_id      VARCHAR(64)   NOT NULL,
    service_id        VARCHAR(64)   NULL,
    service_name      VARCHAR(191)  NOT NULL,
    main_stylist_id   VARCHAR(64)   NULL,
    helper_stylist_id VARCHAR(64)   NOT NULL,
    quantity          INT           NOT NULL DEFAULT 1,
    unit_amount       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    amount            DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    source            VARCHAR(20)   NOT NULL DEFAULT 'general',
    status            VARCHAR(20)   NOT NULL DEFAULT 'pending',
    payout_id         VARCHAR(64)   NULL,
    paid_at           DATETIME      NULL,
    cancelled_at      DATETIME      NULL,
    cancel_reason     VARCHAR(500)  NULL,
    notes             TEXT          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_utilities_sale_item (sale_item_id),
    KEY idx_utilities_helper_status (helper_stylist_id, status),
    KEY idx_utilities_sale (sale_id),
    KEY idx_utilities_payout (payout_id),
    CONSTRAINT chk_utilities_status CHECK (status IN ('pending', 'paid', 'cancelled')),
    CONSTRAINT chk_utilities_source CHECK (source IN ('service', 'general')),
    CONSTRAINT chk_utilities_amount CHECK (amount >= 0 AND unit_amount >= 0 AND quantity > 0)${fk(`CONSTRAINT fk_utilities_sale FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_utilities_sale_item FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_utilities_main_stylist FOREIGN KEY (main_stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_utilities_helper_stylist FOREIGN KEY (helper_stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_utilities_payout FOREIGN KEY (payout_id) REFERENCES stylist_payouts(id)
        ON UPDATE CASCADE ON DELETE SET NULL`)}
  ) ${options}`,
        `CREATE TABLE IF NOT EXISTS stylist_payout_utility_items (
    id                VARCHAR(64)   NOT NULL,
    payout_id         VARCHAR(64)   NOT NULL,
    utility_id        VARCHAR(64)   NULL,
    service_name      VARCHAR(191)  NOT NULL,
    customer_name     VARCHAR(191)  NULL,
    main_stylist_name VARCHAR(191)  NULL,
    invoice_number    VARCHAR(100)  NULL,
    service_date      DATETIME      NULL,
    amount_paid       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_payout_utility_items_payout (payout_id),
    KEY idx_payout_utility_items_utility (utility_id)${fk(`CONSTRAINT fk_payout_utility_items_payout FOREIGN KEY (payout_id) REFERENCES stylist_payouts(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_payout_utility_items_utility FOREIGN KEY (utility_id) REFERENCES utilities(id)
        ON UPDATE CASCADE ON DELETE SET NULL`)}
  ) ${options}`,
    ];
}
