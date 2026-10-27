import React, { useState, useEffect } from 'react';
import { salesService } from '../../services/sales.service';
import { Sale } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Receipt, Search, Eye, X, CheckCircle, Ban, Trash2, Lock, Vault, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SalesHistoryView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isVoidingMode, setIsVoidingMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { notify, refreshRegister, user, currentRegister, setActiveTab } = useApp();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await salesService.list();
      setSales(data || []);
    } catch (err: any) {
      notify('Error al cargar ventas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaleModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsVoidingMode(false);
    setAdminPassword('');
    setCancelReason('');
    setPasswordError('');
  };

  const handleCloseSaleModal = () => {
    if (isCancelling) return;
    setSelectedSale(null);
    setIsVoidingMode(false);
    setAdminPassword('');
    setCancelReason('');
    setPasswordError('');
  };

  const handleStartVoidSale = () => {
    setIsVoidingMode(true);
    setAdminPassword('');
    setCancelReason('');
    setPasswordError('');
  };

  const handleCancelVoidMode = () => {
    setIsVoidingMode(false);
    setAdminPassword('');
    setCancelReason('');
    setPasswordError('');
  };

  const handleConfirmVoidSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    if (!adminPassword.trim()) {
      setPasswordError('Debe ingresar la contraseña de administrador.');
      return;
    }

    try {
      setIsCancelling(true);
      setPasswordError('');
      await salesService.cancel(selectedSale.id, adminPassword, cancelReason);
      notify(`Venta #${selectedSale.invoice_number} anulada exitosamente`, 'success');
      handleCloseSaleModal();
      await loadSales();
      refreshRegister();
    } catch (err: any) {
      setPasswordError(err.message || 'Contraseña de administrador incorrecta. Verifique sus credenciales.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Filtrar exclusivamente los tickets del turno de caja actualmente abierto.
  // Al cerrar la caja, los comprobantes desaparecen de esta vista operativa y pasan a Reportes y Métricas.
  const isRegisterOpen = currentRegister && currentRegister.status === 'open';
  const activeShiftSales = isRegisterOpen
    ? sales.filter((s) => s.register_id === currentRegister.id)
    : [];

  const filteredSales = activeShiftSales.filter((s) =>
    s.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Historial de Tickets de Caja Activa
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isRegisterOpen
              ? `Comprobantes emitidos en el turno actual (${currentRegister.name}). Haz clic en un ticket para ver detalles o anularlo.`
              : 'La caja está cerrada. Los tickets emitidos en turnos previos se consultan en el módulo de Reportes y Métricas.'}
          </p>
        </div>

        {isRegisterOpen && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por ticket o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Nº Ticket</th>
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    Cargando historial de ventas...
                  </td>
                </tr>
              ) : !isRegisterOpen ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Vault className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Caja de Cobro Cerrada
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Al cerrar la caja, los comprobantes de turnos anteriores se archivan de la vista operativa y están disponibles para auditoría general en el módulo de <strong>Reportes y Métricas</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reports')}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm shadow-indigo-600/20"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Ver en Reportes y Métricas
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No se registraron tickets en el turno de caja actual.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => handleOpenSaleModal(sale)}
                    className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none"
                    title="Haz clic para ver el ticket detallado"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-200">
                      {sale.customer_name}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-[10px]">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      {sale.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Completada
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                          <Ban className="w-3.5 h-3.5" /> Cancelada
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSaleModal(sale);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-200 dark:border-slate-700/60"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Ticket
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DE TICKET CON BOTONES SALIR Y ANULAR VENTA */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ticket #{selectedSale.invoice_number}
                  </h3>
                  {selectedSale.status === 'completed' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-semibold">
                      <CheckCircle className="w-3 h-3" /> Completada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[10px] font-semibold">
                      <Ban className="w-3 h-3" /> Anulada
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Emitido el {formatDate(selectedSale.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSaleModal}
                disabled={isCancelling}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del ticket con scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cliente:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedSale.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Método de Pago:</span>
                  <span className="font-semibold capitalize text-slate-900 dark:text-slate-200">{selectedSale.payment_method}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cajero Responsable:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-300">{selectedSale.cashier_name || 'Cajero asignado'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Estado:</span>
                  <span className={`font-semibold ${selectedSale.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {selectedSale.status === 'completed' ? 'Venta Válida' : 'Venta Anulada'}
                  </span>
                </div>
              </div>

              {/* Ítems del ticket */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Ítems Facturados
                </h4>
                <div className="space-y-2">
                  {selectedSale.items?.map((it) => (
                    <div
                      key={it.id}
                      className="flex justify-between items-start p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs border border-slate-200 dark:border-slate-800/80"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {it.item_name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{it.quantity} x {formatCurrency(it.unit_price)}</span>
                          {it.stylist_name && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50">
                              Estilista: {it.stylist_name}
                            </span>
                          )}
                          {it.commission_amount && user?.role !== 'cashier' ? (
                            <span>· Comis: {formatCurrency(it.commission_amount)}</span>
                          ) : null}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Descuento aplicado:</span>
                    <span className="text-rose-500 font-semibold">-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">Total Liquidado:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {/* Aviso si ya está cancelada */}
              {selectedSale.status === 'cancelled' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>Este ticket fue anulado previamente. El stock fue restaurado y los saldos de caja ajustados.</span>
                </div>
              )}

              {/* Panel de confirmación de anulación (con clave admin) */}
              {isVoidingMode && selectedSale.status === 'completed' && (
                <form onSubmit={handleConfirmVoidSale} className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                    <Trash2 className="w-4 h-4" />
                    <span>Autorizar Anulación de Ticket #{selectedSale.invoice_number}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Se anulará el comprobante, se repondrá el stock de productos y se cancelarán comisiones. Ingrese la contraseña de administrador para continuar.
                  </p>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                      Motivo de anulación (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Error en digitación de ticket o método de pago"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      disabled={isCancelling}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" />
                      Contraseña de Administrador *
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="Introduce la contraseña de administrador"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      disabled={isCancelling}
                      autoComplete="current-password"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                    {passwordError && (
                      <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                        ⚠️ {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelVoidMode}
                      disabled={isCancelling}
                      className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCancelling || !adminPassword.trim()}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
                    >
                      {isCancelling ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Confirmar Anulación
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Botones inferiores: Salir y Anular Venta */}
            {!isVoidingMode && (
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={handleCloseSaleModal}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Salir
                </button>

                {selectedSale.status === 'completed' ? (
                  <button
                    type="button"
                    onClick={handleStartVoidSale}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-rose-600/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Anular Venta
                  </button>
                ) : (
                  <span className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs border border-slate-200 dark:border-slate-700">
                    Venta Anulada
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
