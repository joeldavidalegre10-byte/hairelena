import React, { useEffect, useState } from 'react';
import {
  HandCoins,
  Settings,
  ArrowRight,
  Sliders,
  User,
  Lock,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { utilitiesService } from '../../services/utilities.service';
import { UtilityConfig, UtilityRecord, UtilityServiceConfig } from '../../types';
import { formatCurrency, formatParaguayThousands, parseParaguayNumber, formatDate } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

const Switch: React.FC<{ checked: boolean; onChange: () => void; title?: string; disabled?: boolean }> = ({
  checked,
  onChange,
  title,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    title={title}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
      checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', paid: 'Pagada', cancelled: 'Cancelada' };
const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export const UtilitySettingsView: React.FC = () => {
  const { notify } = useApp();
  const [config, setConfig] = useState<UtilityConfig | null>(null);
  const [records, setRecords] = useState<UtilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  // Modal monto general (monto + contraseña de administrador, igual que el margen general)
  const [generalOpen, setGeneralOpen] = useState(false);
  const [generalInput, setGeneralInput] = useState('');
  const [generalPassword, setGeneralPassword] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  // Cambio de interruptor general pendiente de confirmar con contraseña
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

  // Modal monto por servicio
  const [editing, setEditing] = useState<UtilityServiceConfig | null>(null);
  const [serviceInput, setServiceInput] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [savingService, setSavingService] = useState(false);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [cfg, list] = await Promise.all([utilitiesService.getConfig(), utilitiesService.list()]);
      setConfig(cfg);
      setRecords(list || []);
    } catch (err: any) {
      notify('Error al cargar la configuración de utilidad: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  if (loading || !config) {
    return <div className="p-6 text-xs text-slate-400">Cargando configuración de utilidad...</div>;
  }

  const { general, services, stylists, summary } = config;

  /* ---------------- General ---------------- */
  const openGeneral = () => {
    setGeneralInput(general.amount ? formatParaguayThousands(general.amount) : '');
    setGeneralPassword('');
    setGeneralError('');
    setPendingToggle(null);
    setGeneralOpen(true);
  };

  const requestToggleGeneral = () => {
    setGeneralInput(general.amount ? formatParaguayThousands(general.amount) : '');
    setGeneralPassword('');
    setGeneralError('');
    setPendingToggle(!general.enabled);
    setGeneralOpen(true);
  };

  const saveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    if (!generalPassword.trim()) {
      setGeneralError('Debe ingresar la contraseña de administrador para confirmar.');
      return;
    }
    const amount = parseParaguayNumber(generalInput);
    if (pendingToggle === null && generalInput.trim() === '') {
      setGeneralError('Ingrese el monto de utilidad general.');
      return;
    }
    try {
      setSavingGeneral(true);
      await utilitiesService.updateGeneral(
        pendingToggle === null ? { amount } : { enabled: pendingToggle },
        generalPassword
      );
      setGeneralOpen(false);
      notify(
        pendingToggle === null
          ? 'Monto de utilidad general actualizado correctamente'
          : pendingToggle
            ? 'Utilidad general activada'
            : 'Utilidad general desactivada',
        'success'
      );
      await load(true);
    } catch (err: any) {
      setGeneralError(err.message || 'No se pudo guardar.');
    } finally {
      setSavingGeneral(false);
    }
  };

  /* ---------------- Servicios ---------------- */
  const openService = (srv: UtilityServiceConfig) => {
    setEditing(srv);
    setServiceInput(srv.specific_amount ? formatParaguayThousands(srv.specific_amount) : '');
    setServiceError('');
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const amount = parseParaguayNumber(serviceInput);
    if (amount <= 0) {
      setServiceError('Ingrese un monto mayor a 0.');
      return;
    }
    try {
      setSavingService(true);
      await utilitiesService.setServiceConfig(editing.id, { amount, is_enabled: true });
      setEditing(null);
      notify(`Utilidad de «${editing.name}» guardada`, 'success');
      await load(true);
    } catch (err: any) {
      setServiceError(err.message || 'No se pudo guardar.');
    } finally {
      setSavingService(false);
    }
  };

  const useGeneral = async (srv: UtilityServiceConfig) => {
    try {
      await utilitiesService.removeServiceConfig(srv.id);
      await load(true);
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  const toggleServiceAllowed = async (srv: UtilityServiceConfig) => {
    try {
      if (srv.mode === 'disabled') {
        // Volver a permitir: usa el monto específico guardado o el general
        if (srv.specific_amount && srv.specific_amount > 0) {
          await utilitiesService.setServiceConfig(srv.id, { is_enabled: true });
        } else {
          await utilitiesService.removeServiceConfig(srv.id);
        }
      } else {
        await utilitiesService.setServiceConfig(srv.id, {
          is_enabled: false,
          amount: srv.specific_amount ?? srv.effective_amount ?? 0,
        });
      }
      await load(true);
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  /* ---------------- Estilistas ---------------- */
  const toggleStylist = async (id: string, enabled: boolean) => {
    setConfig((prev) =>
      prev
        ? { ...prev, stylists: prev.stylists.map((s) => (s.id === id ? { ...s, can_receive_utility: enabled } : s)) }
        : prev
    );
    try {
      await utilitiesService.setStylistEnabled(id, enabled);
    } catch (err: any) {
      notify('Error al actualizar la estilista: ' + err.message, 'error');
      await load(true);
    }
  };

  const filtered = records.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [r.helper_stylist_name, r.main_stylist_name, r.service_name, r.invoice_number]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(term));
  });

  const generalHint = !general.enabled
    ? 'Desactivada: los servicios sin monto particular no generan utilidad.'
    : general.amount > 0
      ? 'Se aplica a los servicios sin monto particular.'
      : 'Sin monto configurado: no se genera utilidad hasta definir uno.';

  return (
    <div className="p-6 flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Utilidad
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ingreso extra para la estilista que ayuda a otra estilista en un servicio
        </p>
      </div>

      <div className="space-y-6 max-w-6xl">
        {/* RESUMEN */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes de pago', value: formatCurrency(summary.pending_total), sub: `${summary.pending_count} utilidades`, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Pagadas', value: formatCurrency(summary.paid_total), sub: `${summary.paid_count} utilidades`, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Canceladas', value: formatCurrency(summary.cancelled_total), sub: `${summary.cancelled_count} utilidades`, icon: AlertCircle, color: 'text-slate-500 dark:text-slate-400' },
            { label: 'Auxiliares habilitadas', value: String(stylists.filter((s) => s.can_receive_utility).length), sub: `de ${stylists.length} estilistas`, icon: User, color: 'text-indigo-600 dark:text-indigo-400' },
          ].map((c) => (
            <div key={c.label} className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                {c.label}
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-1">{c.value}</div>
              <div className="text-[11px] text-slate-500">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 1. UTILIDAD GENERAL */}
        <div className="group bg-white dark:bg-slate-900/90 border-2 border-indigo-100 dark:border-indigo-950/60 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Settings className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Utilidad general predeterminada</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    general.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {general.enabled ? 'Activa' : 'Desactivada'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Monto que recibe la estilista auxiliar en los servicios que no tienen un monto particular. Un monto
                particular siempre tiene prioridad (no se suman). Cambiarlo solo afecta a ventas nuevas.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{generalHint}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:px-6">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Monto vigente</span>
                <span className="text-2xl md:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatCurrency(general.amount)}
                </span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col items-center gap-2">
                <Switch checked={general.enabled} onChange={requestToggleGeneral} title="Activar o desactivar la utilidad general" />
                <button
                  type="button"
                  onClick={openGeneral}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  Modificar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. POR SERVICIO */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Utilidad por servicio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina un monto particular por servicio o indique que un servicio no permite utilidad.
            </p>
          </div>

          {services.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">No hay servicios registrados.</div>
          ) : (
            <div className="space-y-3">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    srv.mode === 'custom'
                      ? 'border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900/90'
                      : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{srv.name}</h4>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">• {formatCurrency(srv.price)}</span>
                      {srv.category_name && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {srv.category_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          srv.mode === 'custom'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : srv.mode === 'disabled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {srv.mode === 'custom' ? 'Monto particular' : srv.mode === 'disabled' ? 'No permite utilidad' : 'Usa utilidad general'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {srv.eligible ? `Auxiliar recibe ${formatCurrency(srv.effective_amount)}` : srv.reason}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2" title="Permite que una auxiliar reciba utilidad en este servicio">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Permite utilidad</span>
                      <Switch checked={srv.mode !== 'disabled'} onChange={() => toggleServiceAllowed(srv)} />
                    </div>
                    {srv.mode !== 'disabled' && (
                      <button
                        type="button"
                        onClick={() => openService(srv)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 hover:text-indigo-600 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {srv.mode === 'custom' ? 'Editar monto' : 'Monto particular'}
                      </button>
                    )}
                    {srv.mode === 'custom' && (
                      <button
                        type="button"
                        onClick={() => useGeneral(srv)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                      >
                        Usar general
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. ESTILISTAS */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Estilistas que pueden recibir utilidad
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Solo las habilitadas aparecen como estilista auxiliar en el punto de venta.
            </p>
          </div>
          {stylists.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No hay estilistas activas.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stylists.map((st) => (
                <div
                  key={st.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                    st.can_receive_utility
                      ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-50 dark:bg-[#1a1b2e] text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-[#2d3148] shrink-0">
                      {st.full_name[0]}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{st.full_name}</span>
                      <span className="text-[10px] text-slate-500">{st.can_receive_utility ? 'Habilitada como auxiliar' : 'No habilitada'}</span>
                    </div>
                  </div>
                  <Switch checked={st.can_receive_utility} onChange={() => toggleStylist(st.id, !st.can_receive_utility)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. UTILIDADES GENERADAS */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Utilidades generadas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Se pagan desde «Estilistas & Pagos», junto con las comisiones.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              {(['all', 'pending', 'paid', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                    statusFilter === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {f === 'all' ? 'Todas' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No hay utilidades para mostrar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Servicio</th>
                    <th className="py-2 pr-3">Principal</th>
                    <th className="py-2 pr-3">Auxiliar</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.sale_date || r.created_at)}</td>
                      <td className="py-2 pr-3">
                        <span className="font-semibold">{r.service_name}</span>
                        {r.invoice_number && <span className="block text-[10px] text-slate-400">{r.invoice_number}</span>}
                      </td>
                      <td className="py-2 pr-3">{r.main_stylist_name || '-'}</td>
                      <td className="py-2 pr-3 font-semibold">{r.helper_stylist_name || '-'}</td>
                      <td className="py-2 pr-3 text-right font-mono font-bold">{formatCurrency(r.amount)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CLASS[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: MONTO GENERAL / INTERRUPTOR */}
      <Modal
        isOpen={generalOpen}
        onClose={() => setGeneralOpen(false)}
        title={pendingToggle === null ? 'Monto de utilidad general' : pendingToggle ? 'Activar utilidad general' : 'Desactivar utilidad general'}
        subtitle="Aplica solo a ventas nuevas; las utilidades ya registradas no cambian."
      >
        <form onSubmit={saveGeneral} className="space-y-4">
          {pendingToggle === null && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Monto (₲)</label>
              <input
                autoFocus
                inputMode="numeric"
                value={generalInput}
                onChange={(e) => setGeneralInput(formatParaguayThousands(e.target.value))}
                placeholder="10.000"
                className="w-full px-3 py-3 text-2xl font-extrabold font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
              <Lock className="w-3 h-3" /> Contraseña de administrador
            </label>
            <input
              type="password"
              value={generalPassword}
              onChange={(e) => setGeneralPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          {generalError && <p className="text-xs text-rose-500 font-medium">{generalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setGeneralOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={savingGeneral}>Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: MONTO POR SERVICIO */}
      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Utilidad de «${editing.name}»` : ''}
        subtitle="Este monto reemplaza (no se suma a) la utilidad general."
      >
        <form onSubmit={saveService} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Monto para la auxiliar (₲)</label>
            <input
              autoFocus
              inputMode="numeric"
              value={serviceInput}
              onChange={(e) => setServiceInput(formatParaguayThousands(e.target.value))}
              placeholder="20.000"
              className="w-full px-3 py-3 text-2xl font-extrabold font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {serviceError && <p className="text-xs text-rose-500 font-medium">{serviceError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" isLoading={savingService}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
