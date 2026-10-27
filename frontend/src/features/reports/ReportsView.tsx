import React, { useState, useEffect } from 'react';
import { reportsService } from '../../services/reports.service';
import { DashboardMetrics } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Vault,
  Calendar,
  Sparkles,
  Users,
  ShieldAlert,
  Trophy,
  Flame,
  Package,
  Coffee,
  ShoppingBag,
  RefreshCw,
  CreditCard,
  Banknote,
  ArrowRightLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportsView: React.FC = () => {
  const { user, notify } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadReports(period);
    }
  }, [user, period]);

  const loadReports = async (selectedPeriod: string = period) => {
    try {
      setLoading(true);
      const data = await reportsService.getDashboardMetrics(selectedPeriod);
      setMetrics(data || null);
    } catch (err: any) {
      notify('Error al cargar métricas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = {
    day: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    year: 'Este Año',
    all: 'Histórico Total',
  }[period];

  // Restricción de seguridad
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-slate-50 dark:bg-slate-950">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Acceso Restringido</h2>
        <p className="text-xs text-slate-500 max-w-md">
          Los reportes financieros y auditorías globales están reservados exclusivamente para el Administrador.
        </p>
      </div>
    );
  }

  const topStylist = metrics?.stylistPerformances && metrics.stylistPerformances.length > 0 && metrics.stylistPerformances[0].total_service_revenue > 0
    ? metrics.stylistPerformances[0]
    : null;

  const topProduct = metrics?.productPerformances && metrics.productPerformances.length > 0 && metrics.productPerformances[0].total_revenue > 0
    ? metrics.productPerformances[0]
    : null;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-200">
      {/* CABECERA Y SELECTOR DE PERÍODO (DÍA, SEMANA, MES, AÑO, TOTAL) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Reportes & Métricas del Negocio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ingresos por período, rendimiento de estilistas y ventas de productos y artículos
          </p>
        </div>

        {/* SELECTOR DE PERÍODO */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl">
            {(['day', 'week', 'month', 'year', 'all'] as const).map((p) => {
              const labels = {
                day: 'Día (Hoy)',
                week: 'Semana',
                month: 'Mes',
                year: 'Año',
                all: 'Histórico',
              };
              const isActive = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => loadReports(period)}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition shadow-2xs"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI CARDS DEL PERÍODO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Ingresos ({periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(metrics?.totalRevenue || 0)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Facturación neta completada</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tickets Emitidos ({periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics?.totalSalesCount || 0}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Ventas realizadas</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Ticket Promedio ({periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            {formatCurrency(metrics?.averageTicket || 0)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Gasto medio por ticket</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Efectivo en Caja Activa</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Vault className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatCurrency(metrics?.currentCashInRegister || 0)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Saldo gaveta en turno abierto</span>
        </div>
      </div>

      {/* REPORTE 1: RENDIMIENTO DE ESTILISTAS (CUÁNTO GENERA Y QUIÉN TIENE MEJOR RENDIMIENTO) */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Reporte de Rendimiento por Estilista ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cuánto genera cada profesional, comisión calculada y quién tiene el mejor rendimiento
            </p>
          </div>
          {topStylist && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5" />
              ⭐ Mejor Rendimiento: {topStylist.stylist_name}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Ranking / Estilista</th>
                <th className="py-3 px-4">Servicios Hechos</th>
                <th className="py-3 px-4">Facturación Generada</th>
                <th className="py-3 px-4">Comisión Profesional</th>
                <th className="py-3 px-4">Ganancia Salón</th>
                <th className="py-3 px-4 text-right">Rendimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Calculando rendimiento de estilistas...
                  </td>
                </tr>
              ) : !metrics?.stylistPerformances || metrics.stylistPerformances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se registran servicios facturados para este período ({periodLabel}).
                  </td>
                </tr>
              ) : (
                metrics.stylistPerformances.map((perf, index) => {
                  const isTop = index === 0 && perf.total_service_revenue > 0;
                  return (
                    <tr
                      key={perf.stylist_id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isTop ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          index === 0
                            ? 'bg-amber-500 text-white'
                            : index === 1
                            ? 'bg-slate-400 text-white'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                        <span>{perf.stylist_name}</span>
                        {isTop && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            ⭐ Top
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {perf.services_count} {perf.services_count === 1 ? 'servicio' : 'servicios'}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(perf.total_service_revenue)}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(perf.total_commissions)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(perf.total_profit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isTop ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[10px]">
                            <Trophy className="w-3 h-3" /> Mayor Rendimiento
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {perf.total_service_revenue > 0 ? 'Activo' : 'Sin ventas'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORTE 2: RENDIMIENTO DE PRODUCTOS & ARTÍCULOS (CAFÉ, DULCES, STOCK) */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Reporte de Ventas de Productos & Artículos ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unidades vendidas, facturación, ganancias y stock restante de productos y cafetería
            </p>
          </div>
          {topProduct && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5" />
              🔥 Más Vendido: {topProduct.product_name}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Producto / Artículo</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Unidades Vendidas</th>
                <th className="py-3 px-4">Total Recaudado</th>
                <th className="py-3 px-4">Ganancia Neta</th>
                <th className="py-3 px-4">Stock Restante</th>
                <th className="py-3 px-4 text-right">Rendimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Cargando ventas de productos...
                  </td>
                </tr>
              ) : !metrics?.productPerformances || metrics.productPerformances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se registran productos ni artículos vendidos en este período ({periodLabel}).
                  </td>
                </tr>
              ) : (
                metrics.productPerformances.map((prod, index) => {
                  const isTop = index === 0 && prod.total_revenue > 0;
                  const isCafe = prod.category_name?.toLowerCase().includes('café') || prod.category_name?.toLowerCase().includes('artículo');
                  return (
                    <tr
                      key={prod.product_id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isTop ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {isCafe ? (
                          <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                        <span>{prod.product_name}</span>
                        {isTop && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                            🔥 Top
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                          {prod.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {prod.units_sold} {prod.units_sold === 1 ? 'unidad' : 'unidades'}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(prod.total_revenue)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(prod.total_profit)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {prod.current_stock} unid.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isTop ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold text-[10px]">
                            <Flame className="w-3 h-3" /> Más Vendido
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {prod.units_sold > 0 ? 'En catálogo' : 'Sin salida'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN ALERTA DE STOCK CRÍTICO */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            Control de Stock Crítico ({metrics?.lowStockCount || 0})
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Artículos y productos que requieren reposición</span>
        </div>

        {metrics?.lowStockProducts && metrics.lowStockProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.lowStockProducts.map((prd) => (
              <div
                key={prd.id}
                className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block">{prd.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Mínimo sugerido: {prd.min_stock} unid.</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                    {prd.stock} disponibles
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-center text-slate-500 text-xs">
            ✨ Excelente: todos los productos y artículos tienen niveles de stock saludables.
          </div>
        )}
      </div>
    </div>
  );
};
