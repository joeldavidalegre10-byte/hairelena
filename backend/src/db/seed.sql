-- ==============================================================================
-- ELITE STUDIO POS - Initial Seed Data
-- ==============================================================================

-- 1. Categorías iniciales
INSERT INTO categories (id, name, type, description) VALUES
('11111111-1111-1111-1111-111111111101', 'Peluquería y Barbería', 'service', 'Cortes y afeitados clásicos y modernos'),
('11111111-1111-1111-1111-111111111102', 'Coloración y Tratamientos', 'service', 'Tintes, mechas, balayage y botox capilar'),
('11111111-1111-1111-1111-111111111103', 'Cuidado Capilar', 'product', 'Shampoos, mascarillas y aceites profesionales'),
('11111111-1111-1111-1111-111111111104', 'Styling y Acabado', 'product', 'Ceras, pomadas, geles y lacas')
ON CONFLICT (id) DO NOTHING;

-- 2. Perfiles / Usuarios demo
INSERT INTO profiles (id, email, full_name, role, phone) VALUES
('22222222-2222-2222-2222-222222222201', 'admin@elitestudio.com', 'Administrador Principal', 'admin', '+54 9 11 4444-1111'),
('22222222-2222-2222-2222-222222222202', 'caja@elitestudio.com', 'Cajero de Turno', 'cashier', '+54 9 11 4444-2222'),
('22222222-2222-2222-2222-222222222203', 'mateo@elitestudio.com', 'Mateo Barber', 'stylist', '+54 9 11 4444-3333'),
('22222222-2222-2222-2222-222222222204', 'valeria@elitestudio.com', 'Valeria Colorista', 'stylist', '+54 9 11 4444-4444')
ON CONFLICT (id) DO NOTHING;

-- 3. Estilistas
INSERT INTO stylists (id, user_id, full_name, email, phone, commission_rate, specialties) VALUES
('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', 'Mateo Barber', 'mateo@elitestudio.com', '+54 9 11 4444-3333', 45.00, ARRAY['Fade', 'Perfilado de Barba', 'Corte Clásico']),
('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222204', 'Valeria Colorista', 'valeria@elitestudio.com', '+54 9 11 4444-4444', 50.00, ARRAY['Balayage', 'Decoloración', 'Tratamiento Keratina']),
('33333333-3333-3333-3333-333333333303', NULL, 'Carlos Estilista', 'carlos@elitestudio.com', '+54 9 11 4444-5555', 40.00, ARRAY['Corte Dama', 'Peinado de Fiesta'])
ON CONFLICT (id) DO NOTHING;

-- 4. Servicios
INSERT INTO services (id, category_id, name, description, duration_minutes, price) VALUES
('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', 'Corte de Cabello Caballero', 'Lavado, corte estilizado y peinado', 35, 8500.00),
('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111101', 'Perfilado y Afeitado de Barba', 'Toalla caliente, navaja tradicional y aceites', 25, 5500.00),
('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111101', 'Corte de Cabello Dama', 'Diagnóstico, lavado, corte y secado', 45, 12000.00),
('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111102', 'Balayage Premium', 'Decoloración progresiva, matiz y brushing', 180, 45000.00),
('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111102', 'Tratamiento Botox Capilar', 'Hidratación intensiva y sellado térmico', 60, 22000.00)
ON CONFLICT (id) DO NOTHING;

-- 5. Productos
INSERT INTO products (id, category_id, name, barcode, sku, description, cost_price, sale_price, stock, min_stock) VALUES
('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111103', 'Shampoo Reparador 300ml', '7791234567890', 'SHP-REP-300', 'Shampoo sin sulfatos para cabellos procesados', 4500.00, 9500.00, 18, 5),
('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111103', 'Aceite de Argán Puro 60ml', '7791234567891', 'OIL-ARG-60', 'Aceite finalizador hidratante antifrizz', 3800.00, 8200.00, 12, 4),
('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111104', 'Pomada Fijación Mate 100g', '7791234567892', 'POM-MAT-100', 'Pomada al agua fijación fuerte acabado mate', 2900.00, 6800.00, 25, 6)
ON CONFLICT (id) DO NOTHING;

-- 6. Caja Principal Inicial
INSERT INTO cash_registers (id, name, status, initial_amount, opened_at, opened_by) VALUES
('66666666-6666-6666-6666-666666666601', 'Caja Principal - Mostrador', 'open', 15000.00, NOW(), '22222222-2222-2222-2222-222222222202')
ON CONFLICT (id) DO NOTHING;
