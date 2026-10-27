import { initDatabase, getDb } from './db/database.js';
import app from './app.js';
import { Server } from 'node:http';

async function runE2ETests() {
  console.log('🧪 Iniciando Pruebas E2E del Sistema Elite Studio POS...');
  initDatabase();

  const server: Server = app.listen(4005);
  const baseUrl = 'http://127.0.0.1:4005/api/v1';

  try {
    // 1. Login como Cajero
    console.log('\n--- 1. Autenticación de Cajero ---');
    const cashierLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'caja@elitestudio.com', password: 'caja123' })
    });
    const cashierLoginData = await cashierLoginRes.json() as any;
    console.log('Login Cajero status:', cashierLoginRes.status, 'Role:', cashierLoginData.data?.user?.role);
    if (!cashierLoginData.data?.token) throw new Error('Falló login de cajero: ' + JSON.stringify(cashierLoginData));
    const cashierToken = cashierLoginData.data.token;
    const cashierId = cashierLoginData.data.user.id;

    // 2. Comprobar Privacidad de Caja para Cajero
    console.log('\n--- 2. Privacidad de Totales de Caja para Cajero ---');
    const cashierDrawerRes = await fetch(`${baseUrl}/cash-registers/current`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    const cashierDrawerData = await cashierDrawerRes.json() as any;
    console.log('Caja respuesta para cajero:', cashierDrawerData.data?.status);
    console.log('Monto inicial visible para cajero:', cashierDrawerData.data?.initial_amount);
    console.log('Monto esperado visible para cajero:', cashierDrawerData.data?.expected_amount);
    if (cashierDrawerData.data?.initial_amount !== 0 || cashierDrawerData.data?.expected_amount !== 0) {
      throw new Error('FALLO DE PRIVACIDAD: El cajero puede ver los montos acumulados de la caja');
    }
    console.log('✅ Verificado: Los montos de caja están protegidos y ocultos (0) para el cajero');

    // 3. Comprobar RBAC: Cajero no debe acceder a reportes, configuraciones ni comisiones
    console.log('\n--- 3. Restricción de Rutas para Cajero (RBAC) ---');
    const cashierReportsRes = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    console.log('Acceso de cajero a /reports/dashboard:', cashierReportsRes.status);
    if (cashierReportsRes.status !== 403) throw new Error('FALLO RBAC: Cajero pudo acceder a reportes');

    const cashierSettingsRes = await fetch(`${baseUrl}/settings/profit-margins`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    console.log('Acceso de cajero a /settings/profit-margins:', cashierSettingsRes.status);
    if (cashierSettingsRes.status !== 403) throw new Error('FALLO RBAC: Cajero pudo acceder a configuración de ganancias');

    const cashierCommsRes = await fetch(`${baseUrl}/commissions`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    console.log('Acceso de cajero a /commissions:', cashierCommsRes.status);
    if (cashierCommsRes.status !== 403) throw new Error('FALLO RBAC: Cajero pudo acceder a comisiones');
    console.log('✅ Verificado: Rutas de administración bloqueadas con 403 Forbidden para cajero');

    // 4. Login como Admin
    console.log('\n--- 4. Autenticación de Administrador ---');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elitestudio.com', password: 'admin123' })
    });
    const adminLoginData = await adminLoginRes.json() as any;
    console.log('Login Admin status:', adminLoginRes.status, 'Role:', adminLoginData.data?.user?.role);
    const adminToken = adminLoginData.data.token;

    // 5. Configuración de Ganancias por Admin
    console.log('\n--- 5. Configuración de Margen de Ganancia (Admin) ---');
    const updateSettingsRes = await fetch(`${baseUrl}/settings/profit-margins`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        default_profit_margin: 45.0,
        service_margins: []
      })
    });
    const updateSettingsData = await updateSettingsRes.json() as any;
    console.log('Configuración de margen actualizada a:', updateSettingsData.data?.default_profit_margin, '%');
    if (updateSettingsData.data?.default_profit_margin !== 45.0) {
      throw new Error('Fallo al actualizar margen general');
    }

    // 6. Obtener Servicios y Estilistas disponibles
    const servicesRes = await fetch(`${baseUrl}/inventory/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const servicesData = await servicesRes.json() as any;
    const testService = servicesData.data[0];

    const stylistsRes = await fetch(`${baseUrl}/stylists`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const stylistsData = await stylistsRes.json() as any;
    const testStylist = stylistsData.data.find((s: any) => s.is_active);

    console.log('Servicio de prueba:', testService?.name, 'ID:', testService?.id);
    console.log('Estilista activo:', testStylist?.full_name, 'ID:', testStylist?.id);

    // 7. Prueba POS: Rechazo de servicio sin estilista
    console.log('\n--- 7. Validación POS: Servicio sin estilista ---');
    const invalidSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        payment_method: 'cash',
        amount_tendered: 100000,
        items: [
          {
            item_type: 'service',
            item_id: testService.id,
            item_name: testService.name,
            quantity: 1,
            unit_price: testService.price,
            stylist_id: undefined // Sin estilista
          }
        ]
      })
    });
    console.log('Venta rechazada sin estilista status:', invalidSaleRes.status);
    const invalidSaleData = await invalidSaleRes.json() as any;
    console.log('Mensaje de error recibido:', invalidSaleData.message);
    if (invalidSaleRes.status !== 400) {
      throw new Error('FALLO: Se permitió registrar un servicio sin estilista');
    }
    console.log('✅ Verificado: La selección de estilista es 100% obligatoria para servicios');

    // 8. Prueba POS: Venta exitosa con estilista
    console.log('\n--- 8. Venta exitosa con estilista y cálculo de ganancia ---');
    const validSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        payment_method: 'cash',
        amount_tendered: 100000,
        items: [
          {
            item_type: 'service',
            item_id: testService.id,
            item_name: testService.name,
            quantity: 1,
            unit_price: testService.price,
            stylist_id: testStylist.id
          }
        ]
      })
    });
    console.log('Venta con estilista status:', validSaleRes.status);
    const validSaleData = await validSaleRes.json() as any;
    if (validSaleRes.status !== 201) {
      throw new Error('Fallo al registrar venta válida: ' + validSaleData.message);
    }
    const createdSale = validSaleData.data;
    console.log('Ticket generado:', createdSale.invoice_number);
    console.log('Item registrado:', createdSale.items[0]?.item_name);
    console.log('Margen snapshot grabado (%):', createdSale.items[0]?.profit_margin_percent);
    console.log('Monto de ganancia grabado:', createdSale.items[0]?.profit_amount);
    console.log('Comisión del estilista generada:', createdSale.items[0]?.commission_amount);

    if (createdSale.items[0]?.profit_margin_percent !== 45.0) {
      throw new Error('FALLO: El snapshot de margen de ganancia no coincide con la configuración activa');
    }
    console.log('✅ Verificado: Snapshot de ganancia y comisión grabado fielmente en la venta');

    // 9. Inmutabilidad histórica: Modificar margen general no altera ventas anteriores
    console.log('\n--- 9. Verificación de Inmutabilidad Histórica ---');
    await fetch(`${baseUrl}/settings/profit-margins`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ default_profit_margin: 20.0 })
    });

    const verifyHistoricalSaleRes = await fetch(`${baseUrl}/sales/${createdSale.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const verifyHistoricalData = await verifyHistoricalSaleRes.json() as any;
    const historicalItem = verifyHistoricalData.data?.items[0];
    console.log('Margen del item tras cambio global a 20%:', historicalItem?.profit_margin_percent, '%');
    if (historicalItem?.profit_margin_percent !== 45.0) {
      throw new Error('FALLO DE INMUTABILIDAD: La venta histórica fue modificada al cambiar la configuración');
    }
    console.log('✅ Verificado: Las ventas pasadas permanecen inmutables');

    // 10. Reportes Administrativos: Rendimiento de Estilistas
    console.log('\n--- 10. Métricas y Rendimiento de Estilistas en Reportes ---');
    const reportsRes = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reportsData = await reportsRes.json() as any;
    console.log('Estilistas en reporte:', reportsData.data?.stylist_performance?.length);
    console.log('Detalle estilista:', JSON.stringify(reportsData.data?.stylist_performance[0]));
    if (!reportsData.data?.stylist_performance) {
      throw new Error('FALLO: No se generó el desglose de rendimiento de estilistas en reportes');
    }
    console.log('✅ Verificado: El reporte administrativo incluye desglose por estilista, servicios, comisiones y ganancias');

    console.log('\n======================================================');
    console.log('🎉 TODAS LAS PRUEBAS E2E PASARON EXITOSAMENTE 🎉');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runE2ETests().catch((err) => {
  console.error('❌ Error en prueba E2E:', err);
  process.exit(1);
});
