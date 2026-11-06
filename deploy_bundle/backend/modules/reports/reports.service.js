import { getDb } from '../../db/database.js';
// MySQL devuelve SUM() como DECIMAL (string en mysql2). Normalizamos a número.
const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
export class ReportsService {
    static async getDashboardMetrics(period = 'day') {
        const db = getDb();
        // Filtro temporal por período: 'day' | 'week' | 'month' | 'year' | 'all'
        // (database.ts traduce datetime()/date() de SQLite a MySQL)
        let salesDateCondition = '';
        if (period === 'day') {
            salesDateCondition = " AND DATE(s.created_at) = DATE('now', 'localtime')";
        }
        else if (period === 'week') {
            salesDateCondition = " AND s.created_at >= datetime('now', '-7 days', 'localtime')";
        }
        else if (period === 'month') {
            salesDateCondition = " AND s.created_at >= datetime('now', 'start of month', 'localtime')";
        }
        else if (period === 'year') {
            salesDateCondition = " AND s.created_at >= datetime('now', 'start of year', 'localtime')";
        }
        // 1. Ingresos y cantidad de ventas completadas en el período
        const salesStats = ((await db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as sales_count
      FROM sales s
      WHERE s.status = 'completed' ${salesDateCondition}
    `).get()) || { total_revenue: 0, sales_count: 0 });
        const totalRevenue = num(salesStats.total_revenue);
        const totalSalesCount = num(salesStats.sales_count);
        const averageTicket = totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0;
        // 2. Efectivo en todas las cajas abiertas (una por usuario)
        const openRegs = (await db.prepare(`
      SELECT COALESCE(SUM(expected_amount), 0) AS total
      FROM cash_registers
      WHERE status = 'open'
    `).get());
        const currentCashInRegister = openRegs ? num(openRegs.total) : 0;
        // 3. Productos con stock bajo
        const lowStockProducts = (await db.prepare(`
      SELECT *
      FROM products
      WHERE stock <= min_stock AND is_active = 1
      ORDER BY stock ASC
    `).all());
        // 4. Rendimiento e ingresos generados por cada estilista en el período (ranking)
        const stylistRows = (await db.prepare(`
      SELECT
        st.id as stylist_id,
        st.full_name as stylist_name,
        COALESCE(SUM(si.quantity), 0) as services_count,
        COALESCE(SUM(si.subtotal), 0) as total_service_revenue,
        COALESCE(SUM(si.commission_amount), 0) as total_commissions,
        COALESCE(SUM(si.profit_amount), 0) as total_profit
      FROM stylists st
      LEFT JOIN (
        sale_items si
        JOIN sales s ON si.sale_id = s.id AND s.status = 'completed' ${salesDateCondition}
      ) ON st.id = si.stylist_id AND si.item_type = 'service'
      WHERE st.is_active = 1
      GROUP BY st.id, st.full_name
      ORDER BY total_service_revenue DESC, services_count DESC
    `).all());
        // Detalle del trabajo de cada estilista: cada servicio una sola vez, con cantidad,
        // precio unitario y total (3 cortes a 50.000 = "× 3", 50.000 c/u, 150.000).
        const serviceDetailRows = (await db.prepare(`
      SELECT
        si.stylist_id as stylist_id,
        si.item_name as service_name,
        si.unit_price as unit_price,
        SUM(si.quantity) as quantity,
        SUM(si.subtotal) as total_amount,
        SUM(si.commission_amount) as total_commission,
        SUM(si.profit_amount) as total_profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id AND s.status = 'completed' ${salesDateCondition}
      WHERE si.item_type = 'service' AND si.stylist_id IS NOT NULL
      GROUP BY si.stylist_id, si.item_name, si.unit_price
      ORDER BY total_amount DESC, quantity DESC
    `).all());
        const servicesByStylist = new Map();
        for (const d of serviceDetailRows) {
            const entry = {
                service_name: d.service_name,
                unit_price: num(d.unit_price),
                quantity: num(d.quantity),
                total_amount: num(d.total_amount),
                total_commission: num(d.total_commission),
                total_profit: num(d.total_profit),
            };
            const list = servicesByStylist.get(d.stylist_id);
            if (list)
                list.push(entry);
            else
                servicesByStylist.set(d.stylist_id, [entry]);
        }
        const stylistPerformances = stylistRows.map((r) => ({
            ...r,
            services: servicesByStylist.get(r.stylist_id) || [],
            services_count: num(r.services_count),
            total_service_revenue: num(r.total_service_revenue),
            total_commissions: num(r.total_commissions),
            total_profit: num(r.total_profit),
        }));
        // 5. Rendimiento y ventas de productos / artículos en el período
        const productRows = (await db.prepare(`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.barcode,
        p.sku,
        COALESCE(c.name, 'Artículos & Cafetería') as category_name,
        COALESCE(SUM(si.quantity), 0) as units_sold,
        COALESCE(SUM(si.subtotal), 0) as total_revenue,
        COALESCE(SUM(si.quantity * p.cost_price), 0) as total_cost,
        COALESCE(SUM(si.subtotal - (si.quantity * p.cost_price)), 0) as total_profit,
        p.stock as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        sale_items si
        JOIN sales s ON si.sale_id = s.id AND s.status = 'completed' ${salesDateCondition}
      ) ON p.id = si.item_id AND si.item_type = 'product'
      WHERE p.is_active = 1
      GROUP BY p.id, p.name, p.barcode, p.sku, p.stock, c.name
      ORDER BY total_revenue DESC, units_sold DESC
    `).all());
        const productPerformances = productRows.map((r) => ({
            ...r,
            units_sold: num(r.units_sold),
            total_revenue: num(r.total_revenue),
            total_cost: num(r.total_cost),
            total_profit: num(r.total_profit),
            current_stock: num(r.current_stock),
        }));
        // 6. Desglose de ingresos por método de pago en el período
        const paymentRows = (await db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM sales s
      WHERE s.status = 'completed' ${salesDateCondition}
      GROUP BY payment_method
    `).all());
        const paymentMethods = paymentRows.map((r) => ({
            ...r,
            count: num(r.count),
            total: num(r.total),
        }));
        return {
            period,
            totalRevenue,
            totalSalesCount,
            averageTicket,
            currentCashInRegister,
            lowStockCount: lowStockProducts.length,
            lowStockProducts,
            stylistPerformances,
            stylist_performance: stylistPerformances,
            productPerformances,
            paymentMethods,
        };
    }
}
