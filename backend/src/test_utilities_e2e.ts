/**
 * Prueba E2E del módulo Utilidad (estilista auxiliar).
 *
 * Uso (SQLite temporal, no toca ninguna base real):
 *   cd backend
 *   DATABASE_PATH=./data/test_utilidad.db ADMIN_INITIAL_PASSWORD=Admin12345 \
 *   JWT_SECRET=una_clave_de_pruebas_de_al_menos_32_caracteres_ok npx tsx src/test_utilities_e2e.ts
 *
 * Nota: el esquema SQLite local (schema.sql) no tiene la columna users.username que el código
 * de autenticación usa en producción (MySQL). Esta prueba crea la base temporal con esa columna
 * para poder autenticarse; no modifica schema.sql.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/test_utilidad.db');
for (const ext of ['', '-wal', '-shm']) fs.rmSync(dbPath + ext, { force: true });
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Base temporal = schema.sql actual + columna username en users
{
  const { DatabaseSync } = nodeRequire('node:sqlite');
  const schemaFile = ['src/db/schema.sql', 'backend/src/db/schema.sql']
    .map((p) => path.resolve(process.cwd(), p))
    .find((p) => fs.existsSync(p))!;
  const schema = fs
    .readFileSync(schemaFile, 'utf8')
    .replace('email TEXT UNIQUE NOT NULL,', 'username TEXT UNIQUE,\n    email TEXT UNIQUE NOT NULL,');
  const raw = new DatabaseSync(dbPath);
  raw.exec(schema);
  raw.close();
}

const { initDatabase, getDb } = await import('./db/database.js');
const { default: app } = await import('./app.js');

initDatabase();

const server = app.listen(0);
const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}/api/v1`;
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'Admin12345';

let failures = 0;
let passes = 0;

function check(name: string, condition: unknown, extra?: unknown) {
  if (condition) {
    passes++;
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

let token = '';
async function call(method: string, url: string, body?: any, tk = token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json, data: json.data };
}

const section = (t: string) => console.log(`\n=== ${t} ===`);

try {
  /* ------------------------------ Preparación ------------------------------ */
  section('0. Preparación (login, estilistas, servicios, caja)');
  const login = await call('POST', '/auth/login', { username: 'admin', password: ADMIN_PASSWORD }, '');
  token = login.data?.token;
  check('Login de administrador', Boolean(token), login.json);

  const mkStylist = async (name: string) => (await call('POST', '/stylists', { full_name: name, commission_rate: 40 })).data;
  const A = await mkStylist('Estilista A (principal)');
  const B = await mkStylist('Estilista B (auxiliar)');
  const C = await mkStylist('Estilista C (sin habilitar)');
  const D = await mkStylist('Estilista D (a eliminar)');
  check('4 estilistas creadas', A?.id && B?.id && C?.id && D?.id);

  const mkService = async (name: string, price: number) =>
    (await call('POST', '/inventory/services', { name, price, duration_minutes: 30 })).data;
  const corte = await mkService('Corte', 50000);
  const color = await mkService('Coloración', 100000);
  const trat = await mkService('Tratamiento capilar', 80000);
  const peinado = await mkService('Peinado', 30000);
  check('4 servicios creados', corte?.id && color?.id && trat?.id && peinado?.id);

  const open = await call('POST', '/cash-registers/open', { initial_amount: 0 });
  check('Caja abierta', open.ok, open.json);

  const sell = (stylist: string, svc: any, helper?: string | null, extra: Record<string, any> = {}) =>
    call('POST', '/sales', {
      payment_method: 'card',
      items: [
        {
          item_type: 'service',
          item_id: svc.id,
          item_name: svc.name,
          quantity: 1,
          unit_price: Number(svc.price),
          stylist_id: stylist,
          ...(helper ? { helper_stylist_id: helper } : {}),
          ...extra,
        },
      ],
    });

  const utilitiesOf = async (saleId: string) =>
    (await getDb().prepare('SELECT * FROM utilities WHERE sale_id = ?').all(saleId)) as any[];
  const commissionsOf = async (saleId: string) =>
    (await getDb().prepare('SELECT * FROM commissions WHERE sale_id = ?').all(saleId)) as any[];

  /* ------------------------------ Configuración ---------------------------- */
  section('Configuración de utilidad');
  const noPass = await call('PUT', '/utilities/general', { amount: 10000, enabled: true });
  check('Monto general sin contraseña de admin → 400', noPass.status === 400, noPass.json);
  const badPass = await call('PUT', '/utilities/general', { amount: 10000, enabled: true, admin_password: 'incorrecta' });
  check('Monto general con contraseña incorrecta → 401', badPass.status === 401, badPass.json);

  for (const bad of [-5, 'abc', '', null, Infinity]) {
    const r = await call('PUT', '/utilities/general', { amount: bad, admin_password: ADMIN_PASSWORD });
    check(`Monto general inválido (${JSON.stringify(bad)}) → 400`, r.status === 400, r.json);
  }

  const setGeneral = await call('PUT', '/utilities/general', { amount: 10000, enabled: true, admin_password: ADMIN_PASSWORD });
  check('Monto general = 10.000 guardado', setGeneral.ok && setGeneral.data.amount === 10000 && setGeneral.data.enabled === true, setGeneral.json);

  const negService = await call('PUT', `/utilities/services/${color.id}`, { amount: -1 });
  check('Monto específico negativo → 400', negService.status === 400, negService.json);
  const zeroService = await call('PUT', `/utilities/services/${color.id}`, { amount: 0 });
  check('Monto específico 0 habilitado → 400', zeroService.status === 400, zeroService.json);

  const setColor = await call('PUT', `/utilities/services/${color.id}`, { amount: 20000 });
  check('Coloración = 20.000 (específico)', setColor.ok, setColor.json);
  const setTrat = await call('PUT', `/utilities/services/${trat.id}`, { amount: 15000, is_enabled: false });
  check('Tratamiento marcado "sin utilidad"', setTrat.ok && setTrat.data.is_enabled === false, setTrat.json);

  const enableB = await call('PUT', `/utilities/stylists/${B.id}`, { enabled: true });
  check('Estilista B habilitada', enableB.ok, enableB.json);

  const cfg = await call('GET', '/utilities/config');
  const cfgColor = cfg.data?.services?.find((s: any) => s.id === color.id);
  const cfgCorte = cfg.data?.services?.find((s: any) => s.id === corte.id);
  const cfgTrat = cfg.data?.services?.find((s: any) => s.id === trat.id);
  check('Config: Coloración modo custom 20.000', cfgColor?.mode === 'custom' && cfgColor?.effective_amount === 20000, cfgColor);
  check('Config: Corte usa general 10.000', cfgCorte?.mode === 'general' && cfgCorte?.effective_amount === 10000, cfgCorte);
  check('Config: Tratamiento no elegible', cfgTrat?.mode === 'disabled' && cfgTrat?.eligible === false, cfgTrat);

  const posCfg = await call('GET', '/utilities/pos-config');
  check('POS config: solo B como auxiliar elegible', posCfg.data?.helpers?.length === 1 && posCfg.data.helpers[0].id === B.id, posCfg.json);
  check('POS config: Tratamiento no admite utilidad', posCfg.data?.services?.[trat.id]?.eligible === false);

  /* ------------------------------ Caso 1 ----------------------------------- */
  section('Caso 1: servicio SIN auxiliar funciona como antes');
  const s1 = await sell(A.id, corte);
  check('Venta creada', s1.ok, s1.json);
  const s1c = await commissionsOf(s1.data.id);
  check('Comisión de A = 20.000 (40% de 50.000, regla actual)', s1c.length === 1 && Number(s1c[0].amount) === 20000, s1c);
  check('Sin utilidades generadas', (await utilitiesOf(s1.data.id)).length === 0);

  /* ------------------------------ Caso 2 ----------------------------------- */
  section('Caso 2: servicio CON auxiliar genera la utilidad correcta');
  const s2 = await sell(A.id, color, B.id);
  check('Venta con auxiliar creada', s2.ok, s2.json);
  const s2u = await utilitiesOf(s2.data.id);
  const s2c = await commissionsOf(s2.data.id);
  check('1 utilidad de 20.000 para B', s2u.length === 1 && Number(s2u[0].amount) === 20000 && s2u[0].helper_stylist_id === B.id, s2u);
  check('Origen = configuración del servicio', s2u[0]?.source === 'service');
  check('Principal = A y estado pendiente', s2u[0]?.main_stylist_id === A.id && s2u[0]?.status === 'pending');
  check('Comisión de A intacta (40% de 100.000 = 40.000)', s2c.length === 1 && s2c[0].stylist_id === A.id && Number(s2c[0].amount) === 40000, s2c);
  check('B NO recibe comisión por ayudar', s2c.every((c) => c.stylist_id !== B.id));
  check('Respuesta de la venta informa auxiliar y monto', s2.data.items?.[0]?.helper_stylist_name === B.full_name && s2.data.items?.[0]?.utility_amount === 20000, s2.data.items?.[0]);

  const detail = await call('GET', `/sales/${s2.data.id}`);
  check('Detalle de venta muestra auxiliar y utilidad', detail.data?.items?.[0]?.helper_stylist_id === B.id && detail.data?.items?.[0]?.utility_amount === 20000, detail.data?.items?.[0]);

  /* ------------------------------ Caso 3 ----------------------------------- */
  section('Caso 3: la configuración específica prevalece sobre la general (no se suman)');
  const s3a = await sell(A.id, corte, B.id);
  const s3aU = await utilitiesOf(s3a.data.id);
  check('Corte sin config específica → general 10.000', Number(s3aU[0]?.amount) === 10000 && s3aU[0]?.source === 'general', s3aU);
  await call('PUT', `/utilities/services/${corte.id}`, { amount: 12000 });
  const s3b = await sell(A.id, corte, B.id);
  const s3bU = await utilitiesOf(s3b.data.id);
  check('Corte con específico 12.000 → 12.000 (no 22.000)', Number(s3bU[0]?.amount) === 12000 && s3bU[0]?.source === 'service', s3bU);

  /* ------------------------------ Caso 4 ----------------------------------- */
  section('Caso 4: cambiar el monto general no altera las utilidades históricas');
  await call('PUT', '/utilities/general', { amount: 7000, admin_password: ADMIN_PASSWORD });
  const s4 = await sell(A.id, peinado, B.id);
  const s4U = await utilitiesOf(s4.data.id);
  check('Venta nueva (Peinado) usa el nuevo general 7.000', Number(s4U[0]?.amount) === 7000, s4U);
  const histA = await utilitiesOf(s3a.data.id);
  check('Utilidad histórica anterior sigue en 10.000', Number(histA[0]?.amount) === 10000, histA);

  // El interruptor general apagado: el servicio sin config específica ya no genera; el específico sí.
  await call('PUT', '/utilities/general', { enabled: false, admin_password: ADMIN_PASSWORD });
  const offGeneral = await sell(A.id, peinado, B.id);
  check('General desactivado → servicio sin config específica rechaza auxiliar (400)', offGeneral.status === 400, offGeneral.json);
  const offSpecific = await sell(A.id, color, B.id);
  check('General desactivado → servicio con config específica sigue generando 20.000', offSpecific.ok && (await utilitiesOf(offSpecific.data.id))[0]?.amount === 20000, offSpecific.json);
  await call('PUT', '/utilities/general', { enabled: true, admin_password: ADMIN_PASSWORD });

  /* ------------------------------ Caso 5 ----------------------------------- */
  section('Caso 5: validaciones del servidor');
  const rC = await sell(A.id, color, C.id);
  check('Auxiliar C (no habilitada) → 400', rC.status === 400, rC.json);
  const rSame = await sell(A.id, color, A.id);
  check('Principal = auxiliar → 400', rSame.status === 400, rSame.json);
  const rTrat = await sell(A.id, trat, B.id);
  check('Servicio sin utilidad + auxiliar → 400', rTrat.status === 400, rTrat.json);
  const rGhost = await sell(A.id, color, 'sty-inexistente');
  check('Auxiliar inexistente → 400', rGhost.status === 400, rGhost.json);
  const rProd = await call('POST', '/sales', {
    payment_method: 'card',
    items: [{ item_type: 'product', item_id: 'prd-x', item_name: 'Shampoo', quantity: 1, unit_price: 1000, helper_stylist_id: B.id }],
  });
  check('Producto con auxiliar → 400', rProd.status === 400, rProd.json);
  const rClient = await sell(A.id, color, B.id, { utility_amount: 999999, helper_amount: 999999 });
  const rClientU = await utilitiesOf(rClient.data.id);
  check('Monto enviado por el cliente se ignora (queda 20.000)', Number(rClientU[0]?.amount) === 20000, rClientU);

  const salesBefore = ((await getDb().prepare('SELECT COUNT(*) as n FROM sales').get()) as any).n;
  await sell(A.id, color, C.id);
  const salesAfter = ((await getDb().prepare('SELECT COUNT(*) as n FROM sales').get()) as any).n;
  check('Venta rechazada no deja registros (rollback)', Number(salesBefore) === Number(salesAfter));

  // Cantidad 2 → utilidad por 2 unidades
  const rQty = await call('POST', '/sales', {
    payment_method: 'card',
    items: [{ item_type: 'service', item_id: color.id, item_name: color.name, quantity: 2, unit_price: 100000, stylist_id: A.id, helper_stylist_id: B.id }],
  });
  const rQtyU = await utilitiesOf(rQty.data.id);
  check('Cantidad 2 → utilidad 40.000 (20.000 x 2)', Number(rQtyU[0]?.amount) === 40000 && Number(rQtyU[0]?.unit_amount) === 20000, rQtyU);

  /* ------------------- Caso 5b: deshabilitar a una estilista ---------------- */
  section('Caso 5b: deshabilitar a B la saca de la lista y no puede ser auxiliar');
  await call('PUT', `/utilities/stylists/${B.id}`, { enabled: false });
  const posOff = await call('GET', '/utilities/pos-config');
  check('POS config: sin auxiliares elegibles', posOff.data?.helpers?.length === 0, posOff.json);
  const rOff = await sell(A.id, color, B.id);
  check('B deshabilitada como auxiliar → 400', rOff.status === 400, rOff.json);
  await call('PUT', `/utilities/stylists/${B.id}`, { enabled: true });

  /* ------------------------------ Caso 6 ----------------------------------- */
  section('Caso 6: la liquidación incluye utilidades pendientes (separadas de comisiones)');
  const expectedPendingB = (await getDb()
    .prepare("SELECT COALESCE(SUM(amount),0) as t, COUNT(*) as n FROM utilities WHERE helper_stylist_id = ? AND status = 'pending'")
    .get(B.id)) as any;
  const pend = await call('GET', '/commissions/pending');
  const pendB = pend.data.find((x: any) => x.stylist_id === B.id);
  const pendA = pend.data.find((x: any) => x.stylist_id === A.id);
  check('B aparece en "por pagar" solo con utilidades', Boolean(pendB) && pendB.pending_services_count === 0 && pendB.pending_utilities_count === Number(expectedPendingB.n), pendB);
  check('B: total a pagar = utilidades pendientes', pendB?.total_pending_amount === Number(expectedPendingB.t) && pendB?.total_pending_utilities === Number(expectedPendingB.t) && pendB?.total_pending_commissions === 0, pendB);
  check('B: detalle de utilidades incluye principal y ticket', pendB?.utilities?.[0]?.main_stylist_name === A.full_name && Boolean(pendB?.utilities?.[0]?.invoice_number), pendB?.utilities?.[0]);
  check('A: sin utilidades, total = comisiones', pendA?.pending_utilities_count === 0 && pendA?.total_pending_amount === pendA?.total_pending_commissions, pendA);

  /* ------------------------------ Caso 7 ----------------------------------- */
  section('Caso 7: pagar la liquidación; las utilidades no se cobran dos veces');
  const payB = await call('POST', '/commissions/payouts', { stylist_id: B.id, notes: 'Pago utilidades' });
  check('Pago a B registrado', payB.ok, payB.json);
  check('Total pagado = utilidades pendientes', payB.data?.total_amount === Number(expectedPendingB.t) && payB.data?.utilities_total === Number(expectedPendingB.t) && payB.data?.commissions_total === 0, payB.data);
  check('Cantidad de utilidades en el pago', payB.data?.utilities_count === Number(expectedPendingB.n) && payB.data?.utilities?.length === Number(expectedPendingB.n));
  const paidRows = (await getDb().prepare("SELECT status, payout_id FROM utilities WHERE helper_stylist_id = ? AND status <> 'cancelled'").all(B.id)) as any[];
  check('Todas las utilidades de B quedaron pagadas y ligadas al pago', paidRows.length > 0 && paidRows.every((r) => r.status === 'paid' && r.payout_id === payB.data.id), paidRows);

  const payBAgain = await call('POST', '/commissions/payouts', { stylist_id: B.id });
  check('Segundo pago a B → 400 (nada pendiente, no se cobra dos veces)', payBAgain.status === 400, payBAgain.json);
  const pend2 = await call('GET', '/commissions/pending');
  check('B ya no aparece en pendientes', !pend2.data.some((x: any) => x.stylist_id === B.id));

  const payouts = await call('GET', `/commissions/payouts?stylist_id=${B.id}`);
  check('Historial muestra utilidades por separado', payouts.data?.[0]?.utilities_total === Number(expectedPendingB.t) && payouts.data?.[0]?.utilities?.length === Number(expectedPendingB.n), payouts.data?.[0]);
  const payoutDetail = await call('GET', `/commissions/payouts/${payB.data.id}`);
  check('Detalle del pago incluye utilidades', payoutDetail.data?.utilities?.length === Number(expectedPendingB.n) && payoutDetail.data?.utilities_total === Number(expectedPendingB.t));

  // Nuevas utilidades posteriores sí entran en la siguiente liquidación (y las pagadas no)
  const s7 = await sell(A.id, color, B.id);
  const payB2 = await call('POST', '/commissions/payouts', { stylist_id: B.id });
  check('Siguiente liquidación = solo la utilidad nueva (20.000)', payB2.ok && payB2.data.total_amount === 20000 && payB2.data.utilities_count === 1, payB2.json);

  /* --------------------------- Comisiones intactas -------------------------- */
  section('Caso 9: comisiones y márgenes siguen igual');
  const payA = await call('POST', '/commissions/payouts', { stylist_id: A.id });
  const expectedA = (await getDb().prepare("SELECT COALESCE(SUM(amount),0) as t, COUNT(*) as n FROM commissions WHERE stylist_id = ?").get(A.id)) as any;
  check('Pago a A = suma de sus comisiones habituales', payA.ok && payA.data.total_amount === Number(expectedA.t) && payA.data.commissions_total === Number(expectedA.t) && payA.data.utilities_total === 0, payA.json);
  check('services_count = servicios con comisión', payA.data.services_count === Number(expectedA.n));
  const margins = await call('GET', '/settings/services-margins');
  check('Pantalla de márgenes sigue respondiendo', margins.ok && margins.data.length >= 4, margins.json);
  const reportsOk = await call('GET', '/reports/dashboard');
  check('Reportes siguen respondiendo', reportsOk.status < 500, reportsOk.json);

  /* ------------------------------ Caso 8 ----------------------------------- */
  section('Caso 8: anulación de ventas / utilidades');
  // 8a. utilidad pendiente → se cancela con la venta
  const s8a = await sell(A.id, color, B.id);
  const cancelA = await call('DELETE', `/sales/${s8a.data.id}`, { admin_password: ADMIN_PASSWORD, reason: 'prueba' });
  check('Anular venta con utilidad pendiente → OK', cancelA.ok, cancelA.json);
  const s8aU = await utilitiesOf(s8a.data.id);
  check('Utilidad pasó a "cancelada"', s8aU[0]?.status === 'cancelled' && Boolean(s8aU[0]?.cancelled_at), s8aU);
  const pend3 = await call('GET', '/commissions/pending');
  check('Utilidad cancelada no aparece en pendientes', !pend3.data.some((x: any) => x.utilities?.some((u: any) => u.sale_id === s8a.data.id)));
  const payB3 = await call('POST', '/commissions/payouts', { stylist_id: B.id });
  check('Y no se puede pagar (nada pendiente) → 400', payB3.status === 400, payB3.json);

  // 8b. utilidad ya liquidada → no se puede anular la venta
  const s8b = await sell(A.id, color, B.id);
  const payB4 = await call('POST', '/commissions/payouts', { stylist_id: B.id });
  check('Pago de la utilidad de s8b', payB4.ok, payB4.json);
  const cancelB = await call('DELETE', `/sales/${s8b.data.id}`, { admin_password: ADMIN_PASSWORD, reason: 'prueba' });
  check('Anular venta con utilidad YA liquidada → 400', cancelB.status === 400 && /liquidad/i.test(cancelB.json.message), cancelB.json);
  const s8bSale = (await getDb().prepare('SELECT status FROM sales WHERE id = ?').get(s8b.data.id)) as any;
  check('La venta sigue "completada" (nada se modificó)', s8bSale.status === 'completed');
  const s8bU = await utilitiesOf(s8b.data.id);
  check('La utilidad sigue "pagada"', s8bU[0]?.status === 'paid');

  // 8c. revertir el pago → utilidad vuelve a pendiente, luego sí se puede anular y se cancela
  const revert = await call('POST', `/commissions/payouts/${payB4.data.id}/revert`, { admin_password: ADMIN_PASSWORD, reason: 'prueba' });
  check('Revertir pago OK', revert.ok && revert.data?.utilities_restored === 1, revert.json);
  const s8bU2 = await utilitiesOf(s8b.data.id);
  check('Utilidad volvió a pendiente sin pago asociado', s8bU2[0]?.status === 'pending' && s8bU2[0]?.payout_id === null, s8bU2);
  const payoutAfterRevert = await call('GET', `/commissions/payouts/${payB4.data.id}`);
  check('El pago revertido conserva su detalle histórico (snapshot)', payoutAfterRevert.data?.status === 'cancelled' && payoutAfterRevert.data?.utilities?.length === 1, payoutAfterRevert.data);
  const cancelB2 = await call('DELETE', `/sales/${s8b.data.id}`, { admin_password: ADMIN_PASSWORD, reason: 'prueba' });
  check('Ahora la venta sí se puede anular', cancelB2.ok, cancelB2.json);
  check('Y su utilidad queda cancelada', (await utilitiesOf(s8b.data.id))[0]?.status === 'cancelled');

  // 8d. cancelar una utilidad pendiente puntual (acción de admin con auditoría)
  const s8d = await sell(A.id, color, B.id);
  const u8d = (await utilitiesOf(s8d.data.id))[0];
  const noPw = await call('DELETE', `/commissions/utilities/${u8d.id}`, { reason: 'x' });
  check('Cancelar utilidad sin contraseña → 400', noPw.status === 400, noPw.json);
  const badPw = await call('DELETE', `/commissions/utilities/${u8d.id}`, { admin_password: 'mal', reason: 'x' });
  check('Cancelar utilidad con contraseña incorrecta → 401', badPw.status === 401, badPw.json);
  const cancelU = await call('DELETE', `/commissions/utilities/${u8d.id}`, { admin_password: ADMIN_PASSWORD, reason: 'error de carga' });
  check('Cancelar utilidad pendiente OK', cancelU.ok, cancelU.json);
  const cancelU2 = await call('DELETE', `/commissions/utilities/${u8d.id}`, { admin_password: ADMIN_PASSWORD });
  check('Cancelarla de nuevo → 400', cancelU2.status === 400, cancelU2.json);
  const audit = (await getDb().prepare("SELECT COUNT(*) as n FROM audit_logs WHERE action = 'cancel_pending_utility' AND target_id = ?").get(u8d.id)) as any;
  check('Quedó registro de auditoría', Number(audit.n) === 1);
  check('La venta y la comisión de A no se tocaron', ((await getDb().prepare('SELECT status FROM sales WHERE id = ?').get(s8d.data.id)) as any).status === 'completed' && (await commissionsOf(s8d.data.id)).length === 1);

  /* ---------------------- Comisión + utilidad en un mismo pago --------------- */
  section('Extra: estilista con comisiones Y utilidades en una sola liquidación');
  await sell(B.id, corte); // B principal → comisión 20.000
  await sell(A.id, color, B.id); // B auxiliar → utilidad 20.000
  const pendMix = (await call('GET', '/commissions/pending')).data.find((x: any) => x.stylist_id === B.id);
  check('Pendiente de B: 1 servicio + 1 utilidad', pendMix?.pending_services_count === 1 && pendMix?.pending_utilities_count === 1, pendMix);
  check('Total = 20.000 comisión + 20.000 utilidad = 40.000', pendMix?.total_pending_amount === 40000 && pendMix?.total_pending_commissions === 20000 && pendMix?.total_pending_utilities === 20000, pendMix);
  const payMix = await call('POST', '/commissions/payouts', { stylist_id: B.id });
  check('Pago mixto: total 40.000 (20.000 + 20.000 por separado)', payMix.ok && payMix.data.total_amount === 40000 && payMix.data.commissions_total === 20000 && payMix.data.utilities_total === 20000, payMix.json);
  const summaryAfter = await call('GET', '/commissions/summary');
  check('Resumen legacy sigue funcionando y suma utilidades aparte', summaryAfter.ok && typeof summaryAfter.data.utilitiesPaidTotal === 'number', summaryAfter.json);

  /* ------------------------------ Concurrencia ------------------------------ */
  section('Extra: dos pagos simultáneos no duplican la utilidad');
  await sell(A.id, color, B.id);
  const [p1, p2] = await Promise.all([
    call('POST', '/commissions/payouts', { stylist_id: B.id }),
    call('POST', '/commissions/payouts', { stylist_id: B.id }),
  ]);
  const okCount = [p1, p2].filter((r) => r.ok).length;
  check('Exactamente un pago prospera', okCount === 1, [p1.json, p2.json]);
  const payoutsForB = (await getDb().prepare("SELECT COUNT(*) as n FROM stylist_payout_utility_items i JOIN stylist_payouts p ON i.payout_id = p.id WHERE p.stylist_id = ? AND p.status = 'completed'").get(B.id)) as any;
  const paidUtilB = (await getDb().prepare("SELECT COUNT(*) as n FROM utilities WHERE helper_stylist_id = ? AND status = 'paid'").get(B.id)) as any;
  check('Cada utilidad pagada aparece exactamente una vez en pagos vigentes', Number(payoutsForB.n) === Number(paidUtilB.n), { payoutsForB, paidUtilB });

  /* ------------------ Eliminar estilista con utilidades pendientes ----------- */
  section('Extra: eliminar una auxiliar cancela sus utilidades pendientes');
  await call('PUT', `/utilities/stylists/${D.id}`, { enabled: true });
  const sD = await sell(A.id, color, D.id);
  check('Venta con auxiliar D', sD.ok, sD.json);
  const del = await call('DELETE', `/stylists/${D.id}`, { reason: 'prueba', password: ADMIN_PASSWORD });
  check('Estilista D eliminada', del.ok, del.json);
  check('Su utilidad pendiente quedó cancelada', (await utilitiesOf(sD.data.id))[0]?.status === 'cancelled');
  const rD = await sell(A.id, color, D.id);
  check('D eliminada ya no puede ser auxiliar → 400', rD.status === 400, rD.json);

  /* ------------------------------ Listados ----------------------------------- */
  section('Extra: listados y resumen de utilidades');
  const listPaid = await call('GET', '/utilities?status=paid');
  const listPending = await call('GET', '/utilities?status=pending');
  const listBad = await call('GET', '/utilities?status=hack');
  check('Listado por estado', listPaid.ok && listPaid.data.every((u: any) => u.status === 'paid') && listPending.ok, listPaid.json);
  check('Estado inválido → 400', listBad.status === 400, listBad.json);
  const sum = await call('GET', '/utilities/summary');
  const dbSum = (await getDb().prepare("SELECT COALESCE(SUM(amount),0) as t FROM utilities WHERE status = 'paid'").get()) as any;
  check('Resumen coincide con la base (pagadas)', sum.ok && sum.data.paid_total === Number(dbSum.t), sum.json);

  // Permisos: un cajero (sin "margins") no accede a configuración pero sí al pos-config
  const cashierLogin = await call('POST', '/auth/login', { username: 'caja', password: process.env.CASHIER_INITIAL_PASSWORD || '' }, '');
  if (cashierLogin.data?.token) {
    const ct = cashierLogin.data.token;
    check('Cajero: /utilities/config → 403', (await call('GET', '/utilities/config', undefined, ct)).status === 403);
    check('Cajero: /utilities/pos-config → 200', (await call('GET', '/utilities/pos-config', undefined, ct)).status === 200);
    check('Cajero: PUT /utilities/general → 403', (await call('PUT', '/utilities/general', { amount: 1, admin_password: ADMIN_PASSWORD }, ct)).status === 403);
  } else {
    console.log('  ⚠️  (cajero omitido: defina CASHIER_INITIAL_PASSWORD para probar permisos)');
  }
  const noAuth = await call('GET', '/utilities/config', undefined, '');
  check('Sin token → 401', noAuth.status === 401);
} catch (error) {
  failures++;
  console.error('\n💥 La prueba terminó con una excepción:', error);
} finally {
  server.close();
  console.log(`\n==================== RESULTADO ====================`);
  console.log(`Aprobadas: ${passes}   Fallidas: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}
