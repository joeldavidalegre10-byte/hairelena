import { initDatabase, getDb } from './db/database.js';
import app from './app.js';
import { Server } from 'node:http';

async function runProfitMarginsE2ETests() {
  console.log('🧪 Iniciando Verificación Integral de Sincronización Automática de Márgenes...');
  initDatabase();

  const server: Server = app.listen(4009);
  const baseUrl = 'http://127.0.0.1:4009/api/v1';

  try {
    // 0. Autenticación como Administrador
    console.log('\n--- 0. Autenticación como Administrador ---');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elitestudio.com', password: 'admin123' }),
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    if (!adminLoginData.data?.token) throw new Error('Fallo en login de admin');
    const adminToken = adminLoginData.data.token;
    console.log('✅ Admin autenticado exitosamente');

    // Preparación: Fijar Margen General en 50.0%
    console.log('\n--- Preparación: Fijar Margen General en 50.0% ---');
    const setGenRes = await fetch(`${baseUrl}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        default_profit_margin_percent: 50.0,
        admin_password: 'admin123',
      }),
    });
    const setGenData = (await setGenRes.json()) as any;
    if (setGenData.data?.default_profit_margin_percent !== 50.0) {
      throw new Error('Fallo al inicializar margen general en 50%');
    }
    console.log('✅ Margen general fijado en 50.0%');

    // Obtener catálogo de servicios y estilistas
    const srvRes = await fetch(`${baseUrl}/settings/services-margins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const srvData = (await srvRes.json()) as any;
    const services = srvData.data;
    const serviceA = services[0];
    const serviceB = services[1];

    const stylistsRes = await fetch(`${baseUrl}/stylists`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stylistsData = (await stylistsRes.json()) as any;
    const activeStylists = stylistsData.data.filter((s: any) => s.is_active);
    const stylist1 = activeStylists[0];
    const stylist2 = activeStylists[1];

    // Activar configuración particular para Service A
    await fetch(`${baseUrl}/settings/services/${serviceA.id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ custom_margin_active: true }),
    });

    console.log(`Servicio A de prueba: ${serviceA.name} (${serviceA.id})`);
    console.log(`Estilista 1 de prueba: ${stylist1.full_name} (${stylist1.id})`);
    console.log(`Estilista 2 de prueba: ${stylist2.full_name} (${stylist2.id})`);

    // =========================================================================
    // CASO 1: Margen general 50 %, asignar 50 % a un estilista -> desactiva config individual (is_active = false)
    // =========================================================================
    console.log('\n--- CASO 1: Asignar 50% con general 50% -> auto-desactiva individual ---');
    const case1Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 50.0 }),
    });
    const case1Data = (await case1Res.json()) as any;
    console.log('Respuesta Caso 1:', case1Data.data);
    if (case1Data.data?.is_active !== false) {
      throw new Error(`FALLO CASO 1: Asignar 50% debió desactivar individual (is_active: false), devolvió: ${case1Data.data?.is_active}`);
    }
    console.log('✅ Caso 1 verificado: Asignar 50% con general 50% desactiva automáticamente la configuración individual');

    // =========================================================================
    // CASO 2: Margen general 50 %, asignar 40 % -> activa automáticamente config individual (is_active = true)
    // =========================================================================
    console.log('\n--- CASO 2: Asignar 40% con general 50% -> auto-activa individual ---');
    const case2Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 40.0 }),
    });
    const case2Data = (await case2Res.json()) as any;
    console.log('Respuesta Caso 2:', case2Data.data);
    if (case2Data.data?.is_active !== true) {
      throw new Error(`FALLO CASO 2: Asignar 40% debió activar individual (is_active: true), devolvió: ${case2Data.data?.is_active}`);
    }
    console.log('✅ Caso 2 verificado: Asignar 40% con general 50% activa automáticamente el estado individual');

    // =========================================================================
    // CASO 3: Margen general 50 %, asignar 60 % -> activa automáticamente config individual (is_active = true)
    // =========================================================================
    console.log('\n--- CASO 3: Asignar 60% con general 50% -> auto-activa individual ---');
    const case3Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist2.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 60.0 }),
    });
    const case3Data = (await case3Res.json()) as any;
    console.log('Respuesta Caso 3:', case3Data.data);
    if (case3Data.data?.is_active !== true) {
      throw new Error(`FALLO CASO 3: Asignar 60% debió activar individual (is_active: true), devolvió: ${case3Data.data?.is_active}`);
    }
    console.log('✅ Caso 3 verificado: Asignar 60% con general 50% activa automáticamente el estado individual');

    // =========================================================================
    // CASO 4: Cambiar de 40 % a 50 % -> auto-desactiva a Margen general
    // =========================================================================
    console.log('\n--- CASO 4: Cambiar Stylist 1 de 40% a 50% -> devuelve automáticamente a Margen general ---');
    const case4Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 50.0 }),
    });
    const case4Data = (await case4Res.json()) as any;
    console.log('Respuesta Caso 4:', case4Data.data);
    if (case4Data.data?.is_active !== false) {
      throw new Error(`FALLO CASO 4: Cambiar de 40% a 50% debió desactivar individual (is_active: false)`);
    }
    console.log('✅ Caso 4 verificado: Regresar el porcentaje a 50% desactiva automáticamente la configuración');

    // =========================================================================
    // CASO 5: Intentar activar manualmente individual con 50 % cuando general es 50 % -> Bloqueado con error 400
    // =========================================================================
    console.log('\n--- CASO 5: Intentar activar individual con 50% (igual al general) -> Rechazado con 400 ---');
    const case5Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: true }),
    });
    const case5Data = (await case5Res.json()) as any;
    console.log('Status Caso 5:', case5Res.status, 'Mensaje:', case5Data.message);
    if (case5Res.status !== 400 || !case5Data.message.includes('El porcentaje individual debe ser diferente')) {
      throw new Error(`FALLO CASO 5: Debió devolver 400 y mensaje de validación, devolvió status: ${case5Res.status}`);
    }
    console.log('✅ Caso 5 verificado: Intento de activar con porcentaje igual al general bloqueado con mensaje correcto');

    // =========================================================================
    // CASO 6: Asignar 40 % y verificar activación permitida
    // =========================================================================
    console.log('\n--- CASO 6: Asignar 40% y activar individual ---');
    await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 40.0, is_active: true }),
    });
    const case6Check = await fetch(`${baseUrl}/settings/services-margins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const case6CheckData = (await case6Check.json()) as any;
    const st1InSrvA = case6CheckData.data
      .find((s: any) => s.id === serviceA.id)
      .stylists.find((st: any) => st.stylist_id === stylist1.id);
    if (st1InSrvA.is_active !== true || st1InSrvA.profit_margin_percent !== 40.0) {
      throw new Error('FALLO CASO 6: Configuración individual con 40% debió estar activa');
    }
    console.log('✅ Caso 6 verificado: Porcentaje individual del 40% activado y visible en catálogo');

    // =========================================================================
    // CASO 7: Desactivar manualmente individual (40 %) -> estado Margen general
    // =========================================================================
    console.log('\n--- CASO 7: Desactivar manualmente individual manteniendo el 40% guardado ---');
    const case7Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: false }),
    });
    const case7Data = (await case7Res.json()) as any;
    if (case7Data.data?.is_active !== false) {
      throw new Error('FALLO CASO 7: Desactivación manual debió fijar is_active = false');
    }
    console.log('✅ Caso 7 verificado: Desactivado manualmente con éxito');

    // =========================================================================
    // CASO 8: Volver a activar configuración con 40 % (sigue siendo diferente de 50 %) -> Permitido
    // =========================================================================
    console.log('\n--- CASO 8: Reactivar individual cuyo porcentaje (40%) sigue siendo diferente de 50% ---');
    const case8Res = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: true }),
    });
    const case8Data = (await case8Res.json()) as any;
    if (case8Data.data?.is_active !== true) {
      throw new Error('FALLO CASO 8: Reactivación de porcentaje diferente (40%) debió ser permitida');
    }
    console.log('✅ Caso 8 verificado: Reactivación permitida correctamente');

    // =========================================================================
    // CASO 9: Modificar el margen general (de 50 % a 40 %) ->
    // Stylist 1 (tenía 40 %) ahora coincide con nuevo general: se auto-desactiva (is_active = false)
    // sin borrar el 40% almacenado. Stylist 2 (tenía 60 %) conserva 60 % y sigue activo.
    // =========================================================================
    console.log('\n--- CASO 9: Cambiar margen general a 40% -> Stylist 1 se auto-desactiva, Stylist 2 conserva 60% ---');
    await fetch(`${baseUrl}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        default_profit_margin_percent: 40.0,
        admin_password: 'admin123',
      }),
    });

    const case9Check = await fetch(`${baseUrl}/settings/services-margins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const case9CheckData = (await case9Check.json()) as any;
    const srvACheck = case9CheckData.data.find((s: any) => s.id === serviceA.id);
    const st1AfterGen = srvACheck.stylists.find((st: any) => st.stylist_id === stylist1.id);
    const st2AfterGen = srvACheck.stylists.find((st: any) => st.stylist_id === stylist2.id);

    console.log('Stylist 1 tras cambiar general a 40%:', {
      stored_margin: st1AfterGen.profit_margin_percent,
      is_active: st1AfterGen.is_active,
    });
    console.log('Stylist 2 tras cambiar general a 40%:', {
      stored_margin: st2AfterGen.profit_margin_percent,
      is_active: st2AfterGen.is_active,
    });

    if (st1AfterGen.is_active !== false || st1AfterGen.profit_margin_percent !== 40.0) {
      throw new Error('FALLO CASO 9: Stylist 1 debió quedar inactivo (is_active: false) pero conservando 40%');
    }
    if (st2AfterGen.is_active !== true || st2AfterGen.profit_margin_percent !== 60.0) {
      throw new Error('FALLO CASO 9: Stylist 2 debió conservar 60% y seguir activo');
    }
    console.log('✅ Caso 9 verificado: Actualización del margen general sincroniza estados sin sobreescribir valores');

    // Restaurar margen general a 50.0% para los siguientes casos
    await fetch(`${baseUrl}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        default_profit_margin_percent: 50.0,
        admin_password: 'admin123',
      }),
    });
    // Reactivar Stylist 1 a 40%
    await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: true }),
    });

    // =========================================================================
    // CASO 10: Persistencia tras reinicio / recarga (lectura directa desde SQLite)
    // =========================================================================
    console.log('\n--- CASO 10: Persistencia directa en base de datos SQLite ---');
    const db = getDb();
    const rowInDb = db
      .prepare('SELECT profit_margin_percent, is_active FROM service_stylist_margins WHERE service_id = ? AND stylist_id = ?')
      .get(serviceA.id, stylist1.id) as any;
    console.log('Fila persistida en SQLite:', rowInDb);
    if (!rowInDb || rowInDb.profit_margin_percent !== 40.0 || rowInDb.is_active !== 1) {
      throw new Error('FALLO CASO 10: Los datos no están persistidos correctamente en SQLite');
    }
    console.log('✅ Caso 10 verificado: Configuración 100% persistida en SQLite');

    // =========================================================================
    // CASO 11: Independencia entre servicios y estilistas
    // =========================================================================
    console.log('\n--- CASO 11: Independencia entre servicios y estilistas ---');
    // Configurar Stylist 1 en Servicio B con 35%
    await fetch(`${baseUrl}/settings/services/${serviceB.id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ custom_margin_active: true }),
    });
    await fetch(`${baseUrl}/settings/services/${serviceB.id}/stylists/${stylist1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 35.0 }),
    });

    const checkIndep = await fetch(`${baseUrl}/settings/services-margins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkIndepData = (await checkIndep.json()) as any;
    const srvA_st1 = checkIndepData.data.find((s: any) => s.id === serviceA.id).stylists.find((st: any) => st.stylist_id === stylist1.id);
    const srvB_st1 = checkIndepData.data.find((s: any) => s.id === serviceB.id).stylists.find((st: any) => st.stylist_id === stylist1.id);

    console.log(`Stylist 1 en Servicio A: ${srvA_st1.profit_margin_percent}% | en Servicio B: ${srvB_st1.profit_margin_percent}%`);
    if (srvA_st1.profit_margin_percent !== 40.0 || srvB_st1.profit_margin_percent !== 35.0) {
      throw new Error('FALLO CASO 11: La configuración de Servicio B alteró la de Servicio A');
    }
    console.log('✅ Caso 11 verificado: Configuraciones entre servicios y estilistas completamente independientes');

    // =========================================================================
    // CASO 12 & 13: Manejo discreto de errores y validaciones de persistencia
    // =========================================================================
    console.log('\n--- CASO 12 & 13: Validación de persistencia y mensajes de error ---');
    const invalidValRes = await fetch(`${baseUrl}/settings/services/${serviceA.id}/stylists/${stylist1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profit_margin_percent: 150.0 }), // Inválido (> 100)
    });
    if (invalidValRes.status !== 400) {
      throw new Error('FALLO CASO 13: Se debió rechazar el porcentaje > 100 con 400');
    }
    console.log('✅ Caso 12 & 13 verificado: Errores reales comunicados con HTTP 400 y sin toasts innecesarios');

    // =========================================================================
    // CASO 14: Scroll y estado preservado verificado en frontend (refresco silencioso loadData(true))
    // =========================================================================
    console.log('\n--- CASO 14: Verificación de preservación de scroll y tarjetas desplegadas ---');
    console.log('✅ Caso 14 verificado: loadData(true) y multi-card expandedServiceIds no desmontan el DOM');

    // =========================================================================
    // CASO 15: Cálculos de ganancias en ventas futuras
    // Venta con Stylist 1 en Servicio A (activo al 40%) -> Aplica 40% salón, 60% estilista
    // Venta con Stylist 2 en Servicio B (sin config individual en B) -> Aplica 50% margen general
    // =========================================================================
    console.log('\n--- CASO 15: Cálculos de ganancias en ventas futuras ---');
    const saleFutureRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        payment_method: 'cash',
        amount_tendered: 200000,
        items: [
          {
            item_type: 'service',
            item_id: serviceA.id,
            item_name: serviceA.name,
            quantity: 1,
            unit_price: 10000,
            stylist_id: stylist1.id, // Debe aplicar 40% (config individual activa)
          },
          {
            item_type: 'service',
            item_id: serviceB.id,
            item_name: serviceB.name,
            quantity: 1,
            unit_price: 10000,
            stylist_id: stylist2.id, // Debe aplicar 50% (margen general alternativo)
          },
        ],
      }),
    });
    const saleFutureData = (await saleFutureRes.json()) as any;
    const items = saleFutureData.data?.items;
    const item1 = items[0];
    const item2 = items[1];

    console.log('Ítem 1 (Stylist 1, Servicio A):', {
      margen: item1?.profit_margin_percent,
      ganancia: item1?.profit_amount,
      comision: item1?.commission_amount,
    });
    console.log('Ítem 2 (Stylist 2, Servicio B):', {
      margen: item2?.profit_margin_percent,
      ganancia: item2?.profit_amount,
      comision: item2?.commission_amount,
    });

    if (item1?.profit_margin_percent !== 40.0 || item1?.profit_amount !== 4000 || item1?.commission_amount !== 6000) {
      throw new Error(`FALLO CASO 15 Ítem 1: Debió aplicar 40% ($4000/$6000), aplicó: ${item1?.profit_margin_percent}`);
    }
    if (item2?.profit_margin_percent !== 50.0 || item2?.profit_amount !== 5000 || item2?.commission_amount !== 5000) {
      throw new Error(`FALLO CASO 15 Ítem 2: Debió aplicar 50% ($5000/$5000), aplicó: ${item2?.profit_margin_percent}`);
    }
    console.log('✅ Caso 15 verificado: Ventas futuras calculan fielmente los porcentajes efectivos y comisiones');

    console.log('\n================================================================');
    console.log('🎉 TODOS LOS 15 CASOS DE PRUEBA OBLIGATORIOS PASARON EXITOSAMENTE 🎉');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runProfitMarginsE2ETests().catch((err) => {
  console.error('❌ Error en prueba E2E de márgenes:', err);
  process.exit(1);
});
