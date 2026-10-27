-- ==============================================================================
-- ELITE STUDIO POS - SQLite Database Schema
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users / Staff (Administradores, Cajeros, Estilistas)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier', 'stylist')),
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Estilistas / Barberos / Profesionales
CREATE TABLE IF NOT EXISTS stylists (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    commission_rate REAL NOT NULL DEFAULT 40.00,
    specialties TEXT DEFAULT '[]', -- JSON string array
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Categorías (Servicios y Productos)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('service', 'product')),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Servicios (Cortes, peinados, manicura, tratamientos)
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    price REAL NOT NULL DEFAULT 0.00,
    cost REAL DEFAULT 0.00,
    profit_margin_percent REAL, -- NULL indica que usa el porcentaje general del sistema
    custom_margin_active INTEGER NOT NULL DEFAULT 0, -- 1 si tiene configuración particular por estilista
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4b. Márgenes individuales por Estilista y Servicio
CREATE TABLE IF NOT EXISTS service_stylist_margins (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    stylist_id TEXT NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    profit_margin_percent REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1, -- 1 si el margen individual está activo, 0 si está pausado (usa general pero conserva el valor)
    is_hidden INTEGER NOT NULL DEFAULT 0, -- 1 si está oculto en la vista de gestión
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(service_id, stylist_id)
);

-- 4c. Variantes y Modalidades de Precio de Servicios (Largo medio, extra, retoque, etc.)
CREATE TABLE IF NOT EXISTS service_variants (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration_minutes INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Productos / Artículos (Shampoo, ceras, tintes, retail)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    sku TEXT UNIQUE,
    description TEXT,
    cost_price REAL NOT NULL DEFAULT 0.00,
    sale_price REAL NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Cajas Registradoras (Turnos y arqueo)
CREATE TABLE IF NOT EXISTS cash_registers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Caja Principal',
    status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
    opened_at TEXT,
    closed_at TEXT,
    opened_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    closed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    initial_amount REAL NOT NULL DEFAULT 0.00,
    expected_amount REAL DEFAULT 0.00,
    actual_amount REAL DEFAULT 0.00,
    difference REAL DEFAULT 0.00,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Movimientos de Efectivo (Entradas/Salidas manuales)
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    register_id TEXT NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    amount REAL NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Ventas (Cabecera de tickets)
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    register_id TEXT REFERENCES cash_registers(id) ON DELETE SET NULL,
    cashier_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT DEFAULT 'Consumidor Final',
    customer_phone TEXT,
    subtotal REAL NOT NULL DEFAULT 0.00,
    discount REAL NOT NULL DEFAULT 0.00,
    tax REAL NOT NULL DEFAULT 0.00,
    total REAL NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed')),
    payment_details TEXT DEFAULT '{}', -- JSON string
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Detalles de Venta (Líneas de ticket)
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    stylist_id TEXT REFERENCES stylists(id) ON DELETE SET NULL,
    commission_rate REAL DEFAULT 0.00,
    commission_amount REAL DEFAULT 0.00,
    profit_margin_percent REAL DEFAULT 0.00,
    profit_amount REAL DEFAULT 0.00
);

-- 10. Comisiones (Liquidación a estilistas)
CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    stylist_id TEXT NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TEXT,
    payout_id TEXT REFERENCES stylist_payouts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10b. Pagos Históricos a Estilistas (Liquidaciones completadas)
CREATE TABLE IF NOT EXISTS stylist_payouts (
    id TEXT PRIMARY KEY,
    stylist_id TEXT NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    total_amount REAL NOT NULL,
    services_count INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10c. Detalle Histórico de Servicios Pagados (Snapshot inmutable)
CREATE TABLE IF NOT EXISTS stylist_payout_items (
    id TEXT PRIMARY KEY,
    payout_id TEXT NOT NULL REFERENCES stylist_payouts(id) ON DELETE CASCADE,
    commission_id TEXT REFERENCES commissions(id) ON DELETE SET NULL,
    sale_item_id TEXT REFERENCES sale_items(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    customer_name TEXT,
    service_price REAL NOT NULL DEFAULT 0.00,
    amount_paid REAL NOT NULL,
    profit_margin_percent REAL,
    commission_rate REAL,
    service_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. Ajustes y Configuración del Sistema (Ganancias, parámetros)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Auditoría y Trazabilidad de Operaciones Sensibles
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_stylist ON sale_items(stylist_id);
CREATE INDEX IF NOT EXISTS idx_commissions_stylist_status ON commissions(stylist_id, status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_service_variants_service ON service_variants(service_id);
