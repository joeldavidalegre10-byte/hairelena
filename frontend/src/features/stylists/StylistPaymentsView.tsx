import React, { useState, useEffect } from 'react';
import { payoutsService } from '../../services/payouts.service';
import { StylistPendingSummary, StylistPayoutRecord, PendingServiceItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  Banknote,
  Receipt,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  Lock,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const StylistPaymentsView: React.FC = () => {
  const { notify } = useApp();
  const [pendingStylists, setPendingStylists] = useState<StylistPendingSummary[]>([]);
  const [payouts, setPayouts] = useState<StylistPayoutRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Estados de tarjetas desplegadas por estilista en "Por pagar"
  const [expandedPending, setExpandedPending] = useState<Record<string, boolean>>({});

  // Estados de tarjetas desplegadas por pago en "Pagados"
  const [expandedPaid, setExpandedPaid] = useState<Record<string, boolean>>({});

  // Estado del estilista en proceso de pago para deshabilitar botón y prevenir doble clic
  const [payingStylistId, setPayingStylistId] = useState<string | null>(null);

  // Búsquedas independientes
  const [pendingSearch, setPendingSearch] = useState<string>('');
  const [paidSearch, setPaidSearch] = useState<string>('');

  // Estados para 3.1: Revertir pago
  const [revertingPayout, setRevertingPayout] = useState<StylistPayoutRecord | null>(null);
  const [adminPasswordRevert, setAdminPasswordRevert] = useState<string>('');
  const [revertReason, setRevertReason] = useState<string>('');
  const [isSubmittingRevert, setIsSubmittingRevert] = useState<boolean>(false);

  // Estados para 3.2: Eliminar un servicio pendiente individual
  const [deletingCommission, setDeletingCommission] = useState<{
    stylistId: string;
    stylistName: string;
    item: PendingServiceItem;
  } | null>(null);
  const [adminPasswordDeleteOne, setAdminPasswordDeleteOne] = useState<string>('');
  const [deleteOneReason, setDeleteOneReason] = useState<string>('');
  const [isSubmittingDeleteOne, setIsSubmittingDeleteOne] = useState<boolean>(false);

  // Estados para 3.3: Eliminar todos los servicios pendientes de un estilista
  const [deletingAllStylist, setDeletingAllStylist] = useState<StylistPendingSummary | null>(null);
  const [adminPasswordDeleteAll, setAdminPasswordDeleteAll] = useState<string>('');
  const [deleteAllReason, setDeleteAllReason] = useState<string>('');
  const [isSubmittingDeleteAll, setIsSubmittingDeleteAll] = useState<boolean>(false);

  useEffect(() => {
    loadData(false);
  }, []);

  /**
   * Carga los datos de pagos.
   * @param silent Si es true, realiza la recarga sin desmontar el DOM ni alterar el scroll.
   */
  const loadData = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [pendingRes, payoutsRes] = await Promise.all([
        payoutsService.getPendingByStylist(),
        payoutsService.listPayouts(),
      ]);

      setPendingStylists(pendingRes || []);
      setPayouts(payoutsRes || []);
    } catch (err: any) {
      notify('Error al cargar datos de pagos: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Alterna el despliegue de los servicios pendientes de un estilista en "Por pagar"
   */
  const handleTogglePending = (stylistId: string) => {
    setExpandedPending((prev) => ({
      ...prev,
      [stylistId]: !prev[stylistId],
    }));
  };

  /**
   * Alterna el despliegue de los servicios incluidos en un pago histórico en "Pagados"
   */
  const handleTogglePaid = (payoutId: string) => {
    setExpandedPaid((prev) => ({
      ...prev,
      [payoutId]: !prev[payoutId],
    }));
  };

  /**
   * Ejecuta el pago al estilista ("Pagar ahora")
   */
  const handleExecutePayout = async (stylist: StylistPendingSummary, e: React.MouseEvent) => {
    e.stopPropagation();

    if (payingStylistId) return; // Prevenir múltiples clics

    try {
      setPayingStylistId(stylist.stylist_id);

      const result = await payoutsService.createPayout(stylist.stylist_id);

      notify(
        `Pago de ${formatCurrency(result.total_amount)} registrado exitosamente para ${stylist.stylist_name}`,
        'success'
      );

      // Cerrar la tarjeta en Por pagar
      setExpandedPending((prev) => {
        const next = { ...prev };
        delete next[stylist.stylist_id];
        return next;
      });

      // Abrir automáticamente el nuevo pago en la sección Pagados para confirmar
      setExpandedPaid((prev) => ({
        ...prev,
        [result.id]: true,
      }));

      // Refresco silencioso preservando la posición exacta de desplazamiento
      await loadData(true);
    } catch (err: any) {
      notify(err.message || 'Error al procesar el pago del estilista', 'error');
    } finally {
      setPayingStylistId(null);
    }
  };

  // 3.1 Revertir Pago
  const handleOpenRevertModal = (payout: StylistPayoutRecord) => {
    setRevertingPayout(payout);
    setAdminPasswordRevert('');
    setRevertReason('');
  };

  const handleConfirmRevertPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revertingPayout) return;
    if (!adminPasswordRevert.trim()) {
      notify('Debe ingresar la contraseña de administrador', 'error');
      return;
    }

    try {
      setIsSubmittingRevert(true);
      const targetStylistId = revertingPayout.stylist_id;
      await payoutsService.revertPayout(revertingPayout.id, adminPasswordRevert.trim(), revertReason.trim() || undefined);
      notify(`Pago revertido exitosamente. Los servicios han vuelto a la sección Por pagar.`, 'success');
      setRevertingPayout(null);
      setAdminPasswordRevert('');
      setRevertReason('');
      await loadData(true);
      // Auto-desplegar al estilista en la columna "Por pagar" para mostrar inmediatamente los servicios restaurados
      if (targetStylistId) {
        setExpandedPending((prev) => ({
          ...prev,
          [targetStylistId]: true,
        }));
      }
    } catch (err: any) {
      notify(err.message || 'Error al revertir el pago', 'error');
    } finally {
      setIsSubmittingRevert(false);
    }
  };

  // 3.2 Eliminar un servicio pendiente individual
  const handleOpenDeleteOneModal = (stylist: StylistPendingSummary, item: PendingServiceItem) => {
    setDeletingCommission({
      stylistId: stylist.stylist_id,
      stylistName: stylist.stylist_name,
      item,
    });
    setAdminPasswordDeleteOne('');
    setDeleteOneReason('');
  };

  const handleConfirmDeleteOneCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingCommission) return;
    if (!adminPasswordDeleteOne.trim()) {
      notify('Debe ingresar la contraseña de administrador', 'error');
      return;
    }

    try {
      setIsSubmittingDeleteOne(true);
      await payoutsService.deletePendingCommission(
        deletingCommission.item.commission_id,
        adminPasswordDeleteOne.trim(),
        deleteOneReason.trim() || undefined
      );
      notify(`Servicio "${deletingCommission.item.service_name}" excluido de la liquidación`, 'success');
      setDeletingCommission(null);
      setAdminPasswordDeleteOne('');
      setDeleteOneReason('');
      await loadData(true);
    } catch (err: any) {
      notify(err.message || 'Error al excluir el servicio pendiente', 'error');
    } finally {
      setIsSubmittingDeleteOne(false);
    }
  };

  // 3.3 Eliminar todos los servicios pendientes de un estilista
  const handleOpenDeleteAllModal = (stylist: StylistPendingSummary) => {
    setDeletingAllStylist(stylist);
    setAdminPasswordDeleteAll('');
    setDeleteAllReason('');
  };

  const handleConfirmDeleteAllCommissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingAllStylist) return;
    if (!adminPasswordDeleteAll.trim()) {
      notify('Debe ingresar la contraseña de administrador', 'error');
      return;
    }

    try {
      setIsSubmittingDeleteAll(true);
      await payoutsService.deleteAllPendingByStylist(
        deletingAllStylist.stylist_id,
        adminPasswordDeleteAll.trim(),
        deleteAllReason.trim() || undefined
      );
      notify(`Todos los servicios pendientes de ${deletingAllStylist.stylist_name} fueron eliminados exitosamente`, 'success');
      setDeletingAllStylist(null);
      setAdminPasswordDeleteAll('');
      setDeleteAllReason('');
      await loadData(true);
    } catch (err: any) {
      notify(err.message || 'Error al eliminar los servicios pendientes', 'error');
    } finally {
      setIsSubmittingDeleteAll(false);
    }
  };

  // Filtrado de estilistas pendientes por búsqueda
  const filteredPending = pendingStylists.filter((st) => {
    if (!pendingSearch.trim()) return true;
    const term = pendingSearch.toLowerCase();
    const matchesName = st.stylist_name.toLowerCase().includes(term);
    const matchesServices = st.services.some(
      (s) =>
        s.service_name.toLowerCase().includes(term) ||
        s.customer_name.toLowerCase().includes(term) ||
        (s.invoice_number && s.invoice_number.toLowerCase().includes(term))
    );
    return matchesName || matchesServices;
  });

  // Filtrado de pagos históricos por búsqueda
  const filteredPayouts = payouts.filter((p) => {
    if (!paidSearch.trim()) return true;
    const term = paidSearch.toLowerCase();
    const matchesName = p.stylist_name.toLowerCase().includes(term);
    const matchesDate = formatDate(p.created_at).toLowerCase().includes(term);
    const matchesServices = p.services.some(
      (s) =>
        s.service_name.toLowerCase().includes(term) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(term))
    );
    return matchesName || matchesDate || matchesServices;
  });

  // Totales generales
  const totalPendingGlobal = pendingStylists.reduce((sum, s) => sum + s.total_pending_amount, 0);
  const completedPayouts = payouts.filter((p) => p.status === 'completed');
  const totalPaidGlobal = completedPayouts.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* TARJETA DE RESUMEN SUPERIOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Total por pagar
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(totalPendingGlobal)}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {pendingStylists.length} {pendingStylists.length === 1 ? 'profesional con saldo' : 'profesionales con saldo'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Total histórico pagado
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totalPaidGlobal)}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {payouts.length} {payouts.length === 1 ? 'liquidación registrada' : 'liquidaciones registradas'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Estado de sincronización
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1">
              {refreshing ? 'Actualizando datos...' : 'Base de datos al día'}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Transacciones seguras en SQLite
            </span>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* DISPOSICIÓN EN DOS SECCIONES CLARAMENTE DIFERENCIADAS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ================================================================= */}
        {/* SECCIÓN A: "POR PAGAR"                                            */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
          {/* CABECERA DE LA SECCIÓN */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Por pagar
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    {pendingStylists.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Profesionales con servicios pendientes de liquidación
                </p>
              </div>
            </div>

            {/* BÚSQUEDA */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Buscar estilista..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* LISTA DE ESTILISTAS PENDIENTES */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando servicios pendientes...</div>
          ) : filteredPending.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No hay pagos pendientes</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {pendingSearch.trim()
                  ? 'No se encontraron estilistas con los términos buscados.'
                  : 'Todos los estilistas están al día con sus liquidaciones de servicios.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((st) => {
                const isExpanded = Boolean(expandedPending[st.stylist_id]);
                const isPaying = payingStylistId === st.stylist_id;

                return (
                  <div
                    key={st.stylist_id}
                    className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* CABECERA DE LA TARJETA (CLICKABLE: UN CLIC ABRE, OTRO CIERRA) */}
                    <div
                      onClick={() => handleTogglePending(st.stylist_id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition"
                      title={isExpanded ? 'Haga clic para ocultar detalles' : 'Haga clic para ver servicios pendientes'}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {st.stylist_name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {st.stylist_name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                              {st.pending_services_count} {st.pending_services_count === 1 ? 'servicio' : 'servicios'}
                            </span>
                            {st.stylist_email && (
                              <span className="text-[11px] text-slate-400 truncate hidden md:inline">
                                {st.stylist_email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* MONTO PENDIENTE E INDICADOR */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Importe pendiente
                          </span>
                          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                            {formatCurrency(st.total_pending_amount)}
                          </span>
                        </div>

                        <div className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DETALLE DESPLEGABLE DE LOS SERVICIOS PENDIENTES */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-slate-950/40 animate-in fade-in duration-150 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pb-1">
                          <span>Servicios pendientes a liquidar</span>
                          <span>{st.services.length} registros</span>
                        </div>

                        {/* LISTADO DE SERVICIOS */}
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {st.services.map((srv) => (
                            <div
                              key={srv.commission_id}
                              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {srv.service_name}
                                  </span>
                                  {srv.invoice_number && (
                                    <span className="text-[10px] font-mono text-slate-400">
                                      #{srv.invoice_number}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {srv.customer_name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {formatDate(srv.service_date)}
                                  </span>
                                  {srv.commission_rate !== null && (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                      Comisión: {srv.commission_rate}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* IMPORTES: COBRADO VS A PAGAR & ACCIÓN DE ELIMINAR */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] text-slate-400 block">Cobrado al cliente</span>
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                                    {formatCurrency(srv.service_price)}
                                  </span>
                                </div>
                                <div className="h-6 w-px bg-slate-200 dark:border-slate-800 hidden sm:block" />
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                                      A pagar
                                    </span>
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">
                                      {formatCurrency(srv.amount_to_pay)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteOneModal(st, srv)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer ml-1"
                                    title="Excluir este servicio de la liquidación del profesional"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* RESUMEN AL FINAL DE LA LISTA */}
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            <span>Cantidad total: </span>
                            <strong className="text-slate-900 dark:text-white">
                              {st.pending_services_count} servicios pendientes
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 mr-2">Total a pagar al estilista:</span>
                            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                              {formatCurrency(st.total_pending_amount)}
                            </span>
                          </div>
                        </div>

                        {/* BOTONES DE ACCIÓN: "ELIMINAR TODOS LOS PENDIENTES" Y "PAGAR AHORA" */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteAllModal(st)}
                            className="w-full sm:w-auto px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/60 transition cursor-pointer flex items-center justify-center gap-1.5"
                            title="Eliminar todos los servicios pendientes de este estilista con autorización"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar todos los pendientes</span>
                          </button>

                          <Button
                            type="button"
                            onClick={(e) => handleExecutePayout(st, e)}
                            isLoading={isPaying}
                            disabled={isPaying || Boolean(payingStylistId)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                          >
                            <Banknote className="w-4 h-4" />
                            Pagar ahora ({formatCurrency(st.total_pending_amount)})
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECCIÓN B: "PAGADOS" (HISTORIAL DE PAGOS INDEPENDIENTES)           */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
          {/* CABECERA DE LA SECCIÓN */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Pagados
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    {payouts.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registro histórico de liquidaciones confirmadas
                </p>
              </div>
            </div>

            {/* BÚSQUEDA */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Buscar en historial..."
                value={paidSearch}
                onChange={(e) => setPaidSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* LISTA DE PAGOS REALIZADOS */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando historial de pagos...</div>
          ) : filteredPayouts.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Sin pagos registrados</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {paidSearch.trim()
                  ? 'No se encontraron pagos con los términos buscados.'
                  : 'Aún no se han ejecutado liquidaciones a estilistas.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayouts.map((p) => {
                const isExpanded = Boolean(expandedPaid[p.id]);
                const isCancelled = p.status === 'cancelled';

                return (
                  <div
                    key={p.id}
                    className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                      isCancelled
                        ? 'border-rose-200 dark:border-rose-900/40 bg-slate-50/50 dark:bg-slate-950/40 opacity-85'
                        : isExpanded
                        ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* CABECERA DEL PAGO (CLICKABLE: UN CLIC ABRE, OTRO CIERRA) */}
                    <div
                      onClick={() => handleTogglePaid(p.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition"
                      title={isExpanded ? 'Haga clic para ocultar detalles' : 'Haga clic para ver servicios abonados'}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 ${
                            isCancelled
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {isCancelled ? <RotateCcw className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {p.stylist_name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isCancelled
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                              }`}
                            >
                              {isCancelled
                                ? 'Pago revertido'
                                : `${p.services_count} ${p.services_count === 1 ? 'servicio' : 'servicios'}`}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {formatDate(p.created_at)}
                            {p.notes && <span className="ml-2 text-slate-500">· {p.notes}</span>}
                          </span>
                        </div>
                      </div>

                      {/* MONTO PAGADO, BOTÓN REVERTIR E INDICADOR */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isCancelled ? 'Monto revertido' : 'Total abonado'}
                          </span>
                          <span
                            className={`text-base font-extrabold font-mono ${
                              isCancelled
                                ? 'text-slate-400 dark:text-slate-500 line-through'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatCurrency(p.total_amount)}
                          </span>
                        </div>

                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRevertModal(p);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            title="Revertir este pago y devolver sus servicios a pendientes"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Revertir pago</span>
                          </button>
                        )}

                        <div className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DETALLE DESPLEGABLE DE LOS SERVICIOS DEL PAGO */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-slate-950/40 animate-in fade-in duration-150 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pb-1">
                          <span>
                            {isCancelled ? 'Servicios de este pago (revertidos a pendientes)' : 'Servicios abonados en esta operación'}
                          </span>
                          <span>{p.services.length} registros históricos</span>
                        </div>

                        {/* LISTADO HISTÓRICO DE SERVICIOS */}
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {p.services.map((srv) => (
                            <div
                              key={srv.id}
                              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="space-y-1 flex-1">
                                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                  {srv.service_name}
                                </span>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {srv.customer_name || 'Consumidor Final'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {formatDate(srv.service_date)}
                                  </span>
                                  {srv.commission_rate !== null && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      Comisión: {srv.commission_rate}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* IMPORTES HISTÓRICOS */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] text-slate-400 block">Cobrado al cliente</span>
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                                    {formatCurrency(srv.service_price)}
                                  </span>
                                </div>
                                <div className="h-6 w-px bg-slate-200 dark:border-slate-800 hidden sm:block" />
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                    Importe abonado
                                  </span>
                                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                    {formatCurrency(srv.amount_paid)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* RESUMEN AL FINAL DE LA LISTA */}
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="text-slate-600 dark:text-slate-300">
                            <span>Cantidad de servicios: </span>
                            <strong className="text-slate-900 dark:text-white">
                              {p.services_count} servicios
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 mr-2">Importe histórico total:</span>
                            <span
                              className={`text-base font-extrabold font-mono ${
                                isCancelled ? 'text-slate-400 line-through' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {formatCurrency(p.total_amount)}
                            </span>
                          </div>
                        </div>

                        {/* BOTÓN REVERTIR EN PIE DESPLEGABLE */}
                        {!isCancelled && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenRevertModal(p)}
                              className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Revertir pago</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 3.1: REVERTIR PAGO HISTÓRICO                                        */}
      {/* ========================================================================= */}
      {revertingPayout && (
        <Modal
          isOpen={true}
          onClose={() => setRevertingPayout(null)}
          title="Revertir Pago al Profesional"
          subtitle={`Liquidación para ${revertingPayout.stylist_name} · ${formatCurrency(revertingPayout.total_amount)}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmRevertPayout} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold">¿Deseas revertir este pago histórico?</p>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  Esta operación anulará el comprobante de liquidación y regresará automáticamente los{' '}
                  <strong>{revertingPayout.services_count} servicios abonados</strong> (por un total de{' '}
                  <strong>{formatCurrency(revertingPayout.total_amount)}</strong>) a la sección de{' '}
                  <strong>Por pagar</strong> de {revertingPayout.stylist_name}.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Contraseña de Administrador <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Ingresa la contraseña de admin para autorizar"
                value={adminPasswordRevert}
                onChange={(e) => setAdminPasswordRevert(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Motivo de la reversión (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Error en importe liquidado, ajuste de servicios..."
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setRevertingPayout(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmittingRevert}
                disabled={isSubmittingRevert || !adminPasswordRevert.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirmar Reversión
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3.2: ELIMINAR UN SERVICIO PENDIENTE INDIVIDUAL                      */}
      {/* ========================================================================= */}
      {deletingCommission && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingCommission(null)}
          title="Excluir Servicio de la Liquidación"
          subtitle={`Profesional: ${deletingCommission.stylistName}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmDeleteOneCommission} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-bold">¿Deseas excluir este servicio pendiente?</p>
                <div className="bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Servicio:</span>
                    <strong className="text-slate-900 dark:text-white">{deletingCommission.item.service_name}</strong>
                  </div>
                  {deletingCommission.item.invoice_number && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ticket de venta:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">#{deletingCommission.item.invoice_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cliente:</span>
                    <span className="text-slate-700 dark:text-slate-300">{deletingCommission.item.customer_name}</span>
                  </div>
                  <div className="flex justify-between border-t border-rose-100 dark:border-rose-900/40 pt-1">
                    <span className="text-slate-500 font-semibold">Comisión a excluir:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">
                      {formatCurrency(deletingCommission.item.amount_to_pay)}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Nota: La venta original no se verá afectada; únicamente se anula o excluye la comisión pendiente para el estilista.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Contraseña de Administrador <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Ingresa la contraseña de admin para autorizar"
                value={adminPasswordDeleteOne}
                onChange={(e) => setAdminPasswordDeleteOne(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Motivo de la exclusión (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Servicio cancelado, error de asignación..."
                value={deleteOneReason}
                onChange={(e) => setDeleteOneReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setDeletingCommission(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmittingDeleteOne}
                disabled={isSubmittingDeleteOne || !adminPasswordDeleteOne.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Excluir Servicio
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3.3: ELIMINAR TODOS LOS PENDIENTES DE UN ESTILISTA                  */}
      {/* ========================================================================= */}
      {deletingAllStylist && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingAllStylist(null)}
          title="Eliminar Todos los Pendientes"
          subtitle={`Profesional: ${deletingAllStylist.stylist_name}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmDeleteAllCommissions} className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <h4 className="font-bold text-sm">¿Confirmas la eliminación masiva de pendientes?</h4>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Esta acción eliminará de forma permanente todos los servicios pendientes de{' '}
                  <strong>{deletingAllStylist.stylist_name}</strong>:
                </p>
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cantidad total de servicios:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {deletingAllStylist.pending_services_count} servicios
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-rose-100 dark:border-rose-900/40 pt-1.5">
                    <span className="text-slate-500 font-bold">Importe total a eliminar:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono text-base">
                      {formatCurrency(deletingAllStylist.total_pending_amount)}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  El saldo acumulado del estilista pasará inmediatamente a ₲ 0. Las ventas originales no serán modificadas y la acción quedará registrada en el registro de auditoría.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Contraseña de Administrador <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Ingresa la contraseña de admin para autorizar"
                value={adminPasswordDeleteAll}
                onChange={(e) => setAdminPasswordDeleteAll(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Motivo de la eliminación masiva (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Liquidación manual externa, anulación acordada..."
                value={deleteAllReason}
                onChange={(e) => setDeleteAllReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setDeletingAllStylist(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmittingDeleteAll}
                disabled={isSubmittingDeleteAll || !adminPasswordDeleteAll.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Eliminar Todos los Pendientes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
