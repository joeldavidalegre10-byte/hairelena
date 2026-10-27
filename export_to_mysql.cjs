const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve('C:\\Users\\joeld\\.gemini\\antigravity\\scratch\\elite-studio-pos\\backend\\data\\elite_pos.db');
const outputPath = path.resolve('C:\\Users\\joeld\\.gemini\\antigravity\\scratch\\elite-studio-pos\\database_hostinger_phpmyadmin.sql');

const db = new DatabaseSync(dbPath);

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  // Escape string for MySQL
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${str}'`;
}

const header = `-- ==============================================================================
-- ELITE STUDIO POS - BASE DE DATOS PARA HOSTINGER (PHPMYADMIN / MYSQL / MARIADB)
-- Generado automticamente con todos los datos y estructura actualizados
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ------------------------------------------------------------------------------
-- 1. Tabla: users
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`username\` VARCHAR(100) DEFAULT NULL,
  \`email\` VARCHAR(150) NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`role\` ENUM('admin', 'cashier', 'stylist') NOT NULL DEFAULT 'cashier',
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_users_email\` (\`email\`),
  UNIQUE KEY \`idx_users_username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Tabla: stylists
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`stylists\`;
CREATE TABLE \`stylists\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`user_id\` VARCHAR(50) DEFAULT NULL,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`email\` VARCHAR(150) DEFAULT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`commission_rate\` DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  \`specialties\` TEXT DEFAULT NULL,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`is_hidden_in_margins\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_stylists_user_id\` (\`user_id\`),
  CONSTRAINT \`fk_stylists_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Tabla: categories
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`categories\`;
CREATE TABLE \`categories\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`type\` ENUM('service', 'product') NOT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Tabla: services
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`services\`;
CREATE TABLE \`services\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`category_id\` VARCHAR(50) DEFAULT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`duration_minutes\` INT DEFAULT 30,
  \`price\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`cost\` DECIMAL(14,2) DEFAULT 0.00,
  \`profit_margin_percent\` DECIMAL(5,2) DEFAULT NULL,
  \`custom_margin_active\` TINYINT(1) NOT NULL DEFAULT 0,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_services_category\` (\`category_id\`),
  CONSTRAINT \`fk_services_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Tabla: service_stylist_margins
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`service_stylist_margins\`;
CREATE TABLE \`service_stylist_margins\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`service_id\` VARCHAR(50) NOT NULL,
  \`stylist_id\` VARCHAR(50) NOT NULL,
  \`profit_margin_percent\` DECIMAL(5,2) NOT NULL,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`is_hidden\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_service_stylist\` (\`service_id\`, \`stylist_id\`),
  KEY \`idx_ssm_stylist\` (\`stylist_id\`),
  CONSTRAINT \`fk_ssm_service\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_ssm_stylist\` FOREIGN KEY (\`stylist_id\`) REFERENCES \`stylists\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Tabla: service_variants
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`service_variants\`;
CREATE TABLE \`service_variants\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`service_id\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`price\` DECIMAL(14,2) NOT NULL,
  \`duration_minutes\` INT DEFAULT NULL,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_service_variants_service\` (\`service_id\`),
  CONSTRAINT \`fk_service_variants_service\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Tabla: products
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`products\`;
CREATE TABLE \`products\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`category_id\` VARCHAR(50) DEFAULT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`barcode\` VARCHAR(100) DEFAULT NULL,
  \`sku\` VARCHAR(100) DEFAULT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`cost_price\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`sale_price\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`stock\` INT NOT NULL DEFAULT 0,
  \`min_stock\` INT NOT NULL DEFAULT 5,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_products_barcode\` (\`barcode\`),
  UNIQUE KEY \`uk_products_sku\` (\`sku\`),
  KEY \`idx_products_category\` (\`category_id\`),
  CONSTRAINT \`fk_products_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Tabla: cash_registers
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cash_registers\`;
CREATE TABLE \`cash_registers\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL DEFAULT 'Caja Principal',
  \`status\` ENUM('open', 'closed') NOT NULL DEFAULT 'closed',
  \`opened_at\` DATETIME DEFAULT NULL,
  \`closed_at\` DATETIME DEFAULT NULL,
  \`opened_by\` VARCHAR(50) DEFAULT NULL,
  \`closed_by\` VARCHAR(50) DEFAULT NULL,
  \`initial_amount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`expected_amount\` DECIMAL(14,2) DEFAULT 0.00,
  \`actual_amount\` DECIMAL(14,2) DEFAULT 0.00,
  \`difference\` DECIMAL(14,2) DEFAULT 0.00,
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_cr_opened_by\` (\`opened_by\`),
  KEY \`idx_cr_closed_by\` (\`closed_by\`),
  CONSTRAINT \`fk_cr_opened_by\` FOREIGN KEY (\`opened_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`fk_cr_closed_by\` FOREIGN KEY (\`closed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Tabla: cash_movements
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cash_movements\`;
CREATE TABLE \`cash_movements\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`register_id\` VARCHAR(50) NOT NULL,
  \`type\` ENUM('in', 'out') NOT NULL,
  \`amount\` DECIMAL(14,2) NOT NULL,
  \`reason\` VARCHAR(255) NOT NULL,
  \`created_by\` VARCHAR(50) DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_cm_register\` (\`register_id\`),
  KEY \`idx_cm_created_by\` (\`created_by\`),
  CONSTRAINT \`fk_cm_register\` FOREIGN KEY (\`register_id\`) REFERENCES \`cash_registers\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_cm_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Tabla: sales
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`sales\`;
CREATE TABLE \`sales\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`invoice_number\` VARCHAR(100) NOT NULL,
  \`register_id\` VARCHAR(50) DEFAULT NULL,
  \`cashier_id\` VARCHAR(50) DEFAULT NULL,
  \`customer_name\` VARCHAR(150) DEFAULT 'Consumidor Final',
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`subtotal\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`discount\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`tax\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`total\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`payment_method\` ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL DEFAULT 'cash',
  \`payment_details\` TEXT DEFAULT NULL,
  \`status\` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_sales_invoice\` (\`invoice_number\`),
  KEY \`idx_sales_register\` (\`register_id\`),
  KEY \`idx_sales_cashier\` (\`cashier_id\`),
  KEY \`idx_sales_created_at\` (\`created_at\`),
  CONSTRAINT \`fk_sales_register\` FOREIGN KEY (\`register_id\`) REFERENCES \`cash_registers\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`fk_sales_cashier\` FOREIGN KEY (\`cashier_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Tabla: sale_items
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`sale_items\`;
CREATE TABLE \`sale_items\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`sale_id\` VARCHAR(50) NOT NULL,
  \`item_type\` ENUM('service', 'product') NOT NULL,
  \`item_id\` VARCHAR(50) NOT NULL,
  \`item_name\` VARCHAR(150) NOT NULL,
  \`quantity\` INT NOT NULL DEFAULT 1,
  \`unit_price\` DECIMAL(14,2) NOT NULL,
  \`subtotal\` DECIMAL(14,2) NOT NULL,
  \`stylist_id\` VARCHAR(50) DEFAULT NULL,
  \`commission_rate\` DECIMAL(5,2) DEFAULT 0.00,
  \`commission_amount\` DECIMAL(14,2) DEFAULT 0.00,
  \`profit_margin_percent\` DECIMAL(5,2) DEFAULT 0.00,
  \`profit_amount\` DECIMAL(14,2) DEFAULT 0.00,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sale_items_sale\` (\`sale_id\`),
  KEY \`idx_sale_items_stylist\` (\`stylist_id\`),
  CONSTRAINT \`fk_sale_items_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_sale_items_stylist\` FOREIGN KEY (\`stylist_id\`) REFERENCES \`stylists\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Tabla: stylist_payouts
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`stylist_payouts\`;
CREATE TABLE \`stylist_payouts\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`stylist_id\` VARCHAR(50) NOT NULL,
  \`total_amount\` DECIMAL(14,2) NOT NULL,
  \`services_count\` INT NOT NULL,
  \`status\` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sp_stylist\` (\`stylist_id\`),
  CONSTRAINT \`fk_sp_stylist\` FOREIGN KEY (\`stylist_id\`) REFERENCES \`stylists\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Tabla: commissions
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`commissions\`;
CREATE TABLE \`commissions\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`stylist_id\` VARCHAR(50) NOT NULL,
  \`sale_id\` VARCHAR(50) NOT NULL,
  \`sale_item_id\` VARCHAR(50) NOT NULL,
  \`amount\` DECIMAL(14,2) NOT NULL,
  \`status\` ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  \`paid_at\` DATETIME DEFAULT NULL,
  \`payout_id\` VARCHAR(50) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_comm_stylist_status\` (\`stylist_id\`, \`status\`),
  KEY \`idx_comm_sale\` (\`sale_id\`),
  KEY \`idx_comm_payout\` (\`payout_id\`),
  CONSTRAINT \`fk_comm_stylist\` FOREIGN KEY (\`stylist_id\`) REFERENCES \`stylists\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_comm_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_comm_sale_item\` FOREIGN KEY (\`sale_item_id\` ) REFERENCES \`sale_items\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_comm_payout\` FOREIGN KEY (\`payout_id\`) REFERENCES \`stylist_payouts\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Tabla: stylist_payout_items
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`stylist_payout_items\`;
CREATE TABLE \`stylist_payout_items\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`payout_id\` VARCHAR(50) NOT NULL,
  \`commission_id\` VARCHAR(50) DEFAULT NULL,
  \`sale_item_id\` VARCHAR(50) DEFAULT NULL,
  \`service_name\` VARCHAR(150) NOT NULL,
  \`customer_name\` VARCHAR(150) DEFAULT NULL,
  \`service_price\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  \`amount_paid\` DECIMAL(14,2) NOT NULL,
  \`profit_margin_percent\` DECIMAL(5,2) DEFAULT NULL,
  \`commission_rate\` DECIMAL(5,2) DEFAULT NULL,
  \`service_date\` DATETIME NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_spi_payout\` (\`payout_id\`),
  KEY \`idx_spi_commission\` (\`commission_id\`),
  CONSTRAINT \`fk_spi_payout\` FOREIGN KEY (\`payout_id\`) REFERENCES \`stylist_payouts\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_spi_commission\` FOREIGN KEY (\`commission_id\`) REFERENCES \`commissions\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`fk_spi_sale_item\` FOREIGN KEY (\`sale_item_id\`) REFERENCES \`sale_items\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Tabla: settings
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`settings\`;
CREATE TABLE \`settings\` (
  \`key\` VARCHAR(100) NOT NULL,
  \`value\` TEXT NOT NULL,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Tabla: audit_logs
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`audit_logs\`;
CREATE TABLE \`audit_logs\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`action\` VARCHAR(100) NOT NULL,
  \`target_type\` VARCHAR(100) NOT NULL,
  \`target_id\` VARCHAR(100) NOT NULL,
  \`user_id\` VARCHAR(50) DEFAULT NULL,
  \`user_name\` VARCHAR(150) DEFAULT NULL,
  \`details\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_audit_logs_target\` (\`target_type\`, \`target_id\`),
  KEY \`idx_audit_logs_user\` (\`user_id\`),
  CONSTRAINT \`fk_audit_logs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INSERCIN DE DATOS ACTUALES
-- ==============================================================================
`;

