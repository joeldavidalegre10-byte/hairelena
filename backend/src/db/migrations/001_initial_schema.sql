-- Migration 001: Initial SQLite Schema
-- Created automatically for Elite Studio POS Local Database

PRAGMA foreign_keys = ON;

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

CREATE TABLE IF NOT EXISTS stylists (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    commission_rate REAL NOT NULL DEFAULT 40.00,
    specialties TEXT DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('service', 'product')),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    price REAL NOT NULL DEFAULT 0.00,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    register_id TEXT NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    amount REAL NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
    payment_details TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
    commission_amount REAL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    stylist_id TEXT NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_stylist ON sale_items(stylist_id);
CREATE INDEX IF NOT EXISTS idx_commissions_stylist_status ON commissions(stylist_id, status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
