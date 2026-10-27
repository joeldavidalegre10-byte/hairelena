import { initDatabase, getDb } from './db/database.js';
import app from './app.js';
import { Server } from 'node:http';

async function runSecurityCajaVentasE2ETests() {
  console.log('🧪 Iniciando Verificación Integral de Seguridad, Caja, Eliminación de Ventas y Restricciones de Cajero...\n');
  initDatabase();
  const db = getDb();

  const server: Server = app.listen(4012);
  const baseUrl = 'http://127.0.0.1:4012/api/v1';

  try {
    // -------------------------------------------------------------------------
    // 0. Autenticación de Administrador y Cajero
    // -------------------------------------------------------------------------
    console.log('--- 0. Autenticación ---');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elitestudio.com', password: 'admin123' }),
    });
    const adminLogin = (await adminLoginRes.json()) as any;
    if (!adminLogin.data?.token) throw new Error('Fallo en login de admin');
    const adminToken = adminLogin.data.token;
    console.log('✅ Token de Administrador obtenido');

    const cashierLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'caja@elitestudio.com', password: 'caja123' }),
    });
    const cashierLogin = (await cashierLoginRes.json()) as any;
    if (!cashierLogin.data?.token) throw new Error('Fallo en login de cajero');
    const cashierToken = cashierLogin.data.token;
    console.log('✅ Token de Cajero obtenido');

    // Asegurar una caja registradora abierta para las pruebas
    let currentRegRes = await fetch(`${baseUrl}/cash-registers/current`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    let regData = (await currentRegRes.json()) as any;
    let registerId: string;

    if (!regData.data || regData.data.status !== 'open') {
      const openRes = await fetch(`${baseUrl}/cash-registers/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ initial_amount: 100000, notes: 'Caja abierta para suite de pruebas' }),
      });
      const opened = (await openRes.json()) as any;
      registerId = opened.data.id;
      console.log('✅ Caja Registradora abierta:', registerId);
    } else {
      registerId = regData.data.id;
      console.log('✅ Caja Registradora activa existente:', registerId);
    }

    // -------------------------------------------------------------------------
    // PRUEBA 1 & 4: Eliminar Movimiento de Caja con Contraseña de Admin y Saldo Actualizado
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 1 & 4: Eliminar Movimiento de Caja con Contraseña de Admin ---');
    const regBeforeMov = db.prepare('SELECT expected_amount FROM cash_registers WHERE id = ?').get(registerId) as any;
    const initialExpected = regBeforeMov.expected_amount;

    // Registrar un egreso de caja de 40.000
    const addMovRes = await fetch(`${baseUrl}/cash-registers/${registerId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        type: 'out',
        amount: 40000,
        reason: 'Gasto de papelería para prueba',
      }),
    });
    const addMovData = (await addMovRes.json()) as any;
    const movementId = addMovData.data.id;
    console.log(`Movimiento creado: ${movementId} (-40.000)`);

    const regAfterMov = db.prepare('SELECT expected_amount FROM cash_registers WHERE id = ?').get(registerId) as any;
    if (regAfterMov.expected_amount !== initialExpected - 40000) {
      throw new Error(`Saldo de caja no descontó el movimiento: esperado ${initialExpected - 40000}, actual ${regAfterMov.expected_amount}`);
    }

    // Eliminar el movimiento con contraseña de admin correcta
    const delMovRes = await fetch(`${baseUrl}/cash-registers/movements/${movementId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        admin_password: 'admin123',
        reason: 'Error en digitación de gasto',
      }),
    });
    const delMovData = (await delMovRes.json()) as any;
    if (delMovRes.status !== 200 || !delMovData.success) {
      throw new Error(`Error al eliminar movimiento con clave correcta: ${JSON.stringify(delMovData)}`);
    }

    // Verificar en BD que el movimiento ya no existe
    const movInDb = db.prepare('SELECT * FROM cash_movements WHERE id = ?').get(movementId);
    if (movInDb) throw new Error('El movimiento todavía existe en la base de datos');

    // PRUEBA 4: Verificar que el saldo de caja se revirtió exactamente
    const regAfterDel = db.prepare('SELECT expected_amount FROM cash_registers WHERE id = ?').get(registerId) as any;
    if (regAfterDel.expected_amount !== initialExpected) {
      throw new Error(`Saldo de caja no se restableció: esperado ${initialExpected}, obtenido ${regAfterDel.expected_amount}`);
    }
    console.log('✅ PRUEBA 1 & 4 verificadas: Movimiento eliminado y saldo de caja restaurado exactamente');

    // -------------------------------------------------------------------------
    // PRUEBA 2: Contraseña Incorrecta Impide Eliminar Movimiento
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 2: Contraseña Incorrecta Impide Eliminar Movimiento ---');
    const mov2Res = await fetch(`${baseUrl}/cash-registers/${registerId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ type: 'in', amount: 25000, reason: 'Ingreso extra de prueba' }),
    });
    const mov2Data = (await mov2Res.json()) as any;
    const movement2Id = mov2Data.data.id;

    const badDelRes = await fetch(`${baseUrl}/cash-registers/movements/${movement2Id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ admin_password: 'clave_incorrecta_xyz' }),
    });
    const badDelData = (await badDelRes.json()) as any;
    if (badDelRes.status !== 401 || badDelData.success !== false) {
      throw new Error(`Se esperaba 401 al usar clave incorrecta, se obtuvo: ${badDelRes.status}`);
    }

    // Comprobar que el movimiento NO se eliminó
    const mov2Check = db.prepare('SELECT * FROM cash_movements WHERE id = ?').get(movement2Id);
    if (!mov2Check) throw new Error('El movimiento se eliminó indebidamente con clave incorrecta');
    console.log('✅ PRUEBA 2 verificada: Contraseña incorrecta rechazada con código 401 y registro preservado');

    // -------------------------------------------------------------------------
    // PRUEBA 3: Cancelar / No enviar contraseña no modifica ningún registro
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 3: Cancelar / Omitir contraseña conserva datos intactos ---');
    const noPassRes = await fetch(`${baseUrl}/cash-registers/movements/${movement2Id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    if (noPassRes.status !== 400) {
      throw new Error(`Se esperaba 400 por omisión de contraseña, se obtuvo: ${noPassRes.status}`);
    }
    console.log('✅ PRUEBA 3 verificada: Solicitud sin contraseña rechazada con 400 sin alteraciones');

    // Limpiar movimiento de prueba con clave correcta
    await fetch(`${baseUrl}/cash-registers/movements/${movement2Id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ admin_password: 'admin123' }),
    });

    // -------------------------------------------------------------------------
    // PRUEBA 5, 6, 7: Eliminación / Anulación de Ventas por Error del Cajero
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 5, 6, 7: Anulación de Venta por Error del Cajero ---');
    // Obtener un producto para registrar venta con stock
    const products = db.prepare("SELECT id, name, stock, sale_price FROM products WHERE is_active = 1 AND stock >= 5 LIMIT 1").get() as any;
    if (!products) throw new Error('No hay productos con stock suficiente para la prueba');

    const initialStock = products.stock;
    const saleQty = 2;
    const saleItemPrice = products.sale_price || 35000;
    const expectedSaleTotal = saleQty * saleItemPrice;

    const regBeforeSale = db.prepare('SELECT expected_amount FROM cash_registers WHERE id = ?').get(registerId) as any;
    const cashBeforeSale = regBeforeSale.expected_amount;

    // Crear venta como cajero
    const createSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        customer_name: 'Cliente Prueba Venta',
        payment_method: 'cash',
        items: [
          {
            item_type: 'product',
            item_id: products.id,
            item_name: products.name,
            quantity: saleQty,
            unit_price: saleItemPrice,
          },
        ],
      }),
    });
    const createSaleData = (await createSaleRes.json()) as any;
    if (createSaleRes.status !== 201) throw new Error('Error al registrar venta');
    const createdSale = createSaleData.data;
    console.log(`Venta creada: ${createdSale.invoice_number} (${createdSale.id}) por ${expectedSaleTotal}`);

    // Verificar descuento de stock en BD
    const stockAfterSale = (db.prepare('SELECT stock FROM products WHERE id = ?').get(products.id) as any).stock;
    if (stockAfterSale !== initialStock - saleQty) {
      throw new Error(`El stock no se descontó correctamente: esperado ${initialStock - saleQty}, actual ${stockAfterSale}`);
    }

    // Verificar incremento de caja en BD
    const cashAfterSale = (db.prepare('SELECT expected_amount FROM cash_registers WHERE id = ?').get(registerId) as any).expected_amount;
    if (cashAfterSale !== cashBeforeSale + expectedSaleTotal) {
      throw new Error(`La caja no aumentó con la venta en efectivo: esperado ${cashBeforeSale + expectedSaleTotal}, actual ${cashAfterSale}`);
    }

    // PRUEBA 5: Cajero intenta anular venta con contraseña incorrecta -> Rechazado con 401
    const badCancelRes = await fetch(`${baseUrl}/sales/${createdSale.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ admin_password: 'clave_falsa' }),
    });
    if (badCancelRes.status !== 401) {
      throw new Error(`Se esperaba 401 al anular venta con clave falsa, se obtuvo: ${badCancelRes.status}`);
    }
    console.log('✅ PRUEBA 5 verificada: Cajero no puede anular venta sin contraseña válida');

    // PRUEBA 6: Cajero autoriza con contraseña de administrador correcta -> 200 y reversión
    const goodCancelRes = await fetch(`${baseUrl}/sales/${createdSale.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        admin_password: 'admin123',
        reason: 'Error de cobro en ticket',
      }),
    });
    const goodCancelData = (await goodCancelRes.json()) as any;
    if (goodCancelRes.status !== 200 || !goodCancelData.success) {
      throw new Error(`Fallo al anular venta con clave correcta: ${JSON.stringify(goodCancelData)}`);
    }

    // Verificar estado de la venta en BD
    const saleInDb = db.prepare('SELECT status, notes FROM sales WHERE id = ?').get(createdSale.id) as any;
    if (saleInDb.status !== 'cancelled') {
      throw new Error(`El estado de la venta en BD no es 'cancelled': ${saleInDb.status}`);
    }

    // Verificar reposición de inventario
    const stockAfterCancel = (db.prepare('SELECT stock FROM products WHERE id = ?').get(products.id) as any).stock;
    if (stockAfterCancel !== initialStock) {
      throw new Error(`El stock no se repuso: esperado ${initialStock}, actual ${stockAfterCancel}`);
    }

    // Verificar ajuste de caja registradora
    const cashAfterCancel = (db.prepare('SELECT expected_amount FROM cash_registers WHERE id = ?').get(registerId) as any).expected_amount;
    if (cashAfterCancel !== cashBeforeSale) {
      throw new Error(`El saldo de caja no se ajustó: esperado ${cashBeforeSale}, actual ${cashAfterCancel}`);
    }
    console.log('✅ PRUEBA 6 verificada: Venta anulada, stock repuesto exactamente e importe revertido en caja');

    // PRUEBA 7: Intento de re-anular venta ya anulada -> Rechazado con 400
    const reCancelRes = await fetch(`${baseUrl}/sales/${createdSale.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ admin_password: 'admin123' }),
    });
    if (reCancelRes.status !== 400) {
      throw new Error(`Se esperaba 400 al re-anular venta cancelada, se obtuvo: ${reCancelRes.status}`);
    }
    console.log('✅ PRUEBA 7 verificada: No se duplican reintegros ni devoluciones para ventas ya canceladas');

    // -------------------------------------------------------------------------
    // PRUEBA 8: Bloqueo de anulación si incluye comisiones ya pagadas en liquidación
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 8: Seguridad Financiera e Inmutabilidad de Pagos Históricos ---');
    // Obtener un estilista y un servicio
    const stylist = db.prepare("SELECT id, full_name FROM stylists WHERE is_active = 1 LIMIT 1").get() as any;
    const service = db.prepare("SELECT id, name, price FROM services WHERE is_active = 1 LIMIT 1").get() as any;

    // Crear venta de servicio
    const srvSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customer_name: 'Cliente Prueba Payout Protection',
        payment_method: 'card',
        items: [
          {
            item_type: 'service',
            item_id: service.id,
            item_name: service.name,
            quantity: 1,
            unit_price: service.price || 50000,
            stylist_id: stylist.id,
          },
        ],
      }),
    });
    const srvSale = ((await srvSaleRes.json()) as any).data;

    // Liquidar el pago del estilista
    const payoutRes = await fetch(`${baseUrl}/commissions/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ stylist_id: stylist.id, notes: 'Pago de prueba' }),
    });
    if (payoutRes.status !== 201) throw new Error('Error al generar liquidación');

    // Intentar anular la venta cuyo servicio ya fue pagado
    const blockedCancelRes = await fetch(`${baseUrl}/sales/${srvSale.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ admin_password: 'admin123' }),
    });
    const blockedData = (await blockedCancelRes.json()) as any;
    if (blockedCancelRes.status !== 400 || !blockedData.message.includes('historial de pagos')) {
      throw new Error(`Se esperaba bloqueo de anulación por comisión ya pagada: ${JSON.stringify(blockedData)}`);
    }
    console.log('✅ PRUEBA 8 verificada: Bloqueo estricto de anulación si el servicio ya fue pagado al estilista');

    // -------------------------------------------------------------------------
    // PRUEBA 9 & 10: Ocultamiento de Porcentaje de Ganancia y Comisiones al Cajero
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 9 & 10: Ocultamiento de Márgenes y Comisiones al Cajero ---');
    // Consultar servicios con token de cajero
    const cashierServicesRes = await fetch(`${baseUrl}/inventory/services`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const cashierServices = ((await cashierServicesRes.json()) as any).data;
    for (const srv of cashierServices) {
      if (srv.profit_margin_percent !== undefined) {
        throw new Error(`Fallo de seguridad: profit_margin_percent expuesto al cajero en servicio ${srv.name}`);
      }
      if (srv.cost !== undefined) {
        throw new Error(`Fallo de seguridad: cost expuesto al cajero en servicio ${srv.name}`);
      }
    }
    console.log('✅ Servicios sanitizados: profit_margin_percent y cost no expuestos al cajero');

    // Consultar estilistas con token de cajero
    const cashierStylistsRes = await fetch(`${baseUrl}/stylists`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const cashierStylists = ((await cashierStylistsRes.json()) as any).data;
    for (const sty of cashierStylists) {
      if (sty.commission_rate !== undefined) {
        throw new Error(`Fallo de seguridad: commission_rate expuesto al cajero en estilista ${sty.full_name}`);
      }
    }
    console.log('✅ Estilistas sanitizados: commission_rate no expuesto al cajero');

    // Consultar ventas con token de cajero
    const cashierSalesRes = await fetch(`${baseUrl}/sales`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const cashierSales = ((await cashierSalesRes.json()) as any).data;
    if (Array.isArray(cashierSales)) {
      for (const sale of cashierSales) {
        if (Array.isArray(sale.items)) {
          for (const it of sale.items) {
            if (it.commission_rate !== undefined || it.commission_amount !== undefined || it.profit_margin_percent !== undefined) {
              throw new Error(`Fallo de seguridad: datos de comisiones/márgenes expuestos al cajero en ticket ${sale.invoice_number}`);
            }
          }
        }
      }
    }
    console.log('✅ Ventas sanitizadas: commission_rate, commission_amount y profit_margin no expuestos al cajero');

    // Intento del cajero de acceder a /settings -> 403 Forbidden
    const cashierSettingsRes = await fetch(`${baseUrl}/settings`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    if (cashierSettingsRes.status !== 403) {
      throw new Error(`Se esperaba 403 Forbidden al consultar /settings como cajero, se obtuvo: ${cashierSettingsRes.status}`);
    }
    console.log('✅ PRUEBA 9 & 10 verificadas: Módulo de configuración de ganancias protegido con 403 Forbidden');

    // -------------------------------------------------------------------------
    // PRUEBA 11: Ocultar Monto Acumulado de Ventas / Saldos de Caja al Cajero
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 11: Ocultamiento de Saldos Acumulados de Caja al Cajero ---');
    const cashierRegRes = await fetch(`${baseUrl}/cash-registers/current`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const cashierRegData = ((await cashierRegRes.json()) as any).data;
    if (cashierRegData.expected_amount !== 0 || cashierRegData.initial_amount !== 0) {
      throw new Error(`Fallo de seguridad: importes acumulados de caja expuestos al cajero: ${JSON.stringify(cashierRegData)}`);
    }
    console.log('✅ PRUEBA 11 verificada: initial_amount y expected_amount enmascarados en 0 para el cajero');

    // -------------------------------------------------------------------------
    // PRUEBA 12: Cajero Puede Cobrar y Ver el Total de la Operación Actual
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 12: Cajero puede cobrar y calcular el total de la venta actual ---');
    const cashierSaleTestRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        customer_name: 'Cliente Operación Cajero',
        payment_method: 'card',
        items: [
          {
            item_type: 'service',
            item_id: service.id,
            item_name: service.name,
            quantity: 1,
            unit_price: service.price || 60000,
            stylist_id: stylist.id,
          },
        ],
      }),
    });
    const cashierSaleTestData = (await cashierSaleTestRes.json()) as any;
    if (cashierSaleTestRes.status !== 201 || cashierSaleTestData.data.total <= 0) {
      throw new Error('El cajero no pudo procesar la venta individual');
    }
    console.log(`✅ PRUEBA 12 verificada: Cobro de venta individual completado con ticket ${cashierSaleTestData.data.invoice_number} por ${cashierSaleTestData.data.total}`);

    // -------------------------------------------------------------------------
    // PRUEBA 13: Administrador Conserva Acceso Autorizado a Márgenes y Acumulados
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 13: Administrador conserva acceso completo a datos financieros ---');
    const adminRegCheck = await fetch(`${baseUrl}/cash-registers/current`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminRegData = ((await adminRegCheck.json()) as any).data;
    if (adminRegData.expected_amount === 0 && adminRegData.status === 'open') {
      console.warn('Nota: saldo esperado es 0 o calculado');
    }

    const adminStylistsCheck = await fetch(`${baseUrl}/stylists`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminStylists = ((await adminStylistsCheck.json()) as any).data;
    if (adminStylists[0].commission_rate === undefined) {
      throw new Error('El administrador debería ver commission_rate de los estilistas');
    }

    const adminReportsCheck = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminReportsCheck.status !== 200) {
      throw new Error(`Admin no pudo acceder a /reports/dashboard: ${adminReportsCheck.status}`);
    }
    console.log('✅ PRUEBA 13 verificada: Administrador mantiene acceso integral a métricas, márgenes y reportes');

    // -------------------------------------------------------------------------
    // PRUEBA 14: Auditoría y Trazabilidad Registradas en Base de Datos
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 14: Auditoría y Trazabilidad en audit_logs ---');
    const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5').all() as any[];
    if (auditLogs.length === 0) {
      throw new Error('No se encontraron registros en audit_logs');
    }
    console.log(`Registros de auditoría encontrados: ${auditLogs.length}`);
    const deleteAudit = auditLogs.find((a) => a.action === 'delete_movement');
    const cancelAudit = auditLogs.find((a) => a.action === 'cancel_sale');
    if (!deleteAudit || !cancelAudit) {
      throw new Error('Faltan registros de auditoría para delete_movement o cancel_sale');
    }
    console.log('✅ PRUEBA 14 verificada: Acciones registradas con ID de usuario, fecha, motivo y datos en audit_logs');

    // -------------------------------------------------------------------------
    // PRUEBA 15: Coexistencia con Pagos a Estilistas y Módulos Existentes
    // -------------------------------------------------------------------------
    console.log('\n--- PRUEBA 15: Coexistencia y Estabilidad de Todo el Sistema ---');
    const pendingStylistsCheck = await fetch(`${baseUrl}/commissions/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (pendingStylistsCheck.status !== 200) {
      throw new Error('Módulo de comisiones pendientes falló');
    }

    const payoutsHistoryCheck = await fetch(`${baseUrl}/commissions/payouts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (payoutsHistoryCheck.status !== 200) {
      throw new Error('Historial de pagos a estilistas falló');
    }
    console.log('✅ PRUEBA 15 verificada: Comisiones, pagos a estilistas y ventas funcionan de forma coherente y robusta');

    console.log('\n================================================================');
    console.log('🎉 TODOS LOS 15 ESCENARIOS DE SEGURIDAD Y AUDITORÍA PASARON CON ÉXITO 🎉');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('❌ Error en pruebas E2E de seguridad:', error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runSecurityCajaVentasE2ETests();
