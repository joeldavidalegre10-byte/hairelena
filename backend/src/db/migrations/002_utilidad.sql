-- Migration 002: Módulo Utilidad (SQLite)
-- Aditiva: solo CREATE ... IF NOT EXISTS. Se aplica sola al iniciar el backend.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS service_utilities (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
    amount REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

CREATE TABLE IF NOT EXISTS stylist_utility_settings (
    stylist_id TEXT PRIMARY KEY REFERENCES stylists(id) ON DELETE CASCADE,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

CREATE TABLE IF NOT EXISTS utilities (
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
  );

CREATE TABLE IF NOT EXISTS stylist_payout_utility_items (
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
  );

CREATE INDEX IF NOT EXISTS idx_utilities_helper_status ON utilities(helper_stylist_id, status);

CREATE INDEX IF NOT EXISTS idx_utilities_sale ON utilities(sale_id);

CREATE INDEX IF NOT EXISTS idx_utilities_payout ON utilities(payout_id);

CREATE INDEX IF NOT EXISTS idx_payout_utility_items_payout ON stylist_payout_utility_items(payout_id);
