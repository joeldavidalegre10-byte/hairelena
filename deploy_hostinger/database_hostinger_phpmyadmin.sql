-- ==============================================================================
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
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `role` ENUM('admin', 'cashier', 'stylist') NOT NULL DEFAULT 'cashier',
  `phone` VARCHAR(50) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  UNIQUE KEY `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Tabla: stylists
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `stylists`;
CREATE TABLE `stylists` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  `specialties` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_hidden_in_margins` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stylists_user_id` (`user_id`),
  CONSTRAINT `fk_stylists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Tabla: categories
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM('service', 'product') NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Tabla: services
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` VARCHAR(50) NOT NULL,
  `category_id` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `duration_minutes` INT DEFAULT 30,
  `price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `cost` DECIMAL(14,2) DEFAULT 0.00,
  `profit_margin_percent` DECIMAL(5,2) DEFAULT NULL,
  `custom_margin_active` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_services_category` (`category_id`),
  CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Tabla: service_stylist_margins
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `service_stylist_margins`;
CREATE TABLE `service_stylist_margins` (
  `id` VARCHAR(50) NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `stylist_id` VARCHAR(50) NOT NULL,
  `profit_margin_percent` DECIMAL(5,2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_hidden` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_service_stylist` (`service_id`, `stylist_id`),
  KEY `idx_ssm_stylist` (`stylist_id`),
  CONSTRAINT `fk_ssm_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ssm_stylist` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Tabla: service_variants
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `service_variants`;
CREATE TABLE `service_variants` (
  `id` VARCHAR(50) NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `price` DECIMAL(14,2) NOT NULL,
  `duration_minutes` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_variants_service` (`service_id`),
  CONSTRAINT `fk_service_variants_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Tabla: products
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(50) NOT NULL,
  `category_id` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `barcode` VARCHAR(100) DEFAULT NULL,
  `sku` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `cost_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `sale_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `min_stock` INT NOT NULL DEFAULT 5,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_barcode` (`barcode`),
  UNIQUE KEY `uk_products_sku` (`sku`),
  KEY `idx_products_category` (`category_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Tabla: cash_registers
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `cash_registers`;
CREATE TABLE `cash_registers` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL DEFAULT 'Caja Principal',
  `status` ENUM('open', 'closed') NOT NULL DEFAULT 'closed',
  `opened_at` DATETIME DEFAULT NULL,
  `closed_at` DATETIME DEFAULT NULL,
  `opened_by` VARCHAR(50) DEFAULT NULL,
  `closed_by` VARCHAR(50) DEFAULT NULL,
  `initial_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `expected_amount` DECIMAL(14,2) DEFAULT 0.00,
  `actual_amount` DECIMAL(14,2) DEFAULT 0.00,
  `difference` DECIMAL(14,2) DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cr_opened_by` (`opened_by`),
  KEY `idx_cr_closed_by` (`closed_by`),
  CONSTRAINT `fk_cr_opened_by` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cr_closed_by` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Tabla: cash_movements
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `cash_movements`;
CREATE TABLE `cash_movements` (
  `id` VARCHAR(50) NOT NULL,
  `register_id` VARCHAR(50) NOT NULL,
  `type` ENUM('in', 'out') NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cm_register` (`register_id`),
  KEY `idx_cm_created_by` (`created_by`),
  CONSTRAINT `fk_cm_register` FOREIGN KEY (`register_id`) REFERENCES `cash_registers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cm_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Tabla: sales
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
  `id` VARCHAR(50) NOT NULL,
  `invoice_number` VARCHAR(100) NOT NULL,
  `register_id` VARCHAR(50) DEFAULT NULL,
  `cashier_id` VARCHAR(50) DEFAULT NULL,
  `customer_name` VARCHAR(150) DEFAULT 'Consumidor Final',
  `customer_phone` VARCHAR(50) DEFAULT NULL,
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL DEFAULT 'cash',
  `payment_details` TEXT DEFAULT NULL,
  `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_invoice` (`invoice_number`),
  KEY `idx_sales_register` (`register_id`),
  KEY `idx_sales_cashier` (`cashier_id`),
  KEY `idx_sales_created_at` (`created_at`),
  CONSTRAINT `fk_sales_register` FOREIGN KEY (`register_id`) REFERENCES `cash_registers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Tabla: sale_items
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
  `id` VARCHAR(50) NOT NULL,
  `sale_id` VARCHAR(50) NOT NULL,
  `item_type` ENUM('service', 'product') NOT NULL,
  `item_id` VARCHAR(50) NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `subtotal` DECIMAL(14,2) NOT NULL,
  `stylist_id` VARCHAR(50) DEFAULT NULL,
  `commission_rate` DECIMAL(5,2) DEFAULT 0.00,
  `commission_amount` DECIMAL(14,2) DEFAULT 0.00,
  `profit_margin_percent` DECIMAL(5,2) DEFAULT 0.00,
  `profit_amount` DECIMAL(14,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale` (`sale_id`),
  KEY `idx_sale_items_stylist` (`stylist_id`),
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sale_items_stylist` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Tabla: stylist_payouts
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `stylist_payouts`;
CREATE TABLE `stylist_payouts` (
  `id` VARCHAR(50) NOT NULL,
  `stylist_id` VARCHAR(50) NOT NULL,
  `total_amount` DECIMAL(14,2) NOT NULL,
  `services_count` INT NOT NULL,
  `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sp_stylist` (`stylist_id`),
  CONSTRAINT `fk_sp_stylist` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Tabla: commissions
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `commissions`;
CREATE TABLE `commissions` (
  `id` VARCHAR(50) NOT NULL,
  `stylist_id` VARCHAR(50) NOT NULL,
  `sale_id` VARCHAR(50) NOT NULL,
  `sale_item_id` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `status` ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME DEFAULT NULL,
  `payout_id` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comm_stylist_status` (`stylist_id`, `status`),
  KEY `idx_comm_sale` (`sale_id`),
  KEY `idx_comm_payout` (`payout_id`),
  CONSTRAINT `fk_comm_stylist` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comm_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comm_sale_item` FOREIGN KEY (`sale_item_id` ) REFERENCES `sale_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comm_payout` FOREIGN KEY (`payout_id`) REFERENCES `stylist_payouts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Tabla: stylist_payout_items
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `stylist_payout_items`;
CREATE TABLE `stylist_payout_items` (
  `id` VARCHAR(50) NOT NULL,
  `payout_id` VARCHAR(50) NOT NULL,
  `commission_id` VARCHAR(50) DEFAULT NULL,
  `sale_item_id` VARCHAR(50) DEFAULT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `customer_name` VARCHAR(150) DEFAULT NULL,
  `service_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(14,2) NOT NULL,
  `profit_margin_percent` DECIMAL(5,2) DEFAULT NULL,
  `commission_rate` DECIMAL(5,2) DEFAULT NULL,
  `service_date` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_spi_payout` (`payout_id`),
  KEY `idx_spi_commission` (`commission_id`),
  CONSTRAINT `fk_spi_payout` FOREIGN KEY (`payout_id`) REFERENCES `stylist_payouts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spi_commission` FOREIGN KEY (`commission_id`) REFERENCES `commissions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_spi_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Tabla: settings
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Tabla: audit_logs
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(100) NOT NULL,
  `target_id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `user_name` VARCHAR(150) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_target` (`target_type`, `target_id`),
  KEY `idx_audit_logs_user` (`user_id`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INSERCIN DE DATOS ACTUALES
-- ==============================================================================

-- Datos para la tabla `users` (5 registros)
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `phone`, `is_active`, `created_at`, `updated_at`, `username`) VALUES
  ('u-admin-01', 'admin@elitestudio.com', '$2b$10$MpPz1X3CV/kBnmjtz2R28uY0ku6KsvngptC/0Yh2KzLDHJwfiUq1u', 'Administrador Principal', 'admin', '+595 981 123456', 1, '2026-10-11T14:42:42.075Z', '2026-10-27T11:45:24.394Z', 'admin'),
  ('u-cashier-01', 'caja@elitestudio.com', '$2b$10$MpPz1X3CV/kBnmjtz2R28ucdAm5D81cwcE7lG5eYtH7SybbDv.BBS', 'Cajero de Turno', 'cashier', '+595 981 654321', 1, '2026-10-11T14:42:42.075Z', '2026-10-27T11:45:24.394Z', 'caja'),
  ('u-mateo-01', 'mateo@elitestudio.com', '$2b$10$XbLLiYRaSqm.K8WUqHEBxOTK/AURzsHvnaqjBJwzpK8FVUg5j2w3a', 'Mateo Barber', 'stylist', '+595 982 111222', 1, '2026-10-11T14:42:42.075Z', '2026-10-11T14:42:42.075Z', NULL),
  ('u-valeria-01', 'valeria@elitestudio.com', '$2b$10$XbLLiYRaSqm.K8WUqHEBxOTK/AURzsHvnaqjBJwzpK8FVUg5j2w3a', 'Valeria Colorista', 'stylist', '+595 983 333444', 1, '2026-10-11T14:42:42.075Z', '2026-10-11T14:42:42.075Z', NULL),
  ('u-fe555078', 'admin2@elitestudio.com', '$2b$10$MZGspJ4YldkcxPwNH/Zg.uMmYsdMIsCTqH66QVerFizd5m/E2qUNS', 'Segundo Admin', 'admin', NULL, 1, '2026-10-24T19:08:19.378Z', '2026-10-24T19:08:19.378Z', 'admin2');

-- Datos para la tabla `stylists` (3 registros)
INSERT INTO `stylists` (`id`, `user_id`, `full_name`, `email`, `phone`, `commission_rate`, `specialties`, `is_active`, `created_at`, `updated_at`, `is_hidden_in_margins`) VALUES
  ('sty-mateo-01', 'u-mateo-01', 'Mateo Barber', 'mateo@elitestudio.com', '+595 982 111222', 45, '["Fade","Perfilado de Barba","Corte Clásico"]', 1, '2026-10-11T14:42:42.075Z', '2026-10-11 21:27:37', 0),
  ('sty-valeria-01', 'u-valeria-01', 'Valeria Colorista', 'valeria@elitestudio.com', '+595 983 333444', 50, '["Balayage","Decoloración","Keratina"]', 1, '2026-10-11T14:42:42.075Z', '2026-10-11T14:42:42.075Z', 0),
  ('sty-carlos-01', NULL, 'Carlos Estilista', 'carlos@elitestudio.com', '+595 984 555666', 40, '["Corte Dama","Peinado de Fiesta"]', 1, '2026-10-11T14:42:42.075Z', '2026-10-11 22:42:59', 0);

-- Datos para la tabla `categories` (5 registros)
INSERT INTO `categories` (`id`, `name`, `type`, `description`, `created_at`) VALUES
  ('cat-barber-01', 'Peluquería y Barbería', 'service', 'Cortes y afeitados clásicos y modernos', '2026-10-11T14:42:42.075Z'),
  ('cat-color-01', 'Coloración y Tratamientos', 'service', 'Tintes, mechas, balayage y botox', '2026-10-11T14:42:42.075Z'),
  ('cat-care-01', 'Cuidado Capilar', 'product', 'Shampoos y tratamientos para el hogar', '2026-10-11T14:42:42.075Z'),
  ('cat-style-01', 'Styling y Acabado', 'product', 'Ceras, geles y pomadas profesionales', '2026-10-11T14:42:42.075Z'),
  ('cat-cafe-01', 'Artículos & Cafetería', 'product', 'Café, cosas dulces, bebidas y snacks para clientes', '2026-10-26 21:39:19');

-- Datos para la tabla `services` (5 registros)
INSERT INTO `services` (`id`, `category_id`, `name`, `description`, `duration_minutes`, `price`, `is_active`, `created_at`, `updated_at`, `profit_margin_percent`, `cost`, `custom_margin_active`) VALUES
  ('srv-01', 'cat-barber-01', 'Corte de Cabello Caballero', 'Lavado, corte estilizado y peinado', 35, 60000, 1, '2026-10-11T14:42:42.075Z', '2026-10-23T19:41:00.597Z', NULL, 0, 0),
  ('srv-02', 'cat-barber-01', 'Perfilado y Afeitado de Barba', 'Toalla caliente, navaja tradicional y aceites', 25, 40000, 1, '2026-10-11T14:42:42.075Z', '2026-10-11T22:17:53.512Z', NULL, 0, 0),
  ('srv-03', 'cat-barber-01', 'Corte de Cabello Dama', 'Diagnóstico, lavado, corte y brushing', 45, 90000, 1, '2026-10-11T14:42:42.075Z', '2026-10-23T19:40:57.964Z', NULL, 0, 0),
  ('srv-04', 'cat-color-01', 'Balayage Premium', 'Decoloración progresiva, matiz y brushing', 180, 100000, 1, '2026-10-11T14:42:42.075Z', '2026-10-26T20:51:03.108Z', NULL, 0, 0),
  ('srv-05', 'cat-color-01', 'Tratamiento Botox Capilar', 'Hidratación intensiva y sellado térmico', 60, 180000, 1, '2026-10-11T14:42:42.075Z', '2026-10-11T22:38:35.562Z', NULL, 0, 0);

-- Datos para la tabla `service_stylist_margins` (4 registros)
INSERT INTO `service_stylist_margins` (`id`, `service_id`, `stylist_id`, `profit_margin_percent`, `created_at`, `updated_at`, `is_active`, `is_hidden`) VALUES
  ('sm-e444ccfe', 'srv-04', 'sty-carlos-01', 40, '2026-10-11T21:46:05.503Z', '2026-10-26T20:50:57.468Z', 0, 0),
  ('sm-f7d55c3a', 'srv-04', 'sty-mateo-01', 30, '2026-10-11T21:46:05.510Z', '2026-10-26T20:50:56.300Z', 0, 0),
  ('sm-d8184114', 'srv-01', 'sty-carlos-01', 35, '2026-10-11T21:46:05.521Z', '2026-10-11T23:13:41.525Z', 1, 0),
  ('sm-9f9087a3', 'srv-04', 'sty-valeria-01', 30, '2026-10-11T21:50:34.685Z', '2026-10-12T00:47:53.203Z', 0, 0);

-- Datos para la tabla `service_variants` (7 registros)
INSERT INTO `service_variants` (`id`, `service_id`, `name`, `price`, `duration_minutes`, `is_active`, `created_at`) VALUES
  ('var-bal-01', 'srv-04', 'Largo Medio', 350000, 180, 1, '2026-10-19T22:59:29.143Z'),
  ('var-bal-02', 'srv-04', 'Largo Extra / Abundante', 450000, 210, 1, '2026-10-19T22:59:29.143Z'),
  ('var-bal-03', 'srv-04', 'Retoque de Crecimiento', 280000, 120, 1, '2026-10-19T22:59:29.143Z'),
  ('var-bot-01', 'srv-05', 'Hasta los Hombros', 180000, 60, 1, '2026-10-19T22:59:29.143Z'),
  ('var-bot-02', 'srv-05', 'Cabello Largo / Abundante', 240000, 90, 1, '2026-10-19T22:59:29.143Z'),
  ('var-dam-01', 'srv-03', 'Corte Clásico', 90000, 45, 1, '2026-10-19T22:59:29.143Z'),
  ('var-dam-02', 'srv-03', 'Corte + Brushing Especial', 120000, 60, 1, '2026-10-19T22:59:29.143Z');

-- Datos para la tabla `products` (8 registros)
INSERT INTO `products` (`id`, `category_id`, `name`, `barcode`, `sku`, `description`, `cost_price`, `sale_price`, `stock`, `min_stock`, `is_active`, `created_at`, `updated_at`) VALUES
  ('prd-01', 'cat-care-01', 'Shampoo Reparador 300ml', '7791234567890', 'SHP-REP-300', 'Shampoo sin sulfatos para cabellos procesados', 45000, 85000, 18, 5, 1, '2026-10-11T14:42:42.075Z', '2026-10-23 19:20:19'),
  ('prd-02', 'cat-care-01', 'Aceite de Argán Puro 60ml', '7791234567891', 'OIL-ARG-60', 'Aceite finalizador hidratante antifrizz', 35000, 70000, 12, 4, 1, '2026-10-11T14:42:42.075Z', '2026-10-26 20:55:25'),
  ('prd-03', 'cat-style-01', 'Pomada Fijación Mate 100g', '7791234567892', 'POM-MAT-100', 'Pomada al agua fijación fuerte acabado mate', 30000, 60000, 25, 6, 1, '2026-10-11T14:42:42.075Z', '2026-10-11T14:42:42.075Z'),
  ('prd-cafe-01', 'cat-cafe-01', 'Café Espresso Gourmet', '101', '101', 'Consumición y refrigerios', 3000, 10000, 50, 5, 1, '2026-10-26 21:39:19', '2026-10-26 21:39:19'),
  ('prd-cafe-02', 'cat-cafe-01', 'Café con Leche / Capuccino', '102', '102', 'Consumición y refrigerios', 4500, 15000, 40, 5, 1, '2026-10-26 21:39:19', '2026-10-26 21:39:19'),
  ('prd-dulce-01', 'cat-cafe-01', 'Alfajor Artesanal de Dulce de Leche', '103', '103', 'Consumición y refrigerios', 5000, 12000, 35, 5, 1, '2026-10-26 21:39:19', '2026-10-26 21:39:19'),
  ('prd-dulce-02', 'cat-cafe-01', 'Masitas / Galletitas Dulces', '104', '104', 'Consumición y refrigerios', 3500, 8000, 30, 5, 1, '2026-10-26 21:39:19', '2026-10-26 21:39:19'),
  ('prd-bebida-01', 'cat-cafe-01', 'Agua Mineral / Gaseosa 500ml', '105', '105', 'Consumición y refrigerios', 3500, 8000, 45, 5, 1, '2026-10-26 21:39:19', '2026-10-26 21:39:19');

-- Datos para la tabla `cash_registers` (2 registros)
INSERT INTO `cash_registers` (`id`, `name`, `status`, `opened_at`, `closed_at`, `opened_by`, `closed_by`, `initial_amount`, `expected_amount`, `actual_amount`, `difference`, `notes`, `created_at`) VALUES
  ('reg-main-01', 'Caja Principal - Mostrador', 'closed', '2026-10-11T14:42:42.075Z', '2026-10-26T21:26:44.594Z', 'u-cashier-01', 'u-admin-01', 150000, 12030000, 12030000, 0, '123000000', '2026-10-11T14:42:42.075Z'),
  ('reg-a138e98d', 'Caja Principal', 'closed', '2026-10-26T21:27:36.332Z', '2026-10-26T21:27:38.756Z', 'u-admin-01', 'u-admin-01', 100000, 100000, 100000, 0, NULL, '2026-10-26T21:27:36.332Z');

-- Datos para la tabla `cash_movements` (1 registros)
INSERT INTO `cash_movements` (`id`, `register_id`, `type`, `amount`, `reason`, `created_by`, `created_at`) VALUES
  ('mov-4e7dc098', 'reg-main-01', 'in', 1500000, 'GSGF', 'u-admin-01', '2026-10-11T23:13:11.931Z');

-- Datos para la tabla `sales` (66 registros)
INSERT INTO `sales` (`id`, `invoice_number`, `register_id`, `cashier_id`, `customer_name`, `customer_phone`, `subtotal`, `discount`, `tax`, `total`, `payment_method`, `payment_details`, `status`, `notes`, `created_at`) VALUES
  ('sale-244a2d1c', 'TK-351846', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 270000, 0, 0, 270000, 'cash', '{"tendered":280000,"change":10000}', 'completed', NULL, '2026-10-11T20:59:11.846Z'),
  ('sale-c8859978', 'TK-390903', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 120000, 0, 0, 120000, 'cash', '{"tendered":120000,"change":0}', 'completed', NULL, '2026-10-11T20:59:50.903Z'),
  ('sale-448586d6', 'TK-937793', 'reg-main-01', 'u-cashier-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T21:25:37.793Z'),
  ('sale-98819a86', 'TK-968905', 'reg-main-01', 'u-cashier-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T21:26:08.905Z'),
  ('sale-ed30501f', 'TK-165484', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T21:46:05.484Z'),
  ('sale-6f2ebc9f', 'TK-165526', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T21:46:05.526Z'),
  ('sale-94a4e680', 'TK-165533', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 60000, 0, 0, 60000, 'cash', '{}', 'completed', NULL, '2026-10-11T21:46:05.533Z'),
  ('sale-4f633991', 'TK-165543', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T21:46:05.543Z'),
  ('sale-587a028e', 'TK-290596', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:04:50.596Z'),
  ('sale-8b8827ae', 'TK-290620', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:04:50.620Z'),
  ('sale-caaf211b', 'TK-290623', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 60000, 0, 0, 60000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:04:50.623Z'),
  ('sale-fe0998b3', 'TK-290629', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:04:50.629Z'),
  ('sale-83fc1bcc', 'TK-290642', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:04:50.641Z'),
  ('sale-62ea0e05', 'TK-989858', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:16:29.858Z'),
  ('sale-03624120', 'TK-989878', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:16:29.878Z'),
  ('sale-8c385d99', 'TK-989881', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 60000, 0, 0, 60000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:16:29.881Z'),
  ('sale-9cc5638c', 'TK-989888', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:16:29.888Z'),
  ('sale-af9cae2c', 'TK-989899', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:16:29.899Z'),
  ('sale-d0d51c14', 'TK-175542', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 20000, 0, 0, 20000, 'cash', '{}', 'completed', NULL, '2026-10-11T22:36:15.542Z'),
  ('sale-1f760d01', 'TK-421535', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 20000, 0, 0, 20000, 'cash', '{}', 'completed', NULL, '2026-10-11T23:13:41.535Z'),
  ('sale-723a6e66', 'TK-546324', 'reg-main-01', 'u-admin-01', 'Cliente Prueba A', NULL, 180000, 0, 0, 180000, 'cash', '{}', 'completed', NULL, '2026-10-11T23:32:26.324Z'),
  ('sale-556b634d', 'TK-546350', 'reg-main-01', 'u-admin-01', 'Cliente Prueba B', NULL, 100000, 0, 0, 100000, 'cash', '{}', 'completed', NULL, '2026-10-11T23:32:26.350Z'),
  ('sale-9888203c', 'TK-546416', 'reg-main-01', 'u-admin-01', 'Cliente Prueba C (Segundo lote)', NULL, 80000, 0, 0, 80000, 'cash', '{}', 'completed', NULL, '2026-10-11T23:32:26.416Z'),
  ('sale-dfbc0605', 'TK-642461', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 190000, 0, 0, 190000, 'cash', '{"tendered":190000,"change":0}', 'completed', NULL, '2026-10-11T23:34:02.461Z'),
  ('sale-991cfa7b', 'TK-647043', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 60000, 0, 0, 60000, 'cash', '{"tendered":60000,"change":0}', 'completed', NULL, '2026-10-11T23:34:07.043Z'),
  ('sale-38cc88d3', 'TK-547369', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-12T00:39:07.369Z'),
  ('sale-5c458825', 'TK-547622', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-12T00:39:07.622Z'),
  ('sale-7697b44d', 'TK-547743', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-12T00:39:07.743Z'),
  ('sale-e51418df', 'TK-555652', 'reg-main-01', 'u-admin-01', 'Cliente Prueba A', NULL, 180000, 0, 0, 180000, 'cash', '{}', 'completed', NULL, '2026-10-12T00:39:15.652Z'),
  ('sale-e9475824', 'TK-555657', 'reg-main-01', 'u-admin-01', 'Cliente Prueba B', NULL, 100000, 0, 0, 100000, 'cash', '{}', 'completed', NULL, '2026-10-12T00:39:15.657Z'),
  ('sale-4a8e25d6', 'TK-555691', 'reg-main-01', 'u-admin-01', 'Cliente Prueba C (Segundo lote)', NULL, 80000, 0, 0, 80000, 'cash', '{}', 'completed', NULL, '2026-10-12T00:39:15.691Z'),
  ('sale-2cf35f06', 'TK-658930', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 60000, 0, 0, 60000, 'cash', '{"tendered":60000,"change":0}', 'completed', NULL, '2026-10-12T14:34:18.930Z'),
  ('sale-b3e9e09b', 'TK-663636', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 60000, 0, 0, 60000, 'cash', '{"tendered":60000,"change":0}', 'completed', NULL, '2026-10-12T14:34:23.636Z'),
  ('sale-f7d9b2c4', 'TK-717183', 'reg-main-01', 'u-admin-01', 'Consumidor Final', NULL, 350000, 0, 0, 350000, 'cash', '{"tendered":350000,"change":0}', 'completed', NULL, '2026-10-12T14:35:17.183Z'),
  ('sale-8fb2493d', 'TK-059971', 'reg-main-01', 'u-cashier-01', 'Consumidor Final', NULL, 150000, 0, 0, 150000, 'cash', '{"tendered":150000,"change":0}', 'completed', NULL, '2026-10-19T22:30:59.971Z'),
  ('sale-a1a6c7a0', 'TK-070087', 'reg-main-01', 'u-cashier-01', 'Consumidor Final', NULL, 150000, 0, 0, 150000, 'cash', '{"tendered":150000,"change":0}', 'completed', NULL, '2026-10-19T22:31:10.087Z'),
  ('sale-33683154', 'TK-442910', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Balayage', NULL, 450000, 0, 0, 450000, 'cash', '{}', 'completed', NULL, '2026-10-19T23:10:42.910Z'),
  ('sale-f9b354e2', 'TK-443252', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 1', NULL, 240000, 0, 0, 240000, 'cash', '{}', 'completed', NULL, '2026-10-19T23:10:43.252Z'),
  ('sale-f000dc82', 'TK-443257', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 2', NULL, 180000, 0, 0, 180000, 'cash', '{}', 'completed', NULL, '2026-10-19T23:10:43.257Z'),
  ('sale-e6026e78', 'TK-453531', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-19T23:10:53.531Z'),
  ('sale-1345ec85', 'TK-453768', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-19T23:10:53.768Z'),
  ('sale-b2697606', 'TK-453877', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-19T23:10:53.877Z'),
  ('sale-93ffed12', 'TK-174337', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Balayage', NULL, 450000, 0, 0, 450000, 'cash', '{}', 'completed', NULL, '2026-10-23T11:49:34.337Z'),
  ('sale-657564a1', 'TK-174846', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 1', NULL, 240000, 0, 0, 240000, 'cash', '{}', 'completed', NULL, '2026-10-23T11:49:34.846Z'),
  ('sale-b4607a37', 'TK-174857', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 2', NULL, 180000, 0, 0, 180000, 'cash', '{}', 'completed', NULL, '2026-10-23T11:49:34.857Z'),
  ('sale-36d56cd3', 'TK-184052', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-23T11:49:44.052Z'),
  ('sale-a0cc889d', 'TK-184321', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T11:49:44.321Z'),
  ('sale-d7cd7ae5', 'TK-184437', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T11:49:44.437Z'),
  ('sale-9766a167', 'TK-614302', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Balayage', NULL, 450000, 0, 0, 450000, 'cash', '{}', 'completed', NULL, '2026-10-23T11:56:54.302Z'),
  ('sale-70863f9e', 'TK-614674', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 1', NULL, 240000, 0, 0, 240000, 'cash', '{}', 'completed', NULL, '2026-10-23T11:56:54.674Z');
INSERT INTO `sales` (`id`, `invoice_number`, `register_id`, `cashier_id`, `customer_name`, `customer_phone`, `subtotal`, `discount`, `tax`, `total`, `payment_method`, `payment_details`, `status`, `notes`, `created_at`) VALUES
  ('sale-8181a34b', 'TK-614680', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 2', NULL, 180000, 0, 0, 180000, 'cash', '{}', 'completed', NULL, '2026-10-23T11:56:54.680Z'),
  ('sale-397db9b5', 'TK-623706', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-23T11:57:03.706Z'),
  ('sale-d3822bed', 'TK-623954', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T11:57:03.954Z'),
  ('sale-a0b9c327', 'TK-624073', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T11:57:04.073Z'),
  ('sale-872e3485', 'TK-579920', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-23T12:12:59.920Z'),
  ('sale-61e18839', 'TK-580174', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T12:13:00.174Z'),
  ('sale-a34c36bc', 'TK-580289', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T12:13:00.289Z'),
  ('sale-8c97d349', 'TK-585486', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Balayage', NULL, 450000, 0, 0, 450000, 'cash', '{}', 'completed', NULL, '2026-10-23T12:13:05.486Z'),
  ('sale-46b5fcda', 'TK-585865', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 1', NULL, 240000, 0, 0, 240000, 'cash', '{}', 'completed', NULL, '2026-10-23T12:13:05.865Z'),
  ('sale-3f9436ca', 'TK-585872', 'reg-main-01', 'u-admin-01', 'Cliente Masivo 2', NULL, 180000, 0, 0, 180000, 'cash', '{}', 'completed', NULL, '2026-10-23T12:13:05.872Z'),
  ('sale-990eb228', 'TK-885869', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-23T12:18:05.869Z'),
  ('sale-e317acc1', 'TK-886140', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T12:18:06.140Z'),
  ('sale-ac61630b', 'TK-886260', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T12:18:06.260Z'),
  ('sale-32d13c41', 'TK-219783', 'reg-main-01', 'u-cashier-01', 'Cliente Prueba Venta', NULL, 170000, 0, 0, 170000, 'cash', '{}', 'cancelled', 'Anulada: Error de cobro en ticket', '2026-10-23T19:20:19.783Z'),
  ('sale-a950832e', 'TK-220049', 'reg-main-01', 'u-admin-01', 'Cliente Prueba Payout Protection', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T19:20:20.049Z'),
  ('sale-9ddb62c9', 'TK-220183', 'reg-main-01', 'u-cashier-01', 'Cliente Operación Cajero', NULL, 60000, 0, 0, 60000, 'card', '{}', 'completed', NULL, '2026-10-23T19:20:20.183Z');

-- Datos para la tabla `sale_items` (79 registros)
INSERT INTO `sale_items` (`id`, `sale_id`, `item_type`, `item_id`, `item_name`, `quantity`, `unit_price`, `subtotal`, `stylist_id`, `commission_rate`, `commission_amount`, `profit_margin_percent`, `profit_amount`) VALUES
  ('si-ec997ec2', 'sale-244a2d1c', 'service', 'srv-03', 'Corte de Cabello Dama', 1, 90000, 90000, NULL, 0, 0, 0, 0),
  ('si-6c61da7b', 'sale-244a2d1c', 'service', 'srv-01', 'Corte de Cabello Caballero', 3, 60000, 180000, NULL, 0, 0, 0, 0),
  ('si-3c2e77d0', 'sale-c8859978', 'service', 'srv-01', 'Corte de Cabello Caballero', 2, 60000, 120000, NULL, 0, 0, 0, 0),
  ('si-03f15221', 'sale-448586d6', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 40, 140000, 45, 157500),
  ('si-75a9bfce', 'sale-98819a86', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 40, 140000, 45, 157500),
  ('si-8f60723c', 'sale-ed30501f', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-4c238e01', 'sale-6f2ebc9f', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 35, 122500, 65, 227500),
  ('si-fd47a7d0', 'sale-94a4e680', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 50, 30000, 50, 30000),
  ('si-14179fb4', 'sale-4f633991', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-83ae43e6', 'sale-587a028e', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-b810b00f', 'sale-8b8827ae', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 35, 122500, 65, 227500),
  ('si-38644fd3', 'sale-caaf211b', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 50, 30000, 50, 30000),
  ('si-420c7872', 'sale-fe0998b3', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-80209a79', 'sale-83fc1bcc', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-0c67d823', 'sale-62ea0e05', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-e89ca710', 'sale-03624120', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 35, 122500, 65, 227500),
  ('si-bf186f25', 'sale-8c385d99', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 50, 30000, 50, 30000),
  ('si-e7451ef2', 'sale-9cc5638c', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-0e59c705', 'sale-af9cae2c', 'service', 'srv-04', 'Balayage Premium', 1, 350000, 350000, 'sty-carlos-01', 50, 175000, 50, 175000),
  ('si-8fb699b0', 'sale-d0d51c14', 'service', 'srv-04', 'Balayage Premium', 1, 10000, 10000, 'sty-carlos-01', 60, 6000, 40, 4000),
  ('si-6c270924', 'sale-d0d51c14', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 10000, 10000, 'sty-mateo-01', 50, 5000, 50, 5000),
  ('si-b9bc97c6', 'sale-1f760d01', 'service', 'srv-04', 'Balayage Premium', 1, 10000, 10000, 'sty-carlos-01', 60, 6000, 40, 4000),
  ('si-dc24cfef', 'sale-1f760d01', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 10000, 10000, 'sty-mateo-01', 50, 5000, 50, 5000),
  ('si-00b6cbe4', 'sale-723a6e66', 'service', 'srv-04', 'Balayage Premium', 1, 100000, 100000, 'sty-carlos-01', 50, 50000, 50, 50000),
  ('si-5c1b1828', 'sale-723a6e66', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 80000, 80000, 'sty-carlos-01', 65, 52000, 35, 28000),
  ('si-2fe4dbcb', 'sale-556b634d', 'service', 'srv-04', 'Balayage Premium', 1, 100000, 100000, 'sty-mateo-01', 50, 50000, 50, 50000),
  ('si-357107be', 'sale-9888203c', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 80000, 80000, 'sty-carlos-01', 65, 52000, 35, 28000),
  ('si-24e5bd49', 'sale-dfbc0605', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 75, 45000, 25, 15000),
  ('si-80c44b37', 'sale-dfbc0605', 'service', 'srv-03', 'Corte de Cabello Dama', 1, 90000, 90000, 'sty-mateo-01', 75, 67500, 25, 22500),
  ('si-67bd50a7', 'sale-dfbc0605', 'service', 'srv-02', 'Perfilado y Afeitado de Barba', 1, 40000, 40000, 'sty-valeria-01', 75, 30000, 25, 10000),
  ('si-79ff1cf5', 'sale-991cfa7b', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 75, 45000, 25, 15000),
  ('si-06369a0b', 'sale-38cc88d3', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-bad984bd', 'sale-5c458825', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 75, 45000, 25, 15000),
  ('si-02af925d', 'sale-7697b44d', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 75, 45000, 25, 15000),
  ('si-ca8dc161', 'sale-e51418df', 'service', 'srv-04', 'Balayage Premium', 1, 100000, 100000, 'sty-carlos-01', 75, 75000, 25, 25000),
  ('si-a92cc4a0', 'sale-e51418df', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 80000, 80000, 'sty-carlos-01', 65, 52000, 35, 28000),
  ('si-d799675e', 'sale-e9475824', 'service', 'srv-04', 'Balayage Premium', 1, 100000, 100000, 'sty-mateo-01', 75, 75000, 25, 25000),
  ('si-98ac3a99', 'sale-4a8e25d6', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 80000, 80000, 'sty-carlos-01', 65, 52000, 35, 28000),
  ('si-eac642dc', 'sale-2cf35f06', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-6b214cec', 'sale-b3e9e09b', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-carlos-01', 65, 39000, 35, 21000),
  ('si-c265df19', 'sale-f7d9b2c4', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-carlos-01', 65, 39000, 35, 21000),
  ('si-67d0abbd', 'sale-f7d9b2c4', 'service', 'srv-03', 'Corte de Cabello Dama', 1, 90000, 90000, 'sty-mateo-01', 30, 27000, 70, 63000),
  ('si-8a82453c', 'sale-f7d9b2c4', 'service', 'srv-02', 'Perfilado y Afeitado de Barba', 1, 40000, 40000, 'sty-valeria-01', 30, 12000, 70, 28000),
  ('si-ce49e02f', 'sale-f7d9b2c4', 'service', 'srv-04', 'Balayage Premium', 1, 100000, 100000, 'sty-carlos-01', 60, 60000, 40, 40000),
  ('si-74db7b8e', 'sale-f7d9b2c4', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-e49eb896', 'sale-8fb2493d', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-6d735a58', 'sale-8fb2493d', 'service', 'srv-03', 'Corte de Cabello Dama', 1, 90000, 90000, 'sty-mateo-01', 30, 27000, 70, 63000),
  ('si-8ad80013', 'sale-a1a6c7a0', 'service', 'srv-03', 'Corte de Cabello Dama', 1, 90000, 90000, 'sty-mateo-01', 30, 27000, 70, 63000),
  ('si-69fec734', 'sale-a1a6c7a0', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-carlos-01', 65, 39000, 35, 21000),
  ('si-0cbf68a3', 'sale-33683154', 'service', 'srv-04', 'Balayage Premium (Largo Extra / Abundante)', 1, 450000, 450000, 'sty-valeria-01', 30, 135000, 70, 315000);
INSERT INTO `sale_items` (`id`, `sale_id`, `item_type`, `item_id`, `item_name`, `quantity`, `unit_price`, `subtotal`, `stylist_id`, `commission_rate`, `commission_amount`, `profit_margin_percent`, `profit_amount`) VALUES
  ('si-19942d2b', 'sale-f9b354e2', 'service', 'srv-05', 'Tratamiento Botox Capilar (Cabello Largo)', 1, 240000, 240000, 'sty-valeria-01', 30, 72000, 70, 168000),
  ('si-90704b6d', 'sale-f000dc82', 'service', 'srv-05', 'Tratamiento Botox Capilar (Hasta Hombros)', 1, 180000, 180000, 'sty-valeria-01', 30, 54000, 70, 126000),
  ('si-5af64aca', 'sale-e6026e78', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-e0090df5', 'sale-1345ec85', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-679e2c9c', 'sale-b2697606', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-03514a26', 'sale-93ffed12', 'service', 'srv-04', 'Balayage Premium (Largo Extra / Abundante)', 1, 450000, 450000, 'sty-valeria-01', 30, 135000, 70, 315000),
  ('si-ebbdfe2d', 'sale-657564a1', 'service', 'srv-05', 'Tratamiento Botox Capilar (Cabello Largo)', 1, 240000, 240000, 'sty-valeria-01', 30, 72000, 70, 168000),
  ('si-61bd003c', 'sale-b4607a37', 'service', 'srv-05', 'Tratamiento Botox Capilar (Hasta Hombros)', 1, 180000, 180000, 'sty-valeria-01', 30, 54000, 70, 126000),
  ('si-84f1de3d', 'sale-36d56cd3', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-684c2af0', 'sale-a0cc889d', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-5ded340c', 'sale-d7cd7ae5', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-7d9348c1', 'sale-9766a167', 'service', 'srv-04', 'Balayage Premium (Largo Extra / Abundante)', 1, 450000, 450000, 'sty-valeria-01', 30, 135000, 70, 315000),
  ('si-e4d5634f', 'sale-70863f9e', 'service', 'srv-05', 'Tratamiento Botox Capilar (Cabello Largo)', 1, 240000, 240000, 'sty-valeria-01', 30, 72000, 70, 168000),
  ('si-00c01e2e', 'sale-8181a34b', 'service', 'srv-05', 'Tratamiento Botox Capilar (Hasta Hombros)', 1, 180000, 180000, 'sty-valeria-01', 30, 54000, 70, 126000),
  ('si-9bf22b62', 'sale-397db9b5', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-3b5d3de8', 'sale-d3822bed', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-9613b5e9', 'sale-a0b9c327', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-93721460', 'sale-872e3485', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-1f196fcd', 'sale-61e18839', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-b6896113', 'sale-a34c36bc', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-a3272b6b', 'sale-8c97d349', 'service', 'srv-04', 'Balayage Premium (Largo Extra / Abundante)', 1, 450000, 450000, 'sty-valeria-01', 30, 135000, 70, 315000),
  ('si-578e4ba3', 'sale-46b5fcda', 'service', 'srv-05', 'Tratamiento Botox Capilar (Cabello Largo)', 1, 240000, 240000, 'sty-valeria-01', 30, 72000, 70, 168000),
  ('si-32b5e362', 'sale-3f9436ca', 'service', 'srv-05', 'Tratamiento Botox Capilar (Hasta Hombros)', 1, 180000, 180000, 'sty-valeria-01', 30, 54000, 70, 126000),
  ('si-8e28dae6', 'sale-990eb228', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-524ab285', 'sale-e317acc1', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-fd92a97f', 'sale-ac61630b', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-a1d52c8b', 'sale-32d13c41', 'product', 'prd-01', 'Shampoo Reparador 300ml', 2, 85000, 170000, NULL, 0, 0, 47.06, 80000),
  ('si-4e801685', 'sale-a950832e', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000),
  ('si-98b2dc10', 'sale-9ddb62c9', 'service', 'srv-01', 'Corte de Cabello Caballero', 1, 60000, 60000, 'sty-mateo-01', 30, 18000, 70, 42000);

-- Datos para la tabla `stylist_payouts` (20 registros)
INSERT INTO `stylist_payouts` (`id`, `stylist_id`, `total_amount`, `services_count`, `status`, `notes`, `created_at`) VALUES
  ('payout-c94e377e', 'sty-carlos-01', 102000, 2, 'completed', 'Liquidación semanal de prueba 1', '2026-10-11T23:32:26.369Z'),
  ('payout-0aa0dc76', 'sty-carlos-01', 52000, 1, 'completed', 'Segunda liquidación independiente', '2026-10-11T23:32:26.424Z'),
  ('payout-0208c187', 'sty-mateo-01', 55000, 2, 'completed', NULL, '2026-10-11T23:32:26.445Z'),
  ('payout-af3c30ac', 'sty-mateo-01', 157500, 3, 'completed', NULL, '2026-10-11T23:35:05.706Z'),
  ('payout-a07e2839', 'sty-valeria-01', 30000, 1, 'completed', NULL, '2026-10-11T23:35:13.334Z'),
  ('payout-48403a31', 'sty-mateo-01', 45000, 1, 'completed', 'Pago de prueba', '2026-10-12T00:39:07.630Z'),
  ('payout-478aa8dc', 'sty-carlos-01', 127000, 2, 'completed', 'Liquidación semanal de prueba 1', '2026-10-12T00:39:15.666Z'),
  ('payout-c42f1a56', 'sty-carlos-01', 52000, 1, 'completed', 'Segunda liquidación independiente', '2026-10-12T00:39:15.699Z'),
  ('payout-18ab4b88', 'sty-mateo-01', 120000, 2, 'completed', NULL, '2026-10-12T00:39:15.716Z'),
  ('payout-21f896fc', 'sty-carlos-01', 138000, 3, 'cancelled', 'Revertido: Reversión autorizada por administrador', '2026-10-19T22:25:26.772Z'),
  ('payout-40b8b418', 'sty-valeria-01', 147000, 2, 'cancelled', 'Pago semanal liquidado | Revertido: Ajuste solicitado por tesorería', '2026-10-19T23:10:42.921Z'),
  ('payout-79778bc2', 'sty-mateo-01', 153000, 7, 'completed', 'Pago de prueba', '2026-10-19T23:10:53.783Z'),
  ('payout-f33a9546', 'sty-valeria-01', 135000, 1, 'cancelled', 'Pago semanal liquidado | Revertido: Ajuste solicitado por tesorería', '2026-10-23T11:49:34.356Z'),
  ('payout-f51746ee', 'sty-mateo-01', 36000, 2, 'completed', 'Pago de prueba', '2026-10-23T11:49:44.336Z'),
  ('payout-ad3c3caa', 'sty-valeria-01', 135000, 1, 'cancelled', 'Pago semanal liquidado | Revertido: Ajuste solicitado por tesorería', '2026-10-23T11:56:54.316Z'),
  ('payout-665f8c74', 'sty-mateo-01', 36000, 2, 'completed', 'Pago de prueba', '2026-10-23T11:57:03.971Z'),
  ('payout-d9b4ff97', 'sty-mateo-01', 36000, 2, 'completed', 'Pago de prueba', '2026-10-23T12:13:00.191Z'),
  ('payout-d7245fbd', 'sty-valeria-01', 135000, 1, 'cancelled', 'Pago semanal liquidado | Revertido: Ajuste solicitado por tesorería', '2026-10-23T12:13:05.508Z'),
  ('payout-3b12765c', 'sty-mateo-01', 36000, 2, 'completed', 'Pago de prueba', '2026-10-23T12:18:06.155Z'),
  ('payout-b8abec20', 'sty-mateo-01', 36000, 2, 'completed', 'Pago de prueba', '2026-10-23T19:20:20.068Z');

-- Datos para la tabla `commissions` (56 registros)
INSERT INTO `commissions` (`id`, `stylist_id`, `sale_id`, `sale_item_id`, `amount`, `status`, `paid_at`, `notes`, `created_at`, `payout_id`) VALUES
  ('comm-76e9de92', 'sty-carlos-01', 'sale-448586d6', 'si-03f15221', 140000, 'paid', '2026-10-11T22:39:10.211Z', 'Comisión por Balayage Premium (Ticket TK-937793)', '2026-10-11T21:25:37.793Z', NULL),
  ('comm-f325b403', 'sty-carlos-01', 'sale-98819a86', 'si-75a9bfce', 140000, 'paid', '2026-10-11T22:39:09.690Z', 'Comisión por Balayage Premium (Ticket TK-968905)', '2026-10-11T21:26:08.905Z', NULL),
  ('comm-431bdc37', 'sty-carlos-01', 'sale-ed30501f', 'si-8f60723c', 175000, 'paid', '2026-10-11T22:39:09.299Z', 'Comisión por Balayage Premium (Ticket TK-165484)', '2026-10-11T21:46:05.484Z', NULL),
  ('comm-b87b8861', 'sty-carlos-01', 'sale-6f2ebc9f', 'si-4c238e01', 122500, 'paid', '2026-10-11T22:39:08.780Z', 'Comisión por Balayage Premium (Ticket TK-165526)', '2026-10-11T21:46:05.526Z', NULL),
  ('comm-3a69468e', 'sty-mateo-01', 'sale-94a4e680', 'si-fd47a7d0', 30000, 'paid', '2026-10-11T22:39:07.754Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-165533)', '2026-10-11T21:46:05.533Z', NULL),
  ('comm-39748944', 'sty-carlos-01', 'sale-4f633991', 'si-14179fb4', 175000, 'paid', '2026-10-11T22:39:07.035Z', 'Comisión por Balayage Premium (Ticket TK-165543)', '2026-10-11T21:46:05.543Z', NULL),
  ('comm-b172ee9d', 'sty-carlos-01', 'sale-587a028e', 'si-83ae43e6', 175000, 'paid', '2026-10-11T22:39:04.211Z', 'Comisión por Balayage Premium (Ticket TK-290596)', '2026-10-11T22:04:50.596Z', NULL),
  ('comm-b12da490', 'sty-carlos-01', 'sale-8b8827ae', 'si-b810b00f', 122500, 'paid', '2026-10-11T22:39:03.716Z', 'Comisión por Balayage Premium (Ticket TK-290620)', '2026-10-11T22:04:50.620Z', NULL),
  ('comm-29e82412', 'sty-mateo-01', 'sale-caaf211b', 'si-38644fd3', 30000, 'paid', '2026-10-11T22:39:03.146Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-290623)', '2026-10-11T22:04:50.623Z', NULL),
  ('comm-1bf4d279', 'sty-carlos-01', 'sale-fe0998b3', 'si-420c7872', 175000, 'paid', '2026-10-11T22:39:01.090Z', 'Comisión por Balayage Premium (Ticket TK-290629)', '2026-10-11T22:04:50.629Z', NULL),
  ('comm-f12a752a', 'sty-carlos-01', 'sale-83fc1bcc', 'si-80209a79', 175000, 'paid', '2026-10-11T22:39:00.722Z', 'Comisión por Balayage Premium (Ticket TK-290642)', '2026-10-11T22:04:50.641Z', NULL),
  ('comm-81670c46', 'sty-carlos-01', 'sale-62ea0e05', 'si-0c67d823', 175000, 'paid', '2026-10-11T22:39:00.322Z', 'Comisión por Balayage Premium (Ticket TK-989858)', '2026-10-11T22:16:29.858Z', NULL),
  ('comm-4be1ec73', 'sty-carlos-01', 'sale-03624120', 'si-e89ca710', 122500, 'paid', '2026-10-11T22:38:59.955Z', 'Comisión por Balayage Premium (Ticket TK-989878)', '2026-10-11T22:16:29.878Z', NULL),
  ('comm-598faec2', 'sty-mateo-01', 'sale-8c385d99', 'si-bf186f25', 30000, 'paid', '2026-10-11T22:38:59.562Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-989881)', '2026-10-11T22:16:29.881Z', NULL),
  ('comm-e828fd7b', 'sty-carlos-01', 'sale-9cc5638c', 'si-e7451ef2', 175000, 'paid', '2026-10-11T22:38:59.147Z', 'Comisión por Balayage Premium (Ticket TK-989888)', '2026-10-11T22:16:29.888Z', NULL),
  ('comm-5ab2ca90', 'sty-carlos-01', 'sale-af9cae2c', 'si-0e59c705', 175000, 'paid', '2026-10-11T22:38:58.739Z', 'Comisión por Balayage Premium (Ticket TK-989899)', '2026-10-11T22:16:29.899Z', NULL),
  ('comm-e2ad58b5', 'sty-carlos-01', 'sale-d0d51c14', 'si-8fb699b0', 6000, 'paid', '2026-10-11T22:38:48.092Z', 'Comisión por Balayage Premium (Ticket TK-175542)', '2026-10-11T22:36:15.542Z', NULL),
  ('comm-523c56e4', 'sty-mateo-01', 'sale-d0d51c14', 'si-6c270924', 5000, 'paid', '2026-10-11T22:38:58.229Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-175542)', '2026-10-11T22:36:15.542Z', NULL),
  ('comm-3e915cbe', 'sty-carlos-01', 'sale-1f760d01', 'si-b9bc97c6', 6000, 'paid', '2026-10-11T23:15:38.315Z', 'Comisión por Balayage Premium (Ticket TK-421535)', '2026-10-11T23:13:41.535Z', NULL),
  ('comm-2a0cf92c', 'sty-mateo-01', 'sale-1f760d01', 'si-dc24cfef', 5000, 'paid', '2026-10-11T23:32:26.445Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-421535)', '2026-10-11T23:13:41.535Z', 'payout-0208c187'),
  ('comm-f5188ab0', 'sty-carlos-01', 'sale-723a6e66', 'si-00b6cbe4', 50000, 'paid', '2026-10-11T23:32:26.369Z', 'Comisión por Balayage Premium (Ticket TK-546324)', '2026-10-11T23:32:26.324Z', 'payout-c94e377e'),
  ('comm-4586f2ec', 'sty-carlos-01', 'sale-723a6e66', 'si-5c1b1828', 52000, 'paid', '2026-10-11T23:32:26.369Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-546324)', '2026-10-11T23:32:26.324Z', 'payout-c94e377e'),
  ('comm-51ff68bd', 'sty-mateo-01', 'sale-556b634d', 'si-2fe4dbcb', 50000, 'paid', '2026-10-11T23:32:26.445Z', 'Comisión por Balayage Premium (Ticket TK-546350)', '2026-10-11T23:32:26.350Z', 'payout-0208c187'),
  ('comm-c6e8087f', 'sty-carlos-01', 'sale-9888203c', 'si-357107be', 52000, 'paid', '2026-10-11T23:32:26.424Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-546416)', '2026-10-11T23:32:26.416Z', 'payout-0aa0dc76'),
  ('comm-179abead', 'sty-mateo-01', 'sale-dfbc0605', 'si-24e5bd49', 45000, 'paid', '2026-10-11T23:35:05.706Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-642461)', '2026-10-11T23:34:02.461Z', 'payout-af3c30ac'),
  ('comm-9e6bf12b', 'sty-mateo-01', 'sale-dfbc0605', 'si-80c44b37', 67500, 'paid', '2026-10-11T23:35:05.706Z', 'Comisión por Corte de Cabello Dama (Ticket TK-642461)', '2026-10-11T23:34:02.461Z', 'payout-af3c30ac'),
  ('comm-f8d04feb', 'sty-valeria-01', 'sale-dfbc0605', 'si-67bd50a7', 30000, 'paid', '2026-10-11T23:35:13.334Z', 'Comisión por Perfilado y Afeitado de Barba (Ticket TK-642461)', '2026-10-11T23:34:02.461Z', 'payout-a07e2839'),
  ('comm-ddb00d6f', 'sty-mateo-01', 'sale-991cfa7b', 'si-79ff1cf5', 45000, 'paid', '2026-10-11T23:35:05.706Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-647043)', '2026-10-11T23:34:07.043Z', 'payout-af3c30ac'),
  ('comm-b4edefb8', 'sty-mateo-01', 'sale-5c458825', 'si-bad984bd', 45000, 'paid', '2026-10-12T00:39:07.630Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-547622)', '2026-10-12T00:39:07.622Z', 'payout-48403a31'),
  ('comm-f04dd144', 'sty-mateo-01', 'sale-7697b44d', 'si-02af925d', 45000, 'paid', '2026-10-12T00:39:15.716Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-547743)', '2026-10-12T00:39:07.743Z', 'payout-18ab4b88'),
  ('comm-5a3251c3', 'sty-carlos-01', 'sale-e51418df', 'si-ca8dc161', 75000, 'paid', '2026-10-12T00:39:15.666Z', 'Comisión por Balayage Premium (Ticket TK-555652)', '2026-10-12T00:39:15.652Z', 'payout-478aa8dc'),
  ('comm-e8ef3514', 'sty-carlos-01', 'sale-e51418df', 'si-a92cc4a0', 52000, 'paid', '2026-10-12T00:39:15.666Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-555652)', '2026-10-12T00:39:15.652Z', 'payout-478aa8dc'),
  ('comm-2adae93a', 'sty-mateo-01', 'sale-e9475824', 'si-d799675e', 75000, 'paid', '2026-10-12T00:39:15.716Z', 'Comisión por Balayage Premium (Ticket TK-555657)', '2026-10-12T00:39:15.657Z', 'payout-18ab4b88'),
  ('comm-4fac933f', 'sty-carlos-01', 'sale-4a8e25d6', 'si-98ac3a99', 52000, 'paid', '2026-10-12T00:39:15.699Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-555691)', '2026-10-12T00:39:15.691Z', 'payout-c42f1a56'),
  ('comm-543f5113', 'sty-mateo-01', 'sale-2cf35f06', 'si-eac642dc', 18000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-658930)', '2026-10-12T14:34:18.930Z', 'payout-79778bc2'),
  ('comm-661caf22', 'sty-carlos-01', 'sale-b3e9e09b', 'si-6b214cec', 39000, 'pending', NULL, 'Comisión por Corte de Cabello Caballero (Ticket TK-663636)', '2026-10-12T14:34:23.636Z', NULL),
  ('comm-f0145445', 'sty-carlos-01', 'sale-f7d9b2c4', 'si-c265df19', 39000, 'pending', NULL, 'Comisión por Corte de Cabello Caballero (Ticket TK-717183)', '2026-10-12T14:35:17.183Z', NULL),
  ('comm-6e0d8752', 'sty-mateo-01', 'sale-f7d9b2c4', 'si-67d0abbd', 27000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Dama (Ticket TK-717183)', '2026-10-12T14:35:17.183Z', 'payout-79778bc2'),
  ('comm-31327915', 'sty-carlos-01', 'sale-f7d9b2c4', 'si-ce49e02f', 60000, 'pending', NULL, 'Comisión por Balayage Premium (Ticket TK-717183)', '2026-10-12T14:35:17.183Z', NULL),
  ('comm-6267255d', 'sty-mateo-01', 'sale-f7d9b2c4', 'si-74db7b8e', 18000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-717183)', '2026-10-12T14:35:17.183Z', 'payout-79778bc2'),
  ('comm-e55b2598', 'sty-mateo-01', 'sale-8fb2493d', 'si-e49eb896', 18000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-059971)', '2026-10-19T22:30:59.971Z', 'payout-79778bc2'),
  ('comm-af91996d', 'sty-mateo-01', 'sale-8fb2493d', 'si-6d735a58', 27000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Dama (Ticket TK-059971)', '2026-10-19T22:30:59.971Z', 'payout-79778bc2'),
  ('comm-8e0937a9', 'sty-mateo-01', 'sale-a1a6c7a0', 'si-8ad80013', 27000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Dama (Ticket TK-070087)', '2026-10-19T22:31:10.087Z', 'payout-79778bc2'),
  ('comm-26451449', 'sty-carlos-01', 'sale-a1a6c7a0', 'si-69fec734', 39000, 'pending', NULL, 'Comisión por Corte de Cabello Caballero (Ticket TK-070087)', '2026-10-19T22:31:10.087Z', NULL),
  ('comm-95807ff6', 'sty-mateo-01', 'sale-1345ec85', 'si-e0090df5', 18000, 'paid', '2026-10-19T23:10:53.783Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-453768)', '2026-10-19T23:10:53.768Z', 'payout-79778bc2'),
  ('comm-902314ba', 'sty-mateo-01', 'sale-b2697606', 'si-679e2c9c', 18000, 'paid', '2026-10-23T11:49:44.336Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-453877)', '2026-10-19T23:10:53.877Z', 'payout-f51746ee'),
  ('comm-4199422e', 'sty-mateo-01', 'sale-a0cc889d', 'si-684c2af0', 18000, 'paid', '2026-10-23T11:49:44.336Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-184321)', '2026-10-23T11:49:44.321Z', 'payout-f51746ee'),
  ('comm-c5847949', 'sty-mateo-01', 'sale-d7cd7ae5', 'si-5ded340c', 18000, 'paid', '2026-10-23T11:57:03.971Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-184437)', '2026-10-23T11:49:44.437Z', 'payout-665f8c74'),
  ('comm-bb9e523c', 'sty-mateo-01', 'sale-d3822bed', 'si-3b5d3de8', 18000, 'paid', '2026-10-23T11:57:03.971Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-623954)', '2026-10-23T11:57:03.954Z', 'payout-665f8c74'),
  ('comm-f3b614a9', 'sty-mateo-01', 'sale-a0b9c327', 'si-9613b5e9', 18000, 'paid', '2026-10-23T12:13:00.191Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-624073)', '2026-10-23T11:57:04.073Z', 'payout-d9b4ff97');
INSERT INTO `commissions` (`id`, `stylist_id`, `sale_id`, `sale_item_id`, `amount`, `status`, `paid_at`, `notes`, `created_at`, `payout_id`) VALUES
  ('comm-6f0e1f80', 'sty-mateo-01', 'sale-61e18839', 'si-1f196fcd', 18000, 'paid', '2026-10-23T12:13:00.191Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-580174)', '2026-10-23T12:13:00.174Z', 'payout-d9b4ff97'),
  ('comm-17bd4dd5', 'sty-mateo-01', 'sale-a34c36bc', 'si-b6896113', 18000, 'paid', '2026-10-23T12:18:06.155Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-580289)', '2026-10-23T12:13:00.289Z', 'payout-3b12765c'),
  ('comm-b117cae5', 'sty-mateo-01', 'sale-e317acc1', 'si-524ab285', 18000, 'paid', '2026-10-23T12:18:06.155Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-886140)', '2026-10-23T12:18:06.140Z', 'payout-3b12765c'),
  ('comm-feb0a1eb', 'sty-mateo-01', 'sale-ac61630b', 'si-fd92a97f', 18000, 'paid', '2026-10-23T19:20:20.068Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-886260)', '2026-10-23T12:18:06.260Z', 'payout-b8abec20'),
  ('comm-546363b6', 'sty-mateo-01', 'sale-a950832e', 'si-4e801685', 18000, 'paid', '2026-10-23T19:20:20.068Z', 'Comisión por Corte de Cabello Caballero (Ticket TK-220049)', '2026-10-23T19:20:20.049Z', 'payout-b8abec20'),
  ('comm-68d8c724', 'sty-mateo-01', 'sale-9ddb62c9', 'si-98b2dc10', 18000, 'pending', NULL, 'Comisión por Corte de Cabello Caballero (Ticket TK-220183)', '2026-10-23T19:20:20.183Z', NULL);

-- Datos para la tabla `stylist_payout_items` (40 registros)
INSERT INTO `stylist_payout_items` (`id`, `payout_id`, `commission_id`, `sale_item_id`, `service_name`, `customer_name`, `service_price`, `amount_paid`, `profit_margin_percent`, `commission_rate`, `service_date`, `created_at`) VALUES
  ('poi-2865b928', 'payout-c94e377e', 'comm-f5188ab0', 'si-00b6cbe4', 'Balayage Premium', 'Cliente Prueba A', 100000, 50000, 50, 50, '2026-10-11T23:32:26.324Z', '2026-10-11T23:32:26.369Z'),
  ('poi-84a1c277', 'payout-c94e377e', 'comm-4586f2ec', 'si-5c1b1828', 'Corte de Cabello Caballero', 'Cliente Prueba A', 80000, 52000, 35, 65, '2026-10-11T23:32:26.324Z', '2026-10-11T23:32:26.369Z'),
  ('poi-d769f68d', 'payout-0aa0dc76', 'comm-c6e8087f', 'si-357107be', 'Corte de Cabello Caballero', 'Cliente Prueba C (Segundo lote)', 80000, 52000, 35, 65, '2026-10-11T23:32:26.416Z', '2026-10-11T23:32:26.424Z'),
  ('poi-42799fbd', 'payout-0208c187', 'comm-2a0cf92c', 'si-dc24cfef', 'Corte de Cabello Caballero', 'Consumidor Final', 10000, 5000, 50, 50, '2026-10-11T23:13:41.535Z', '2026-10-11T23:32:26.445Z'),
  ('poi-a71dd4e0', 'payout-0208c187', 'comm-51ff68bd', 'si-2fe4dbcb', 'Balayage Premium', 'Cliente Prueba B', 100000, 50000, 50, 50, '2026-10-11T23:32:26.350Z', '2026-10-11T23:32:26.445Z'),
  ('poi-7c4eaa92', 'payout-af3c30ac', 'comm-179abead', 'si-24e5bd49', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 45000, 25, 75, '2026-10-11T23:34:02.461Z', '2026-10-11T23:35:05.706Z'),
  ('poi-39541cea', 'payout-af3c30ac', 'comm-9e6bf12b', 'si-80c44b37', 'Corte de Cabello Dama', 'Consumidor Final', 90000, 67500, 25, 75, '2026-10-11T23:34:02.461Z', '2026-10-11T23:35:05.706Z'),
  ('poi-a7393911', 'payout-af3c30ac', 'comm-ddb00d6f', 'si-79ff1cf5', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 45000, 25, 75, '2026-10-11T23:34:07.043Z', '2026-10-11T23:35:05.706Z'),
  ('poi-fd3d8b7d', 'payout-a07e2839', 'comm-f8d04feb', 'si-67bd50a7', 'Perfilado y Afeitado de Barba', 'Consumidor Final', 40000, 30000, 25, 75, '2026-10-11T23:34:02.461Z', '2026-10-11T23:35:13.334Z'),
  ('poi-51429432', 'payout-48403a31', 'comm-b4edefb8', 'si-bad984bd', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 45000, 25, 75, '2026-10-12T00:39:07.622Z', '2026-10-12T00:39:07.630Z'),
  ('poi-4799b6ad', 'payout-478aa8dc', 'comm-5a3251c3', 'si-ca8dc161', 'Balayage Premium', 'Cliente Prueba A', 100000, 75000, 25, 75, '2026-10-12T00:39:15.652Z', '2026-10-12T00:39:15.666Z'),
  ('poi-8506c05a', 'payout-478aa8dc', 'comm-e8ef3514', 'si-a92cc4a0', 'Corte de Cabello Caballero', 'Cliente Prueba A', 80000, 52000, 35, 65, '2026-10-12T00:39:15.652Z', '2026-10-12T00:39:15.666Z'),
  ('poi-a27cdd33', 'payout-c42f1a56', 'comm-4fac933f', 'si-98ac3a99', 'Corte de Cabello Caballero', 'Cliente Prueba C (Segundo lote)', 80000, 52000, 35, 65, '2026-10-12T00:39:15.691Z', '2026-10-12T00:39:15.699Z'),
  ('poi-57eb84fc', 'payout-18ab4b88', 'comm-f04dd144', 'si-02af925d', 'Corte de Cabello Caballero', 'Cliente Operación Cajero', 60000, 45000, 25, 75, '2026-10-12T00:39:07.743Z', '2026-10-12T00:39:15.716Z'),
  ('poi-7187c5e9', 'payout-18ab4b88', 'comm-2adae93a', 'si-d799675e', 'Balayage Premium', 'Cliente Prueba B', 100000, 75000, 25, 75, '2026-10-12T00:39:15.657Z', '2026-10-12T00:39:15.716Z'),
  ('poi-5a728594', 'payout-21f896fc', 'comm-661caf22', 'si-6b214cec', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 39000, 35, 65, '2026-10-12T14:34:23.636Z', '2026-10-19T22:25:26.772Z'),
  ('poi-d862282c', 'payout-21f896fc', 'comm-f0145445', 'si-c265df19', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 39000, 35, 65, '2026-10-12T14:35:17.183Z', '2026-10-19T22:25:26.772Z'),
  ('poi-1e62e064', 'payout-21f896fc', 'comm-31327915', 'si-ce49e02f', 'Balayage Premium', 'Consumidor Final', 100000, 60000, 40, 60, '2026-10-12T14:35:17.183Z', '2026-10-19T22:25:26.772Z'),
  ('poi-2c8cf562', 'payout-40b8b418', NULL, 'si-8a82453c', 'Perfilado y Afeitado de Barba', 'Consumidor Final', 40000, 12000, 70, 30, '2026-10-12T14:35:17.183Z', '2026-10-19T23:10:42.921Z'),
  ('poi-cb0600a9', 'payout-40b8b418', NULL, 'si-0cbf68a3', 'Balayage Premium (Largo Extra / Abundante)', 'Cliente Prueba Balayage', 450000, 135000, 70, 30, '2026-10-19T23:10:42.910Z', '2026-10-19T23:10:42.921Z'),
  ('poi-fa86c91c', 'payout-79778bc2', 'comm-543f5113', 'si-eac642dc', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 18000, 70, 30, '2026-10-12T14:34:18.930Z', '2026-10-19T23:10:53.783Z'),
  ('poi-e677deb8', 'payout-79778bc2', 'comm-6e0d8752', 'si-67d0abbd', 'Corte de Cabello Dama', 'Consumidor Final', 90000, 27000, 70, 30, '2026-10-12T14:35:17.183Z', '2026-10-19T23:10:53.783Z'),
  ('poi-665151fb', 'payout-79778bc2', 'comm-6267255d', 'si-74db7b8e', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 18000, 70, 30, '2026-10-12T14:35:17.183Z', '2026-10-19T23:10:53.783Z'),
  ('poi-83a3cd21', 'payout-79778bc2', 'comm-e55b2598', 'si-e49eb896', 'Corte de Cabello Caballero', 'Consumidor Final', 60000, 18000, 70, 30, '2026-10-19T22:30:59.971Z', '2026-10-19T23:10:53.783Z'),
  ('poi-ff2347f6', 'payout-79778bc2', 'comm-af91996d', 'si-6d735a58', 'Corte de Cabello Dama', 'Consumidor Final', 90000, 27000, 70, 30, '2026-10-19T22:30:59.971Z', '2026-10-19T23:10:53.783Z'),
  ('poi-54d57914', 'payout-79778bc2', 'comm-8e0937a9', 'si-8ad80013', 'Corte de Cabello Dama', 'Consumidor Final', 90000, 27000, 70, 30, '2026-10-19T22:31:10.087Z', '2026-10-19T23:10:53.783Z'),
  ('poi-bc99ad00', 'payout-79778bc2', 'comm-95807ff6', 'si-e0090df5', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 18000, 70, 30, '2026-10-19T23:10:53.768Z', '2026-10-19T23:10:53.783Z'),
  ('poi-17d2837e', 'payout-f33a9546', NULL, 'si-03514a26', 'Balayage Premium (Largo Extra / Abundante)', 'Cliente Prueba Balayage', 450000, 135000, 70, 30, '2026-10-23T11:49:34.337Z', '2026-10-23T11:49:34.356Z'),
  ('poi-2e87c235', 'payout-f51746ee', 'comm-902314ba', 'si-679e2c9c', 'Corte de Cabello Caballero', 'Cliente Operación Cajero', 60000, 18000, 70, 30, '2026-10-19T23:10:53.877Z', '2026-10-23T11:49:44.336Z'),
  ('poi-5263011f', 'payout-f51746ee', 'comm-4199422e', 'si-684c2af0', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 18000, 70, 30, '2026-10-23T11:49:44.321Z', '2026-10-23T11:49:44.336Z'),
  ('poi-10b5d6ab', 'payout-ad3c3caa', NULL, 'si-7d9348c1', 'Balayage Premium (Largo Extra / Abundante)', 'Cliente Prueba Balayage', 450000, 135000, 70, 30, '2026-10-23T11:56:54.302Z', '2026-10-23T11:56:54.316Z'),
  ('poi-f82c787e', 'payout-665f8c74', 'comm-c5847949', 'si-5ded340c', 'Corte de Cabello Caballero', 'Cliente Operación Cajero', 60000, 18000, 70, 30, '2026-10-23T11:49:44.437Z', '2026-10-23T11:57:03.971Z'),
  ('poi-a7799e61', 'payout-665f8c74', 'comm-bb9e523c', 'si-3b5d3de8', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 18000, 70, 30, '2026-10-23T11:57:03.954Z', '2026-10-23T11:57:03.971Z'),
  ('poi-6b15fb52', 'payout-d9b4ff97', 'comm-f3b614a9', 'si-9613b5e9', 'Corte de Cabello Caballero', 'Cliente Operación Cajero', 60000, 18000, 70, 30, '2026-10-23T11:57:04.073Z', '2026-10-23T12:13:00.191Z'),
  ('poi-dc120317', 'payout-d9b4ff97', 'comm-6f0e1f80', 'si-1f196fcd', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 18000, 70, 30, '2026-10-23T12:13:00.174Z', '2026-10-23T12:13:00.191Z'),
  ('poi-5c62214b', 'payout-d7245fbd', NULL, 'si-a3272b6b', 'Balayage Premium (Largo Extra / Abundante)', 'Cliente Prueba Balayage', 450000, 135000, 70, 30, '2026-10-23T12:13:05.486Z', '2026-10-23T12:13:05.508Z'),
  ('poi-916ec239', 'payout-3b12765c', 'comm-17bd4dd5', 'si-b6896113', 'Corte de Cabello Caballero', 'Cliente Operación Cajero', 60000, 18000, 70, 30, '2026-10-23T12:13:00.289Z', '2026-10-23T12:18:06.155Z'),
  ('poi-a3f33753', 'payout-3b12765c', 'comm-b117cae5', 'si-524ab285', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 18000, 70, 30, '2026-10-23T12:18:06.140Z', '2026-10-23T12:18:06.155Z'),
  ('poi-29614a70', 'payout-b8abec20', 'comm-feb0a1eb', 'si-fd92a97f', 'Corte de Cabello Caballero', 'Cliente Operación Cajero', 60000, 18000, 70, 30, '2026-10-23T12:18:06.260Z', '2026-10-23T19:20:20.068Z'),
  ('poi-dbb698a9', 'payout-b8abec20', 'comm-546363b6', 'si-4e801685', 'Corte de Cabello Caballero', 'Cliente Prueba Payout Protection', 60000, 18000, 70, 30, '2026-10-23T19:20:20.049Z', '2026-10-23T19:20:20.068Z');

-- Datos para la tabla `settings` (1 registros)
INSERT INTO `settings` (`key`, `value`, `updated_at`) VALUES
  ('default_profit_margin_percent', '70.00', '2026-10-12T00:49:23.830Z');

-- Datos para la tabla `audit_logs` (35 registros)
INSERT INTO `audit_logs` (`id`, `action`, `target_type`, `target_id`, `user_id`, `user_name`, `details`, `created_at`) VALUES
  ('aud-04ff1916', 'delete_movement', 'cash_movement', 'mov-cd946837', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-cd946837","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-12T00:39:07.086Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-12T00:39:07.174Z'),
  ('aud-44554a25', 'delete_movement', 'cash_movement', 'mov-332963e7', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-332963e7","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-12T00:39:07.184Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-12T00:39:07.353Z'),
  ('aud-63321979', 'cancel_sale', 'sale', 'sale-38cc88d3', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-547369","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-12T00:39:07.532Z'),
  ('aud-40c4cbd1', 'delete_movement', 'cash_movement', 'mov-93ae0b36', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-93ae0b36","register_id":"reg-main-01","type":"out","amount":150000,"reason":"RENE","created_by":"u-admin-01","created_at":"2026-10-11T23:13:22.921Z"},"reversal_delta":150000,"reason":"Eliminación autorizada por administrador"}', '2026-10-12T00:40:15.658Z'),
  ('aud-f5e0d794', 'revert_payout', 'payout', 'payout-40b8b418', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","total_amount":147000,"services_count":2,"commissions_restored":2,"reason":"Ajuste solicitado por tesorería"}', '2026-10-19T23:10:43.074Z'),
  ('aud-16b7bbc7', 'delete_pending_commission', 'commission', 'comm-25dd15ca', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","stylist_name":"Valeria Colorista","service_name":"Perfilado y Afeitado de Barba","invoice_number":"TK-717183","amount":12000,"sale_id":"sale-f7d9b2c4","reason":"Servicio asignado por error al estilista"}', '2026-10-19T23:10:43.245Z'),
  ('aud-7c2fea36', 'delete_all_pending_commissions', 'stylist', 'sty-valeria-01', 'u-admin-01', 'Administrador Principal', '{"stylist_name":"Valeria Colorista","count":3,"total_amount":261000,"reason":"Liquidación manual extraordinaria autorizada"}', '2026-10-19T23:10:43.424Z'),
  ('aud-d1764f2d', 'delete_movement', 'cash_movement', 'mov-59bdc505', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-59bdc505","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-19T23:10:53.235Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-19T23:10:53.335Z'),
  ('aud-89a1653e', 'delete_movement', 'cash_movement', 'mov-d86846b7', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-d86846b7","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-19T23:10:53.349Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-19T23:10:53.515Z'),
  ('aud-cb4146a5', 'cancel_sale', 'sale', 'sale-e6026e78', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-453531","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-19T23:10:53.684Z'),
  ('aud-c430ae51', 'revert_payout', 'payout', 'payout-21f896fc', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-carlos-01","total_amount":138000,"services_count":3,"commissions_restored":3,"reason":"Reversión autorizada por administrador"}', '2026-10-19T23:13:20.943Z'),
  ('aud-973239f6', 'revert_payout', 'payout', 'payout-f33a9546', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","total_amount":135000,"services_count":1,"commissions_restored":1,"reason":"Ajuste solicitado por tesorería"}', '2026-10-23T11:49:34.577Z'),
  ('aud-73468990', 'delete_pending_commission', 'commission', 'comm-ce65efdd', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","stylist_name":"Valeria Colorista","service_name":"Balayage Premium (Largo Extra / Abundante)","invoice_number":"TK-174337","amount":135000,"sale_id":"sale-93ffed12","reason":"Servicio asignado por error al estilista"}', '2026-10-23T11:49:34.826Z'),
  ('aud-4fdcb2af', 'delete_all_pending_commissions', 'stylist', 'sty-valeria-01', 'u-admin-01', 'Administrador Principal', '{"stylist_name":"Valeria Colorista","count":2,"total_amount":126000,"reason":"Liquidación manual extraordinaria autorizada"}', '2026-10-23T11:49:35.122Z'),
  ('aud-0d3e3108', 'delete_movement', 'cash_movement', 'mov-a1eb302a', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-a1eb302a","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-23T11:49:43.769Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-23T11:49:43.869Z'),
  ('aud-9f13cf29', 'delete_movement', 'cash_movement', 'mov-4bec570a', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-4bec570a","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-23T11:49:43.877Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-23T11:49:44.036Z'),
  ('aud-e9917ebf', 'cancel_sale', 'sale', 'sale-36d56cd3', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-184052","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-23T11:49:44.226Z'),
  ('aud-e4cd7b66', 'revert_payout', 'payout', 'payout-ad3c3caa', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","total_amount":135000,"services_count":1,"commissions_restored":1,"reason":"Ajuste solicitado por tesorería"}', '2026-10-23T11:56:54.479Z'),
  ('aud-e7722e71', 'delete_pending_commission', 'commission', 'comm-f8f56392', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","stylist_name":"Valeria Colorista","service_name":"Balayage Premium (Largo Extra / Abundante)","invoice_number":"TK-614302","amount":135000,"sale_id":"sale-9766a167","reason":"Servicio asignado por error al estilista"}', '2026-10-23T11:56:54.656Z'),
  ('aud-75835e14', 'delete_all_pending_commissions', 'stylist', 'sty-valeria-01', 'u-admin-01', 'Administrador Principal', '{"stylist_name":"Valeria Colorista","count":2,"total_amount":126000,"reason":"Liquidación manual extraordinaria autorizada"}', '2026-10-23T11:56:54.839Z'),
  ('aud-932e790b', 'delete_movement', 'cash_movement', 'mov-f68ec60e', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-f68ec60e","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-23T11:57:03.409Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-23T11:57:03.499Z'),
  ('aud-d369828f', 'delete_movement', 'cash_movement', 'mov-57d61017', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-57d61017","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-23T11:57:03.521Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-23T11:57:03.687Z'),
  ('aud-5025bbea', 'cancel_sale', 'sale', 'sale-397db9b5', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-623706","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-23T11:57:03.869Z'),
  ('aud-be7c4137', 'delete_movement', 'cash_movement', 'mov-3d9a330c', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-3d9a330c","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-23T12:12:59.640Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-23T12:12:59.723Z'),
  ('aud-405f094c', 'delete_movement', 'cash_movement', 'mov-bab7a45c', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-bab7a45c","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-23T12:12:59.740Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-23T12:12:59.903Z'),
  ('aud-633c9bc6', 'cancel_sale', 'sale', 'sale-872e3485', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-579920","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-23T12:13:00.082Z'),
  ('aud-9ae8cf94', 'revert_payout', 'payout', 'payout-d7245fbd', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","total_amount":135000,"services_count":1,"commissions_restored":1,"reason":"Ajuste solicitado por tesorería"}', '2026-10-23T12:13:05.668Z'),
  ('aud-1bfb515b', 'delete_pending_commission', 'commission', 'comm-e6a5c036', 'u-admin-01', 'Administrador Principal', '{"stylist_id":"sty-valeria-01","stylist_name":"Valeria Colorista","service_name":"Balayage Premium (Largo Extra / Abundante)","invoice_number":"TK-585486","amount":135000,"sale_id":"sale-8c97d349","reason":"Servicio asignado por error al estilista"}', '2026-10-23T12:13:05.847Z'),
  ('aud-d237fd5c', 'delete_all_pending_commissions', 'stylist', 'sty-valeria-01', 'u-admin-01', 'Administrador Principal', '{"stylist_name":"Valeria Colorista","count":2,"total_amount":126000,"reason":"Liquidación manual extraordinaria autorizada"}', '2026-10-23T12:13:06.063Z'),
  ('aud-1ce0acb3', 'delete_movement', 'cash_movement', 'mov-e490d1c3', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-e490d1c3","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-23T12:18:05.569Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-23T12:18:05.661Z'),
  ('aud-5a4ece83', 'delete_movement', 'cash_movement', 'mov-859dcdf6', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-859dcdf6","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-23T12:18:05.681Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-23T12:18:05.852Z'),
  ('aud-73ed3910', 'cancel_sale', 'sale', 'sale-990eb228', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-885869","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-23T12:18:06.028Z'),
  ('aud-16e65476', 'delete_movement', 'cash_movement', 'mov-b799e6d8', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-b799e6d8","register_id":"reg-main-01","type":"out","amount":40000,"reason":"Gasto de papelería para prueba","created_by":"u-admin-01","created_at":"2026-10-23T19:20:19.465Z"},"reversal_delta":40000,"reason":"Error en digitación de gasto"}', '2026-10-23T19:20:19.562Z'),
  ('aud-8142aa79', 'delete_movement', 'cash_movement', 'mov-d3687959', 'u-admin-01', 'Administrador Principal', '{"movement":{"id":"mov-d3687959","register_id":"reg-main-01","type":"in","amount":25000,"reason":"Ingreso extra de prueba","created_by":"u-admin-01","created_at":"2026-10-23T19:20:19.573Z"},"reversal_delta":-25000,"reason":"Eliminación autorizada por administrador"}', '2026-10-23T19:20:19.762Z'),
  ('aud-38010b2a', 'cancel_sale', 'sale', 'sale-32d13c41', 'u-cashier-01', 'Cajero de Turno', '{"invoice_number":"TK-219783","total":170000,"cash_reverted":170000,"items_count":1,"reason":"Error de cobro en ticket"}', '2026-10-23T19:20:19.947Z');

SET FOREIGN_KEY_CHECKS = 1;
