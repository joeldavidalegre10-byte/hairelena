import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { cashRegisterService } from '../../services/cash-register.service';
import { CashMovement, CashRegister } from '../../types';
import { formatCurrency, formatDate, formatParaguayThousands, parseParaguayNumber } from '../../utils/formatters';
import { ArrowDownLeft, ArrowUpRight, Clock, Lock, RefreshCw, User as UserIcon, X } from 'lucide-react';

type StatusFilter = 'all' | 'open' | 'closed';

/**
 * Vista del administrador: todas las cajas (una por usuario), con sus ventas y movimientos.
 * Permite ver el detalle de cualquier caja y cerrar una que haya quedado abierta.
 */
export const AllRegistersPanel: React.FC = () => {
  const { notify, refreshRegister } = useApp();
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const [selected, setSelected] = useState<CashRegister | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [closing, setClosing] = useState(false);
  const [closeAmount, setCloseAmount] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cashRegisterService.listAll(filter === 'all' ? undefined : { status: filter });
      setRegisters(data || []);
    } catch (err: any) {
      notify('Error al cargar las cajas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (reg: CashRegister) => {
    setSelected(reg);
    setClosing(false);
    setMovements([]);
    try {
      setLoadingMovements(true);
      setMovements((await cashRegisterService.listMovements(reg.id)) || []);
    } catch (err: any) {
      notify('Error al cargar movimientos: ' + err.message, 'error');
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const result = await cashRegisterService.close(selected.id, Number(closeAmount), closeNotes);
      notify(`Caja cerrada. Diferencia: ${formatCurrency(result.difference)}`, 'success');
      setSelected(null);
      setClosing(false);
      setCloseNotes('');
      await load();
      refreshRegister(); // por si era la caja del propio admin
    } catch (err: any) {
      notify('Error al cerrar caja: ' + err.message, 'error');
    }
  };

  const openRegisters = registers.filter((r) => r.status === 'open');
  const openCash = openRegisters.reduce((sum, r) => sum + (r.expected_amount || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Resumen + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="px-4 py-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Cajas abiertas</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{openRegisters.length}</span>
          </div>
          <div className="px-4 py-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Efectivo en cajas abiertas</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(openCash)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {(['all', 'open', 'closed'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition ${
                filter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'open' ? 'Abiertas' : 'Cerradas'}
            </button>
          ))}
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-auto shadow-sm">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Apertura</th>
              <th className="px-4 py-3 font-semibold text-right">Ventas</th>
              <th className="px-4 py-3 font-semibold text-right">Esperado</th>
              <th className="px-4 py-3 font-semibold text-right">Contado</th>
              <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {registers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-10">
                  {loading ? 'Cargando...' : 'No hay cajas para mostrar.'}
                </td>
              </tr>
            )}
            {registers.map((r) => (
              <tr
                key={r.id}
                onClick={() => openDetail(r)}
                className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    {r.opened_by_name || 'Usuario eliminado'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold ${
                      r.status === 'open'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'open' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {r.status === 'open' ? 'Abierta' : 'Cerrada'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(r.opened_at)}</td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                  {formatCurrency(r.sales_total || 0)}
                  <span className="text-slate-400"> ({r.sales_count || 0})</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-200">
                  {formatCurrency(r.expected_amount)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                  {r.status === 'closed' ? formatCurrency(r.actual_amount) : '-'}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    r.status !== 'closed'
                      ? 'text-slate-400'
                      : r.difference < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {r.status === 'closed' ? formatCurrency(r.difference) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalle de una caja */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Caja de {selected.opened_by_name || 'usuario eliminado'}
                </h3>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDate(selected.opened_at)}
                  {selected.closed_at && <> → {formatDate(selected.closed_at)}</>}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Fondo inicial</span>
                <b className="text-slate-900 dark:text-white">{formatCurrency(selected.initial_amount)}</b>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Efectivo esperado</span>
                <b className="text-emerald-600 dark:text-emerald-400">{formatCurrency(selected.expected_amount)}</b>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Ventas ({selected.sales_count || 0})</span>
                <b className="text-slate-900 dark:text-white">{formatCurrency(selected.sales_total || 0)}</b>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Ingresos / Egresos</span>
                <b className="text-slate-900 dark:text-white">
                  {formatCurrency(selected.movements_in || 0)} / {formatCurrency(selected.movements_out || 0)}
                </b>
              </div>
            </div>

            <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-2">Movimientos de efectivo</h4>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4 min-h-[80px]">
              {loadingMovements ? (
                <p className="text-xs text-slate-400 text-center py-6">Cargando...</p>
              ) : movements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin movimientos extraordinarios.</p>
              ) : (
                movements.map((mov) => (
                  <div
                    key={mov.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          mov.type === 'in'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {mov.type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block">{mov.reason}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatDate(mov.created_at)}
                          {mov.created_by_name && <> · {mov.created_by_name}</>}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        mov.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {mov.type === 'in' ? '+' : '-'} {formatCurrency(mov.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {selected.status === 'open' &&
              (closing ? (
                <form onSubmit={handleClose} className="space-y-3 text-xs border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Monto físico contado (₲)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={formatParaguayThousands(closeAmount)}
                      onChange={(e) => setCloseAmount(parseParaguayNumber(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <span
                      className={`block mt-1 font-semibold ${
                        closeAmount - selected.expected_amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      Diferencia: {formatCurrency(closeAmount - selected.expected_amount)}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Observaciones de cierre"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setClosing(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer">
                      Confirmar cierre
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setCloseAmount(selected.expected_amount);
                    setClosing(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  Cerrar esta caja (arqueo)
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