let sqlOutput = header;

// List of tables in dependency order
const orderedTables = [
  'users',
  'stylists',
  'categories',
  'services',
  'service_stylist_margins',
  'service_variants',
  'products',
  'cash_registers',
  'cash_movements',
  'sales',
  'sale_items',
  'stylist_payouts',
  'commissions',
  'stylist_payout_items',
  'settings',
  'audit_logs'
];

for (const tableName of orderedTables) {
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) continue;

  sqlOutput += `\n-- Datos para la tabla \`${tableName}\` (${rows.length} registros)\n`;
  const cols = Object.keys(rows[0]);
  const colNames = cols.map(c => `\`${c}\``).join(', ');

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueTuples = chunk.map(row => {
      const vals = cols.map(c => escapeSqlValue(row[c]));
      return `(${vals.join(', ')})`;
    });
    sqlOutput += `INSERT INTO \`${tableName}\` (${colNames}) VALUES\n  ${valueTuples.join(',\n  ')};\n`;
  }
}

sqlOutput += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;

fs.writeFileSync(outputPath, sqlOutput, 'utf8');
console.log(`Script SQL para phpMyAdmin generado exitosamente en: ${outputPath}`);
console.log(`Tamao: ${(sqlOutput.length / 1024).toFixed(2)} KB`);
