-- ============================================================
-- ELITE STUDIO POS
-- Esquema de producción para MySQL 8.0.16+ / MariaDB compatible
-- Charset: utf8mb4 | Engine: InnoDB
--
-- IMPORTANTE:
-- 1. Seleccionar primero la base de datos creada en Hostinger.
-- 2. Importar este archivo desde phpMyAdmin.
-- 3. Este archivo crea estructura; NO inserta usuarios ni datos demo.
-- 4. Hacer un respaldo antes de importar en una base existente.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(64)  NOT NULL,
    username        VARCHAR(100) NOT NULL,
    email           VARCHAR(191) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(191) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'cashier',
    phone           VARCHAR(40)  NULL,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role),
    CONSTRAINT chk_users_role CHECK (role IN ('admin', 'cashier', 'stylist'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stylists (
    id              VARCHAR(64)  NOT NULL,
    user_id         VARCHAR(64)  NULL,
    full_name       VARCHAR(191) NOT NULL,
    email           VARCHAR(191) NULL,
    phone           VARCHAR(40)  NULL,
    commission_rate DECIMAL(7,2) NOT NULL DEFAULT 40.00,
    specialties     TEXT         NULL,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_stylists_user_id (user_id),
    KEY idx_stylists_active (is_active),
    CONSTRAINT fk_stylists_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id          VARCHAR(64)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    type        VARCHAR(20)  NOT NULL,
    description TEXT         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_categories_type (type),
    CONSTRAINT chk_categories_type CHECK (type IN ('service', 'product'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
    id                    VARCHAR(64)  NOT NULL,
    category_id           VARCHAR(64)  NULL,
    name                  VARCHAR(191) NOT NULL,
    description           TEXT         NULL,
    duration_minutes      INT          NOT NULL DEFAULT 0,
    price                 DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cost                  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    profit_margin_percent DECIMAL(7,2)  NOT NULL DEFAULT 0.00,
    custom_margin_active  TINYINT(1)   NOT NULL DEFAULT 0,
    is_active             TINYINT(1)   NOT NULL DEFAULT 1,
    created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_services_category (category_id),
    KEY idx_services_active (is_active),
    CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_stylist_margins (
    id                    VARCHAR(64) NOT NULL,
    service_id            VARCHAR(64) NOT NULL,
    stylist_id            VARCHAR(64) NOT NULL,
    profit_margin_percent DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    is_active             TINYINT(1) NOT NULL DEFAULT 1,
    is_hidden             TINYINT(1) NOT NULL DEFAULT 0,
    created_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_service_stylist_margin (service_id, stylist_id),
    KEY idx_ssm_stylist (stylist_id),
    CONSTRAINT fk_ssm_service FOREIGN KEY (service_id) REFERENCES services(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ssm_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_variants (
    id               VARCHAR(64)  NOT NULL,
    service_id       VARCHAR(64)  NOT NULL,
    name             VARCHAR(191) NOT NULL,
    price            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    duration_minutes INT          NOT NULL DEFAULT 0,
    is_active        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_service_variants_service (service_id),
    CONSTRAINT fk_service_variants_service FOREIGN KEY (service_id) REFERENCES services(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id          VARCHAR(64)  NOT NULL,
    category_id VARCHAR(64)  NULL,
    name        VARCHAR(191) NOT NULL,
    barcode     VARCHAR(100) NULL,
    sku         VARCHAR(100) NULL,
    description TEXT         NULL,
    cost_price  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sale_price  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    stock       DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    min_stock   DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_barcode (barcode),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_category (category_id),
    KEY idx_products_active (is_active),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_registers (
    id             VARCHAR(64)  NOT NULL,
    name           VARCHAR(150) NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'closed',
    opened_at      DATETIME     NULL,
    closed_at      DATETIME     NULL,
    opened_by      VARCHAR(64)  NULL,
    closed_by      VARCHAR(64)  NULL,
    initial_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    expected_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    actual_amount  DECIMAL(14,2) NULL,
    difference     DECIMAL(14,2) NULL,
    notes          TEXT         NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cash_register_status (status),
    KEY idx_cash_register_opened (opened_at),
    CONSTRAINT chk_cash_register_status CHECK (status IN ('open', 'closed')),
    CONSTRAINT fk_cash_register_opened_by FOREIGN KEY (opened_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_cash_register_closed_by FOREIGN KEY (closed_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
    id             VARCHAR(64)  NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    register_id    VARCHAR(64)  NULL,
    cashier_id     VARCHAR(64)  NULL,
    customer_name  VARCHAR(191) NULL,
    customer_phone VARCHAR(40)  NULL,
    subtotal       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    discount       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    tax            DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20)  NOT NULL,
    payment_details TEXT        NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'completed',
    notes          TEXT         NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_invoice (invoice_number),
    KEY idx_sales_created_at (created_at),
    KEY idx_sales_cashier (cashier_id),
    KEY idx_sales_register (register_id),
    KEY idx_sales_status (status),
    CONSTRAINT chk_sales_payment_method CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed')),
    CONSTRAINT chk_sales_status CHECK (status IN ('completed', 'cancelled')),
    CONSTRAINT fk_sales_register FOREIGN KEY (register_id) REFERENCES cash_registers(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_sales_cashier FOREIGN KEY (cashier_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
    id                    VARCHAR(64)  NOT NULL,
    sale_id               VARCHAR(64)  NOT NULL,
    item_type             VARCHAR(20)  NOT NULL,
    item_id               VARCHAR(64)  NULL,
    item_name             VARCHAR(191) NOT NULL,
    quantity              DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    unit_price            DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    subtotal              DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    stylist_id            VARCHAR(64)  NULL,
    commission_rate       DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    commission_amount     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    profit_margin_percent DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    profit_amount         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    KEY idx_sale_items_sale (sale_id),
    KEY idx_sale_items_stylist (stylist_id),
    KEY idx_sale_items_type (item_type),
    CONSTRAINT chk_sale_items_type CHECK (item_type IN ('service', 'product')),
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE SET NULL
    -- item_id es polimórfico: puede apuntar a services o products.
    -- No se agrega una FK única porque ambas entidades están en tablas distintas.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stylist_payouts (
    id             VARCHAR(64)  NOT NULL,
    stylist_id     VARCHAR(64)  NOT NULL,
    total_amount   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    services_count INT          NOT NULL DEFAULT 0,
    status         VARCHAR(20)  NOT NULL DEFAULT 'completed',
    notes          TEXT         NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_stylist_payouts_stylist (stylist_id),
    KEY idx_stylist_payouts_created (created_at),
    CONSTRAINT chk_stylist_payout_status CHECK (status IN ('completed', 'cancelled')),
    CONSTRAINT fk_stylist_payouts_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
    id           VARCHAR(64)  NOT NULL,
    stylist_id   VARCHAR(64)  NOT NULL,
    sale_id      VARCHAR(64)  NOT NULL,
    sale_item_id VARCHAR(64)  NOT NULL,
    amount       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
    paid_at      DATETIME     NULL,
    payout_id    VARCHAR(64)  NULL,
    notes        TEXT         NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_commissions_stylist_status (stylist_id, status),
    KEY idx_commissions_sale (sale_id),
    KEY idx_commissions_sale_item (sale_item_id),
    KEY idx_commissions_payout (payout_id),
    CONSTRAINT chk_commissions_status CHECK (status IN ('pending', 'paid')),
    CONSTRAINT fk_commissions_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_commissions_sale FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_commissions_sale_item FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_commissions_payout FOREIGN KEY (payout_id) REFERENCES stylist_payouts(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stylist_payout_items (
    id                  VARCHAR(64)  NOT NULL,
    payout_id           VARCHAR(64)  NOT NULL,
    commission_id       VARCHAR(64)  NULL,
    sale_item_id        VARCHAR(64)  NULL,
    service_name        VARCHAR(191) NOT NULL,
    customer_name       VARCHAR(191) NULL,
    service_price       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    amount_paid         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    profit_margin_percent DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    commission_rate     DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    service_date        DATETIME     NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_payout_items_payout (payout_id),
    KEY idx_payout_items_commission (commission_id),
    KEY idx_payout_items_sale_item (sale_item_id),
    CONSTRAINT fk_payout_items_payout FOREIGN KEY (payout_id) REFERENCES stylist_payouts(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_payout_items_commission FOREIGN KEY (commission_id) REFERENCES commissions(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_payout_items_sale_item FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_movements (
    id         VARCHAR(64)  NOT NULL,
    register_id VARCHAR(64) NOT NULL,
    type       VARCHAR(10)  NOT NULL,
    amount     DECIMAL(14,2) NOT NULL,
    reason     VARCHAR(500) NOT NULL,
    created_by VARCHAR(64)  NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cash_movements_register (register_id),
    KEY idx_cash_movements_created (created_at),
    CONSTRAINT chk_cash_movements_type CHECK (type IN ('in', 'out')),
    CONSTRAINT chk_cash_movements_amount CHECK (amount > 0),
    CONSTRAINT fk_cash_movements_register FOREIGN KEY (register_id) REFERENCES cash_registers(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cash_movements_user FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
    `key`       VARCHAR(191) NOT NULL,
    `value`     LONGTEXT     NULL,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id          VARCHAR(64)  NOT NULL,
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id   VARCHAR(64)  NULL,
    user_id     VARCHAR(64)  NULL,
    user_name   VARCHAR(191) NULL,
    details     LONGTEXT     NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_logs_target (target_type, target_id),
    KEY idx_audit_logs_user (user_id),
    KEY idx_audit_logs_created (created_at),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
