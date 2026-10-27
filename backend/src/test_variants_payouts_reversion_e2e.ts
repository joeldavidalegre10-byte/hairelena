import { initDatabase, getDb } from './db/database.js';
import app from './app.js';
import { Server } from 'node:http';

async function runE2ETests() {
  console.log('🧪 Iniciando Verificación Integral de Variantes de Servicio, Reversión de Pagos y Exclusión de Pendientes...\n');
  initDatabase();

  const PORT = 4020;
  const server: Server = app.listen(PORT);
  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;

  try {
    // -------------------------------------------------------------------------
    // 0. Autenticación de Administrador
    // -------------------------------------------------------------------------
    console.log('--- 0. Autenticación ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elitestudio.com', password: 'admin123' }),
    });
    const loginData = (await loginRes.json()) as any;
    if (!loginData.data?.token) throw new Error('Fallo en login de admin');
    const adminToken = loginData.data.token;
    console.log('✅ Admin autenticado exitosamente');

    // -------------------------------------------------------------------------
    // 1. Verificación de Variantes de Precio de Servicios (Sección 1)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Verificación de Variantes y Precios de Servicios ---');
    const srvRes = await fetch(`${baseUrl}/inventory/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const srvData = (await srvRes.json()) as any;
    if (!srvData.success || !Array.isArray(srvData.data)) throw new Error('Fallo al listar servicios');

    const balayage = srvData.data.find((s: any) => s.id === 'srv-04');
    const botox = srvData.data.find((s: any) => s.id === 'srv-05');
    const corteCaballero = srvData.data.find((s: any) => s.id === 'srv-01');

    if (!balayage) throw new Error('Servicio Balayage Premium no encontrado');
    if (!balayage.variants || balayage.variants.length < 2) {
      throw new Error(`Balayage debería tener variantes configuradas. Encontradas: ${balayage.variants?.length}`);
    }
    console.log(`✅ Balayage Premium cuenta con ${balayage.variants.length} variantes:`);
    balayage.variants.forEach((v: any) => {
      console.log(`   - ${v.name}: ₲ ${v.price.toLocaleString('es-PY')} (${v.duration_minutes} min)`);
    });

    if (!botox || !botox.variants || botox.variants.length < 2) {
      throw new Error('Botox Capilar debería tener al menos 2 variantes');
    }
    console.log(`✅ Botox Capilar cuenta con ${botox.variants.length} variantes:`);
    botox.variants.forEach((v: any) => {
      console.log(`   - ${v.name}: ₲ ${v.price.toLocaleString('es-PY')}`);
    });

    if (corteCaballero.variants && corteCaballero.variants.length > 0) {
      console.log(`ℹ️ Corte Caballero tiene ${corteCaballero.variants.length} variantes`);
    } else {
      console.log(`✅ Corte Caballero tiene precio único (₲ ${corteCaballero.price.toLocaleString('es-PY')}), no requiere modal de variantes`);
    }

    // -------------------------------------------------------------------------
    // 2. Registro de Venta con Variante Seleccionada y Cálculo de Comisión
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Registro de Venta con Modalidad Elegida (Balayage Largo Extra ₲ 450.000) ---');
    const chosenVariant = balayage.variants.find((v: any) => v.price === 450000) || balayage.variants[1];
    
    // Obtener estilistas
    const styRes = await fetch(`${baseUrl}/stylists`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const styData = (await styRes.json()) as any;
    const stylistValeria = styData.data.find((s: any) => s.full_name.includes('Valeria')) || styData.data[0];

    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customer_name: 'Cliente Prueba Balayage',
        payment_method: 'cash',
        amount_tendered: 450000,
        items: [
          {
            item_type: 'service',
            item_id: balayage.id,
            item_name: `${balayage.name} (${chosenVariant.name})`,
            quantity: 1,
            unit_price: chosenVariant.price,
            stylist_id: stylistValeria.id,
          },
        ],
      }),
    });
    const saleResult = (await saleRes.json()) as any;
    if (!saleResult.success) throw new Error(`Fallo al registrar venta: ${saleResult.message}`);
    
    console.log(`✅ Venta #${saleResult.data.invoice_number} creada exitosamente con importe ₲ ${saleResult.data.total.toLocaleString('es-PY')}`);
    const saleItem = saleResult.data.items[0];
    if (saleItem.unit_price !== chosenVariant.price) {
      throw new Error(`Precio del ítem (${saleItem.unit_price}) no coincide con la variante (${chosenVariant.price})`);
    }
    console.log(`✅ Ítem registrado: "${saleItem.item_name}" a ₲ ${saleItem.unit_price.toLocaleString('es-PY')}`);
    console.log(`   Comisión calculada sobre precio de variante: ₲ ${saleItem.commission_amount.toLocaleString('es-PY')} (Tasa: ${saleItem.commission_rate}%)`);
    console.log(`   Ganancia del salón calculada: ₲ ${saleItem.profit_amount.toLocaleString('es-PY')} (Margen: ${saleItem.profit_margin_percent}%)`);

    // -------------------------------------------------------------------------
    // 3. Verificación de Servicios Pendientes de Pago en Módulo de Estilistas
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Verificación de Pendientes en Módulo de Pagos a Estilistas ---');
    const pendingRes = await fetch(`${baseUrl}/commissions/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingData = (await pendingRes.json()) as any;
    const stylistPending = pendingData.data.find((s: any) => s.stylist_id === stylistValeria.id);
    if (!stylistPending) throw new Error('Estilista debería figurar en lista de pendientes');
    
    console.log(`✅ ${stylistPending.stylist_name} tiene ${stylistPending.pending_services_count} servicios pendientes con saldo ₲ ${stylistPending.total_pending_amount.toLocaleString('es-PY')}`);
    const pendingBalayage = stylistPending.services.find((s: any) => s.sale_id === saleResult.data.id);
    if (!pendingBalayage) throw new Error('Servicio de Balayage no figura en pendientes del estilista');
    console.log(`✅ Servicio pendiente identificado: "${pendingBalayage.service_name}" por ₲ ${pendingBalayage.amount_to_pay.toLocaleString('es-PY')}`);

    // -------------------------------------------------------------------------
    // 4. Ejecutar Pago al Estilista ("Pagar ahora")
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Ejecución del Pago al Estilista ("Pagar ahora") ---');
    const payoutRes = await fetch(`${baseUrl}/commissions/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        stylist_id: stylistValeria.id,
        notes: 'Pago semanal liquidado',
      }),
    });
    const payoutData = (await payoutRes.json()) as any;
    if (!payoutData.success) throw new Error(`Fallo al ejecutar pago: ${payoutData.message}`);
    const createdPayout = payoutData.data;
    console.log(`✅ Pago #${createdPayout.id} liquidado por ₲ ${createdPayout.total_amount.toLocaleString('es-PY')} (${createdPayout.services_count} servicios)`);

    // Verificar que los servicios ya no figuran en pendientes
    const pendingAfterPayoutRes = await fetch(`${baseUrl}/commissions/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingAfterData = (await pendingAfterPayoutRes.json()) as any;
    const stillPending = pendingAfterData.data.find((s: any) => s.stylist_id === stylistValeria.id);
    if (stillPending && stillPending.pending_services_count > 0) {
      throw new Error('El estilista no debería tener pendientes tras la liquidación');
    }
    console.log('✅ El estilista ya no figura en la sección "Por pagar" (saldo liquidado)');

    // -------------------------------------------------------------------------
    // 5. Revertir Pago (Sección 3.1)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Reversión de Pago con Autorización de Administrador (Sección 3.1) ---');
    // Intento con contraseña incorrecta
    const wrongRevertRes = await fetch(`${baseUrl}/commissions/payouts/${createdPayout.id}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        admin_password: 'clave_incorrecta_xyz',
        reason: 'Error de prueba',
      }),
    });
    if (wrongRevertRes.status !== 401) {
      throw new Error(`Se esperaba código 401 con contraseña incorrecta, se obtuvo: ${wrongRevertRes.status}`);
    }
    console.log('✅ Reversión rechazada correctamente (401) con contraseña inválida');

    // Reversión con contraseña correcta
    const validRevertRes = await fetch(`${baseUrl}/commissions/payouts/${createdPayout.id}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        admin_password: 'admin123',
        reason: 'Ajuste solicitado por tesorería',
      }),
    });
    const revertResult = (await validRevertRes.json()) as any;
    if (!revertResult.success) throw new Error(`Fallo al revertir pago: ${revertResult.message}`);
    console.log(`✅ Pago revertido exitosamente: ${revertResult.data.commissions_restored} comisiones devueltas a pendientes`);

    // Verificar que el pago figura como 'cancelled' en historial
    const payoutsListRes = await fetch(`${baseUrl}/commissions/payouts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const payoutsList = (await payoutsListRes.json()) as any;
    const revertedRecord = payoutsList.data.find((p: any) => p.id === createdPayout.id);
    if (!revertedRecord || revertedRecord.status !== 'cancelled') {
      throw new Error('El pago en historial debería tener estado "cancelled"');
    }
    console.log(`✅ Registro histórico conservado con trazabilidad: estado="${revertedRecord.status}", notas="${revertedRecord.notes}"`);

    // Verificar que los servicios regresaron a "Por pagar"
    const pendingAfterRevertRes = await fetch(`${baseUrl}/commissions/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingAfterRevert = (await pendingAfterRevertRes.json()) as any;
    const restoredStylist = pendingAfterRevert.data.find((s: any) => s.stylist_id === stylistValeria.id);
    if (!restoredStylist || restoredStylist.pending_services_count === 0) {
      throw new Error('Los servicios no regresaron a la lista de pendientes');
    }
    console.log(`✅ Servicios restaurados automáticamente en "Por pagar": ${restoredStylist.pending_services_count} servicios, saldo ₲ ${restoredStylist.total_pending_amount.toLocaleString('es-PY')}`);

    // Verificar auditoría de reversión
    const db = getDb();
    const revertAudit = db.prepare("SELECT * FROM audit_logs WHERE action = 'revert_payout' AND target_id = ?").get(createdPayout.id) as any;
    if (!revertAudit) throw new Error('No se generó registro de auditoría para la reversión del pago');
    console.log(`✅ Bitácora de auditoría generada para la reversión: id=${revertAudit.id}, usuario=${revertAudit.user_name}`);

    // -------------------------------------------------------------------------
    // 6. Eliminar un Servicio Pendiente Individual (Sección 3.2)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Excluir un Servicio Pendiente Individual (Sección 3.2) ---');
    const serviceToExclude = restoredStylist.services[0];

    // Intento con contraseña incorrecta
    const wrongDeleteRes = await fetch(`${baseUrl}/commissions/pending/${serviceToExclude.commission_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ admin_password: 'clave_erronea' }),
    });
    if (wrongDeleteRes.status !== 401) {
      throw new Error(`Se esperaba 401 para exclusión con contraseña inválida, se obtuvo: ${wrongDeleteRes.status}`);
    }
    console.log('✅ Exclusión individual rechazada correctamente (401) con contraseña inválida');

    // Exclusión con contraseña correcta
    const validDeleteRes = await fetch(`${baseUrl}/commissions/pending/${serviceToExclude.commission_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        admin_password: 'admin123',
        reason: 'Servicio asignado por error al estilista',
      }),
    });
    const deleteResult = (await validDeleteRes.json()) as any;
    if (!deleteResult.success) throw new Error(`Fallo al excluir servicio: ${deleteResult.message}`);
    console.log(`✅ Servicio excluido exitosamente de la liquidación del estilista`);

    // Verificar que la venta original no fue afectada
    const originalSaleCheck = db.prepare('SELECT id, status, total FROM sales WHERE id = ?').get(serviceToExclude.sale_id) as any;
    if (!originalSaleCheck || originalSaleCheck.status !== 'completed') {
      throw new Error('La venta original fue indebidamente modificada');
    }
    console.log(`✅ Venta original #${serviceToExclude.invoice_number} permanece INTACTA y completada (Total: ₲ ${originalSaleCheck.total.toLocaleString('es-PY')})`);

    // Verificar auditoría de exclusión individual
    const singleDeleteAudit = db.prepare("SELECT * FROM audit_logs WHERE action = 'delete_pending_commission' AND target_id = ?").get(serviceToExclude.commission_id) as any;
    if (!singleDeleteAudit) throw new Error('No se generó registro de auditoría para exclusión individual');
    console.log(`✅ Auditoría registrada para exclusión individual: id=${singleDeleteAudit.id}`);

    // -------------------------------------------------------------------------
    // 7. Eliminar Todos los Pendientes de un Estilista (Sección 3.3)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Eliminar Todos los Pendientes de un Estilista (Sección 3.3) ---');
    // Crear 2 nuevas ventas para tener varios servicios pendientes
    await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customer_name: 'Cliente Masivo 1',
        payment_method: 'cash',
        amount_tendered: 240000,
        items: [
          {
            item_type: 'service',
            item_id: botox.id,
            item_name: `${botox.name} (Cabello Largo)`,
            quantity: 1,
            unit_price: 240000,
            stylist_id: stylistValeria.id,
          },
        ],
      }),
    });

    await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customer_name: 'Cliente Masivo 2',
        payment_method: 'cash',
        amount_tendered: 180000,
        items: [
          {
            item_type: 'service',
            item_id: botox.id,
            item_name: `${botox.name} (Hasta Hombros)`,
            quantity: 1,
            unit_price: 180000,
            stylist_id: stylistValeria.id,
          },
        ],
      }),
    });

    // Consultar estado antes de eliminación masiva
    const pendingBulkCheckRes = await fetch(`${baseUrl}/commissions/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingBulkCheck = (await pendingBulkCheckRes.json()) as any;
    const bulkStylist = pendingBulkCheck.data.find((s: any) => s.stylist_id === stylistValeria.id);
    if (!bulkStylist || bulkStylist.pending_services_count === 0) {
      throw new Error('El estilista debería tener servicios pendientes acumulados');
    }
    console.log(`Estado antes de eliminación masiva: ${bulkStylist.pending_services_count} servicios pendientes, saldo: ₲ ${bulkStylist.total_pending_amount.toLocaleString('es-PY')}`);

    // Intento con contraseña incorrecta
    const wrongBulkRes = await fetch(`${baseUrl}/commissions/stylists/${stylistValeria.id}/pending`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ admin_password: 'incorrecta' }),
    });
    if (wrongBulkRes.status !== 401) {
      throw new Error(`Se esperaba 401 para eliminación masiva con clave inválida, se obtuvo: ${wrongBulkRes.status}`);
    }
    console.log('✅ Eliminación masiva rechazada correctamente (401) con contraseña inválida');

    // Eliminación masiva con contraseña correcta
    const validBulkRes = await fetch(`${baseUrl}/commissions/stylists/${stylistValeria.id}/pending`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        admin_password: 'admin123',
        reason: 'Liquidación manual extraordinaria autorizada',
      }),
    });
    const bulkResult = (await validBulkRes.json()) as any;
    if (!bulkResult.success) throw new Error(`Fallo al eliminar masivamente: ${bulkResult.message}`);
    console.log(`✅ Eliminación masiva atómica completada: ${bulkResult.data.deleted_count} comisiones eliminadas por un total de ₲ ${bulkResult.data.total_amount.toLocaleString('es-PY')}`);

    // Verificar que el saldo acumulado pasó a 0
    const pendingAfterBulkRes = await fetch(`${baseUrl}/commissions/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingAfterBulk = (await pendingAfterBulkRes.json()) as any;
    const bulkStylistAfter = pendingAfterBulk.data.find((s: any) => s.stylist_id === stylistValeria.id);
    if (bulkStylistAfter && bulkStylistAfter.pending_services_count > 0) {
      throw new Error('El estilista no debería tener ningún servicio pendiente tras la eliminación masiva');
    }
    console.log('✅ Saldo acumulado del estilista pasó a ₲ 0 (lista de pendientes limpia)');

    // Verificar auditoría de eliminación masiva
    const bulkAudit = db.prepare("SELECT * FROM audit_logs WHERE action = 'delete_all_pending_commissions' AND target_id = ?").get(stylistValeria.id) as any;
    if (!bulkAudit) throw new Error('No se generó registro de auditoría para eliminación masiva');
    console.log(`✅ Bitácora de auditoría generada para eliminación masiva: id=${bulkAudit.id}, detalles=${bulkAudit.details}`);

    console.log('\n=========================================================================');
    console.log('🎉 TODOS LOS ESCENARIOS E2E PASARON SATISFACTORIAMENTE (100% SUCCESS)');
    console.log('=========================================================================\n');
  } finally {
    server.close();
  }
}

runE2ETests().catch((err) => {
  console.error('❌ Error en pruebas E2E:', err);
  process.exit(1);
});
