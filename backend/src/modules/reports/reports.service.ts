import { getDb } from '../../db/database.js';

// MySQL devuelve SUM() como DECIMAL (string en mysql2). Normalizamos a número.
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export class ReportsService {
  static async getDashboardMetrics(period: string = 'day') {
    const db = getDb();

    // Filtro temporal por período: 'day' | 'week' | 'month' | 'year' | 'all'
    // (database.ts traduce datetime()/date() de SQLite a MySQL)
    let salesDateCondition = '';
    if (period === 'day') {
      salesDateCondition = " AND DATE(s.created_at) = DATE('now', 'localtime')";
    } else if (period === 'week') {
      salesDateCondition = " AND s.created_at >= datetime('now', '-7 days', 'localtime')";
    } else if (period === 'month') {
      salesDateCondition = " AND s.created_at >= datetime('now', 'start of month', 'localtime')";
    } else if (period === 'year') {
      salesDateCondition = " AND s.created_at >= datetime('now', 'start of year', 'localtime')";
    }

    // 1. Ingresos y cantidad de ventas completadas en el período
    const salesStats = ((await db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as sales_count
      FROM sales s
      WHERE s.status = 'completed' ${salesDateCondition}
    `).get()) || { total_revenue: 0, sales_count: 0 }) as { total_revenue: any; sales_count: any };

    const totalRevenue = num(salesStats.total_revenue);
    const totalSalesCount = num(salesStats.sales_count);
    const averageTicket = totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0;

    // 2. Efectivo en caja registradora abierta
    const activeReg = (await db.prepare(`
      SELECT expected_amount
      FROM cash_registers
      WHERE status = 'open'
      ORDER BY opened_at DESC
      LIMIT 1
    `).get()) as { expected_amount: any } | undefined;

    const currentCashInRegister = activeReg ? num(activeReg.expected_amount) : 0;

    // 3. Productos con stock bajo
    const lowStockProducts = (await db.prepare(`
      SELECT *
      FROM products
      WHERE stock <= min_stock AND is_active = 1
      ORDER BY stock ASC
    `).all()) as any[];

    // 4. Rendimiento e ingresos generados por cada estilista en el período (ranking)
    const stylistRows = (await db.prepare(`
      SELECT
        st.id as stylist_id,
        st.full_name as stylist_name,
        COUNT(si.id) as services_count,
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
    `).all()) as any[];

    const stylistPerformances = stylistRows.map((r) => ({
      ...r,
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
    `).all()) as any[];

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
    `).all()) as any[];

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