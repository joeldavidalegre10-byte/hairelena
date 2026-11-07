import React, { useState, useEffect } from 'react';
import { reportsService } from '../../services/reports.service';
import { DashboardMetrics, ProductPerformance, StylistPerformance } from '../../types';
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
  Scissors,
  UserCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/ui/Modal';

type Period = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

// 2026-11-07 -> 07/11/2026 (sin pasar por Date para evitar desfases de zona horaria)
const formatIsoDate = (iso: string) => iso.split('-').reverse().join('/');

export const ReportsView: React.FC = () => {
  const { user, notify, hasPermission } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  // Estilista cuyo detalle de servicios se muestra en el modal
  const [detailStylistId, setDetailStylistId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('day');
  // Filtro por rango de fechas (AAAA-MM-DD). Si hay alguna fecha, el período pasa a "custom".
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (hasPermission('reports')) {
      loadReports(period);
    }
  }, [user, period, dateFrom, dateTo]);

  const loadReports = async (selectedPeriod: Period = period) => {
    try {
      setLoading(true);
      const isCustom = selectedPeriod === 'custom';
      const data = await reportsService.getDashboardMetrics(
        selectedPeriod,
        isCustom ? dateFrom || undefined : undefined,
        isCustom ? dateTo || undefined : undefined
      );
      setMetrics(data || null);
    } catch (err: any) {
      notify('Error al cargar métricas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetPeriod = (p: Exclude<Period, 'custom'>) => {
    setDateFrom('');
    setDateTo('');
    setPeriod(p);
  };

  const handleDateChange = (which: 'from' | 'to', value: string) => {
    let from = which === 'from' ? value : dateFrom;
    let to = which === 'to' ? value : dateTo;
    // Si el rango queda invertido se ajusta el otro extremo
    if (from && to && from > to) {
      if (which === 'from') to = from;
      else from = to;
    }
    setDateFrom(from);
    setDateTo(to);
    setPeriod(from || to ? 'custom' : 'day');
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    setPeriod('day');
  };

  const customLabel =
    dateFrom && dateTo
      ? dateFrom === dateTo
        ? formatIsoDate(dateFrom)
        : `${formatIsoDate(dateFrom)} – ${formatIsoDate(dateTo)}`
      : dateFrom
      ? `Desde ${formatIsoDate(dateFrom)}`
      : dateTo
      ? `Hasta ${formatIsoDate(dateTo)}`
      : 'Rango de fechas';

  const periodLabel = {
    day: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    year: 'Este Año',
    all: 'Histórico Total',
    custom: customLabel,
  }[period];

  // Restricción de seguridad
  if (!hasPermission('reports')) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-slate-50 dark:bg-slate-950">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Acceso Restringido</h2>
        <p className="text-xs text-slate-500 max-w-md">
          No tienes permiso para ver los reportes financieros. Pídele acceso a un administrador.
        </p>
      </div>
    );
  }

  const topStylist = metrics?.stylistPerformances && metrics.stylistPerformances.length > 0 && metrics.stylistPerformances[0].total_service_revenue > 0
    ? metrics.stylistPerformances[0]
    : null;

  const services = metrics?.servicePerformances || [];
  const totalServicesPerformed = services.reduce((acc, s) => acc + s.times_performed, 0);
  const topService = services.length > 0 && services[0].times_performed > 0 ? services[0] : null;

  const detailStylist: StylistPerformance | null = detailStylistId
    ? metrics?.stylistPerformances?.find((s) => s.stylist_id === detailStylistId) || null
    : null;

  // Tabla reutilizada por "Productos de salón" y "Artículos & Cafetería"
  const renderSalesTable = (
    rows: ProductPerformance[] | undefined,
    opts: { kind: 'product' | 'article'; firstColumn: string; topBadge: string; emptyText: string; loadingText: string }
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
          <tr>
            <th className="py-3 px-4">{opts.firstColumn}</th>
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
              <td colSpan={7} className="py-8 text-center text-slate-400">{opts.loadingText}</td>
            </tr>
          ) : !rows || rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-slate-400">
                {opts.emptyText} ({periodLabel}).
              </td>
            </tr>
          ) : (
            rows.map((prod, index) => {
              const isTop = index === 0 && prod.total_revenue > 0;
              return (
                <tr
                  key={prod.product_id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                    isTop ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {opts.kind === 'article' ? (
                      <Coffee className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
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
                    <span className="font-mono text-slate-600 dark:text-slate-400">{prod.current_stock} unid.</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isTop ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold text-[10px]">
                        <Flame className="w-3 h-3" /> {opts.topBadge}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">{prod.units_sold > 0 ? 'En catálogo' : 'Sin salida'}</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const topProduct = metrics?.productPerformances?.[0]?.total_revenue ? metrics.productPerformances[0] : null;
  const topArticle = metrics?.articlePerformances?.[0]?.total_revenue ? metrics.articlePerformances[0] : null;

  const topBadgeClass =
    'flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold';

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-200">
      {/* CABECERA, SELECTOR DE PERÍODO Y FILTRO POR FECHAS */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Reportes & Métricas del Negocio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ingresos por período, rendimiento de estilistas, servicios, productos y artículos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SELECTOR DE PERÍODO */}
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
                  onClick={() => handlePresetPeriod(p)}
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

          {/* FILTRO POR RANGO DE FECHAS */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-xl border transition ${
              period === 'custom'
                ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10'
                : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Desde
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Hasta
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={clearDates}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                title="Quitar filtro de fechas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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

      {/* REPORTE 1: RENDIMIENTO DE ESTILISTAS (el detalle de cada uno se abre en un modal) */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Reporte de Rendimiento por Estilista ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cuánto genera cada profesional y comisión calculada. Haz clic en un estilista para ver el detalle de sus trabajos
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
                      onClick={() => setDetailStylistId(perf.stylist_id)}
                      title="Ver el detalle de servicios de este estilista"
                      className={`cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
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
                        <span className="inline-flex items-center gap-2">
                          {isTop ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[10px]">
                              <Trophy className="w-3 h-3" /> Mayor Rendimiento
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {perf.total_service_revenue > 0 ? 'Activo' : 'Sin ventas'}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORTE 2: SERVICIOS (cuál se realiza más) */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Reporte de Servicios ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Qué servicio se realiza más, cuánto factura y cuánto deja de ganancia
            </p>
          </div>
          {topService && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <Flame className="w-3.5 h-3.5" />
              Más realizado: {topService.service_name} (× {topService.times_performed})
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Servicio</th>
                <th className="py-3 px-4">Veces realizado</th>
                <th className="py-3 px-4">% del total</th>
                <th className="py-3 px-4">Facturación</th>
                <th className="py-3 px-4">Comisión</th>
                <th className="py-3 px-4">Ganancia Salón</th>
                <th className="py-3 px-4 text-right">Estilistas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Calculando servicios más realizados...</td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se registran servicios realizados en este período ({periodLabel}).
                  </td>
                </tr>
              ) : (
                services.map((srv, index) => {
                  const isTop = index === 0 && srv.times_performed > 0;
                  const share = totalServicesPerformed > 0 ? (srv.times_performed / totalServicesPerformed) * 100 : 0;
                  return (
                    <tr
                      key={srv.service_name}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isTop ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {index + 1}
                          </span>
                          {srv.service_name}
                          {isTop && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">🔥 Top</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">× {srv.times_performed}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 w-10 text-right">
                            {share.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-mono">{formatCurrency(srv.total_revenue)}</td>
                      <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(srv.total_commission)}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(srv.total_profit)}</td>
                      <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{srv.stylists_count}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORTE 3: PRODUCTOS DE SALÓN */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Reporte de Productos de Salón ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unidades vendidas, facturación, ganancias y stock restante de los productos de salón
            </p>
          </div>
          {topProduct && (
            <div className={topBadgeClass}>
              <Flame className="w-3.5 h-3.5" />
              🔥 Más Vendido: {topProduct.product_name}
            </div>
          )}
        </div>
        {renderSalesTable(metrics?.productPerformances, {
          kind: 'product',
          firstColumn: 'Producto',
          topBadge: 'Más Vendido',
          emptyText: 'No se registran productos vendidos en este período',
          loadingText: 'Cargando ventas de productos...',
        })}
      </div>

      {/* REPORTE 4: ARTÍCULOS & CAFETERÍA */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Coffee className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Reporte de Artículos & Cafetería ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unidades vendidas, facturación, ganancias y stock restante de cafetería, dulces y snacks
            </p>
          </div>
          {topArticle && (
            <div className={topBadgeClass}>
              <Flame className="w-3.5 h-3.5" />
              🔥 Más Vendido: {topArticle.product_name}
            </div>
          )}
        </div>
        {renderSalesTable(metrics?.articlePerformances, {
          kind: 'article',
          firstColumn: 'Artículo',
          topBadge: 'Más Vendido',
          emptyText: 'No se registran artículos vendidos en este período',
          loadingText: 'Cargando ventas de artículos...',
        })}
      </div>

      {/* REPORTE 5: VENTAS POR CAJERO */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Reporte de Ventas por Cajero ({periodLabel})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cuántos tickets cobró cada usuario, cuánto vendió y con qué métodos de pago
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Cajero</th>
                <th className="py-3 px-4">Tickets</th>
                <th className="py-3 px-4">Total Vendido</th>
                <th className="py-3 px-4">Ticket Promedio</th>
                <th className="py-3 px-4">Efectivo</th>
                <th className="py-3 px-4">Tarjeta</th>
                <th className="py-3 px-4">Transferencia</th>
                <th className="py-3 px-4 text-right">Mixto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Calculando ventas por cajero...</td>
                </tr>
              ) : !metrics?.cashierPerformances || metrics.cashierPerformances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se registran ventas en este período ({periodLabel}).
                  </td>
                </tr>
              ) : (
                <>
                  {metrics.cashierPerformances.map((c, index) => (
                    <tr key={c.cashier_id || `sin-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          {c.cashier_name}
                          {c.cashier_role && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                              {c.cashier_role === 'admin' ? 'Administrador' : c.cashier_role === 'cashier' ? 'Cajero' : c.cashier_role}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{c.sales_count}</td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-mono">{formatCurrency(c.total_revenue)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{formatCurrency(c.average_ticket)}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(c.cash_total)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{formatCurrency(c.card_total)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{formatCurrency(c.transfer_total)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">{formatCurrency(c.mixed_total)}</td>
                    </tr>
                  ))}
                  <tr className="font-extrabold bg-slate-50/60 dark:bg-slate-950/30">
                    <td className="py-3 px-4 text-slate-900 dark:text-white">Total</td>
                    <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400">
                      {metrics.cashierPerformances.reduce((a, c) => a + c.sales_count, 0)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 dark:text-white">
                      {formatCurrency(metrics.cashierPerformances.reduce((a, c) => a + c.total_revenue, 0))}
                    </td>
                    <td className="py-3 px-4" />
                    <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(metrics.cashierPerformances.reduce((a, c) => a + c.cash_total, 0))}
                    </td>
                    <td className="py-3 px-4 font-mono">{formatCurrency(metrics.cashierPerformances.reduce((a, c) => a + c.card_total, 0))}</td>
                    <td className="py-3 px-4 font-mono">{formatCurrency(metrics.cashierPerformances.reduce((a, c) => a + c.transfer_total, 0))}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(metrics.cashierPerformances.reduce((a, c) => a + c.mixed_total, 0))}</td>
                  </tr>
                </>
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

      {/* MODAL: DETALLE DE TRABAJOS DEL ESTILISTA */}
      {detailStylist && (
        <Modal
          isOpen={true}
          onClose={() => setDetailStylistId(null)}
          title={detailStylist.stylist_name}
          subtitle={`Detalle de trabajos · ${periodLabel}`}
          maxWidth="3xl"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Servicios', value: String(detailStylist.services_count), cls: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Facturado', value: formatCurrency(detailStylist.total_service_revenue), cls: 'text-slate-900 dark:text-white' },
              { label: 'Comisión', value: formatCurrency(detailStylist.total_commissions), cls: 'text-amber-600 dark:text-amber-400' },
              { label: 'Ganancia salón', value: formatCurrency(detailStylist.total_profit), cls: 'text-emerald-600 dark:text-emerald-400' },
            ].map((k) => (
              <div key={k.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{k.label}</span>
                <span className={`text-sm font-extrabold font-mono ${k.cls}`}>{k.value}</span>
              </div>
            ))}
          </div>

          {(detailStylist.services || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin servicios en este período ({periodLabel}).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 pr-4">Servicio</th>
                    <th className="py-2 pr-4">Cantidad</th>
                    <th className="py-2 pr-4">Precio unitario</th>
                    <th className="py-2 pr-4">Total facturado</th>
                    <th className="py-2 pr-4">Comisión</th>
                    <th className="py-2">Ganancia salón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {(detailStylist.services || []).map((d) => (
                    <tr key={`${d.service_name}-${d.unit_price}`}>
                      <td className="py-2 pr-4 font-semibold text-slate-900 dark:text-slate-100">{d.service_name}</td>
                      <td className="py-2 pr-4 font-bold text-indigo-600 dark:text-indigo-400">× {d.quantity}</td>
                      <td className="py-2 pr-4 font-mono text-slate-600 dark:text-slate-300">{formatCurrency(d.unit_price)}</td>
                      <td className="py-2 pr-4 font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(d.total_amount)}</td>
                      <td className="py-2 pr-4 font-mono text-amber-600 dark:text-amber-400">{formatCurrency(d.total_commission)}</td>
                      <td className="py-2 font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(d.total_profit)}</td>
                    </tr>
                  ))}
                  <tr className="font-extrabold">
                    <td className="py-2.5 pr-4 text-slate-900 dark:text-white">Total</td>
                    <td className="py-2.5 pr-4 text-indigo-600 dark:text-indigo-400">× {detailStylist.services_count}</td>
                    <td className="py-2.5 pr-4" />
                    <td className="py-2.5 pr-4 font-mono text-slate-900 dark:text-white">{formatCurrency(detailStylist.total_service_revenue)}</td>
                    <td className="py-2.5 pr-4 font-mono text-amber-600 dark:text-amber-400">{formatCurrency(detailStylist.total_commissions)}</td>
                    <td className="py-2.5 font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(detailStylist.total_profit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
