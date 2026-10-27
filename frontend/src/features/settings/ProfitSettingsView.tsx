import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settings.service';
import { ServiceWithMargins, StylistMarginStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Settings,
  Percent,
  Lock,
  ChevronDown,
  ChevronUp,
  User,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Sliders,
  Palette,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const ProfitSettingsView: React.FC = () => {
  const { user, notify } = useApp();
  const [generalMargin, setGeneralMargin] = useState<number>(60);
  const [services, setServices] = useState<ServiceWithMargins[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estado de tarjetas desplegadas por servicio (soporta múltiples tarjetas abiertas)
  const [expandedServiceIds, setExpandedServiceIds] = useState<Record<string, boolean>>({});

  /**
   * REGLA 6: Comparación numérica centralizada normalizada para márgenes.
   * Evita discrepancias causadas por cadenas como '50', '50.0' o '50.00'.
   */
  const isMarginDifferentFromGeneral = (val: number | string | null | undefined, general: number): boolean => {
    if (val === null || val === undefined || val === '') return false;
    const numVal = Number(val);
    if (isNaN(numVal)) return false;
    return Math.abs(numVal - general) > 0.001;
  };

  // =========================================================================
  // 1. MODAL DEL MARGEN GENERAL (FLUJO DE DOS MODALES INDEPENDIENTES)
  // =========================================================================
  // Modal 1: Modificar Porcentaje (Extremadamente sencillo, campo grande estilo POS)
  const [isFirstModalOpen, setIsFirstModalOpen] = useState<boolean>(false);
  const [tempGeneralMargin, setTempGeneralMargin] = useState<number | string>(60);
  const [firstModalError, setFirstModalError] = useState<string>('');

  // Modal 2: Confirmar con Contraseña
  const [isSecondModalOpen, setIsSecondModalOpen] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [savingGeneral, setSavingGeneral] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');

  // =========================================================================
  // 2. MODAL DE CONFIGURACIÓN INDIVIDUAL DE ESTILISTA
  // =========================================================================
  const [isStylistModalOpen, setIsStylistModalOpen] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<ServiceWithMargins | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<StylistMarginStatus | null>(null);
  const [stylistMarginInput, setStylistMarginInput] = useState<number | string>(60);
  const [stylistIsActive, setStylistIsActive] = useState<boolean>(true);
  const [savingStylist, setSavingStylist] = useState<boolean>(false);
  const [stylistError, setStylistError] = useState<string>('');

  // =========================================================================
  // 3. MODAL DE ADVERTENCIA PARA ACTIVACIÓN INVÁLIDA (PORCENTAJE IGUAL AL GENERAL)
  // =========================================================================
  const [isInvalidActivationModalOpen, setIsInvalidActivationModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadData(false);
  }, []);

  /**
   * Carga los datos de configuración.
   * @param silent Si es true, realiza la recarga sin desmontar el DOM ni reiniciar el scroll.
   */
  const loadData = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const [settingsData, servicesData] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getServicesMargins(),
      ]);
      const currentGenMargin = settingsData.default_profit_margin_percent ?? 60;
      setGeneralMargin(currentGenMargin);
      setTempGeneralMargin(currentGenMargin);
      setServices(servicesData || []);
    } catch (err: any) {
      notify('Error al cargar configuración de ganancias: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // 1. MANEJADORES DEL MARGEN GENERAL (MODAL 1 -> MODAL 2)
  // -------------------------------------------------------------------------
  const handleOpenFirstModal = () => {
    setTempGeneralMargin(generalMargin);
    setFirstModalError('');
    setIsFirstModalOpen(true);
  };

  const handleConfirmFirstModal = (e: React.FormEvent) => {
    e.preventDefault();
    setFirstModalError('');

    const val = Number(tempGeneralMargin);
    if (tempGeneralMargin === '' || isNaN(val)) {
      setFirstModalError('Debe ingresar un porcentaje numérico válido.');
      return;
    }
    if (val < 0 || val > 100) {
      setFirstModalError('El porcentaje debe estar entre 0% y 100%.');
      return;
    }

    // Cerrar primer modal y abrir segundo modal de confirmación con contraseña
    setIsFirstModalOpen(false);
    setAdminPassword('');
    setPasswordError('');
    setIsSecondModalOpen(true);
  };

  const handleConfirmSecondModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!adminPassword.trim()) {
      setPasswordError('Debe ingresar la contraseña de administrador para confirmar.');
      return;
    }

    try {
      setSavingGeneral(true);
      const res = await settingsService.updateGeneralMargin(Number(tempGeneralMargin), adminPassword);
      setGeneralMargin(res.default_profit_margin_percent);
      setIsSecondModalOpen(false);
      setAdminPassword('');
      notify('Margen general de ganancia actualizado correctamente', 'success');
      await loadData(true); // Refresco silencioso sin perder scroll
    } catch (err: any) {
      setPasswordError(err.message || 'Contraseña de administrador incorrecta.');
    } finally {
      setSavingGeneral(false);
    }
  };

  // -------------------------------------------------------------------------
  // 2. ACTIVAR O DESACTIVAR CONFIGURACIÓN PARTICULAR (SIN TOASTS NI SALTO)
  // -------------------------------------------------------------------------
  const handleToggleCustom = async (service: ServiceWithMargins, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que el clic en el switch active el toggle de la tarjeta
    const newStatus = !service.custom_margin_active;

    // 1. Actualización optimista inmediata en memoria (sin remontar DOM)
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, custom_margin_active: newStatus } : s))
    );

    // 2. Si se activa, desplegar directamente para ver los estilistas
    if (newStatus) {
      setExpandedServiceIds((prev) => ({ ...prev, [service.id]: true }));
    }

    try {
      // 3. Persistir en la base de datos de fondo
      await settingsService.toggleServiceCustom(service.id, newStatus);
      // REQUISITO 6: Sin notificaciones emergentes de éxito al activar/desactivar
      // REQUISITO 5: Refresco silencioso en segundo plano sin reiniciar scroll
      await loadData(true);
    } catch (err: any) {
      // Notificar únicamente si ocurre un error real
      notify('Error al actualizar configuración del servicio: ' + err.message, 'error');
      await loadData(true);
    }
  };

  // -------------------------------------------------------------------------
  // 3. CLIC EN LA TARJETA DEL SERVICIO: DESPLEGAR / CONTRAER ESTILISTAS
  // -------------------------------------------------------------------------
  const handleCardClick = (service: ServiceWithMargins) => {
    // Si la configuración particular está desactivada, no se despliega la lista
    if (!service.custom_margin_active) {
      return;
    }

    // Alternar visualización de estilistas de forma fluida
    setExpandedServiceIds((prev) => ({
      ...prev,
      [service.id]: !prev[service.id],
    }));
  };

  // -------------------------------------------------------------------------
  // 4. CONFIGURACIÓN INDIVIDUAL DE ESTILISTA
  // -------------------------------------------------------------------------
  const handleOpenStylistModal = (service: ServiceWithMargins, stylist: StylistMarginStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedService(service);
    setSelectedStylist(stylist);

    const initialVal = stylist.profit_margin_percent !== null && stylist.profit_margin_percent !== undefined
      ? stylist.profit_margin_percent
      : generalMargin;
    setStylistMarginInput(initialVal);

    // REGLA 1 & 6: Si el porcentaje es igual al margen general, la configuración individual
    // se considera inactiva / margen general. Solo es individual activa si es diferente y está activa.
    const isDiff = isMarginDifferentFromGeneral(initialVal, generalMargin);
    setStylistIsActive(Boolean(stylist.is_active && isDiff));
    setStylistError('');
    setIsStylistModalOpen(true);
  };

  /**
   * REGLAS 2 & 3: Sincronización automática mientras se escribe el porcentaje.
   * Si es igual al margen general -> auto-desactivar configuración individual.
   * Si es diferente del margen general -> auto-activar configuración individual.
   */
  const handleStylistMarginInputChange = (newVal: string) => {
    setStylistMarginInput(newVal);
    if (newVal !== '' && !isNaN(Number(newVal))) {
      const isDiff = isMarginDifferentFromGeneral(newVal, generalMargin);
      setStylistIsActive(isDiff);
    }
  };

  /**
   * REGLA 4 & 5: Validación del interruptor en el modal de estilista.
   * Al intentar activar con un porcentaje igual al general, bloquear y mostrar modal.
   * Al desactivar manualmente, permitir pasar a Margen general sin alterar el valor numérico.
   */
  const handleToggleStylistSwitchInModal = () => {
    if (!stylistIsActive) {
      if (!isMarginDifferentFromGeneral(stylistMarginInput, generalMargin)) {
        setIsInvalidActivationModalOpen(true);
        return;
      }
      setStylistIsActive(true);
    } else {
      setStylistIsActive(false);
    }
  };

  /**
   * REGLAS 4 & 5: Interruptor rápido directo en la tarjeta del estilista.
   * Sin notificaciones de éxito y sin saltos de scroll.
   */
  const handleToggleStylistQuick = async (
    service: ServiceWithMargins,
    stylist: StylistMarginStatus,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const isDifferent = isMarginDifferentFromGeneral(stylist.profit_margin_percent, generalMargin);
    const currentlyActive = Boolean(stylist.has_custom_margin && stylist.is_active && isDifferent);

    if (!currentlyActive) {
      if (!isDifferent) {
        setIsInvalidActivationModalOpen(true);
        return;
      }
      try {
        await settingsService.toggleStylistActive(service.id, stylist.stylist_id, true);
        await loadData(true);
      } catch (err: any) {
        notify(err.message || 'Error al activar porcentaje individual', 'error');
      }
    } else {
      try {
        await settingsService.toggleStylistActive(service.id, stylist.stylist_id, false);
        await loadData(true);
      } catch (err: any) {
        notify(err.message || 'Error al desactivar porcentaje individual', 'error');
      }
    }
  };

  const handleSaveStylistConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedStylist) return;
    setStylistError('');

    const val = Number(stylistMarginInput);
    if (stylistMarginInput === '' || isNaN(val)) {
      setStylistError('Debe ingresar un porcentaje numérico válido.');
      return;
    }
    if (val < 0 || val > 100) {
      setStylistError('El porcentaje debe estar entre 0% y 100%.');
      return;
    }

    const isDiff = isMarginDifferentFromGeneral(val, generalMargin);
    const targetIsActive = isDiff ? stylistIsActive : false;

    try {
      setSavingStylist(true);
      await settingsService.setStylistMargin(
        selectedService.id,
        selectedStylist.stylist_id,
        val,
        targetIsActive
      );
      setIsStylistModalOpen(false);
      // REQUISITO 8 & 14: Actualizar silenciosamente preservando la posición exacta de desplazamiento
      await loadData(true);
    } catch (err: any) {
      setStylistError(err.message || 'Error al guardar configuración.');
    } finally {
      setSavingStylist(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-slate-50 dark:bg-slate-950">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Acceso Restringido</h2>
        <p className="text-xs text-slate-500 max-w-md">
          Esta sección está reservada exclusivamente para el Administrador del salón.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-200">
      {/* CABECERA EXCLUSIVA DEL MÓDULO MÁRGENES DE GANANCIA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Márgenes de Ganancia
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administración de porcentajes de rentabilidad general y particular por servicio
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-6xl">
        {/* ================================================================= */}
        {/* 1. TARJETA DE MARGEN DE GANANCIA GENERAL PREDETERMINADO (CLICKABLE) */}
        {/* ================================================================= */}
            <div
              onClick={handleOpenFirstModal}
          className="group relative bg-white dark:bg-slate-900/90 border-2 border-indigo-100 dark:border-indigo-950/60 hover:border-indigo-500 dark:hover:border-indigo-500/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
          title="Haga clic para modificar el margen general"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Settings className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Margen de Ganancia General Predeterminado
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Este porcentaje se aplica de forma predeterminada a todos los servicios que no tengan configurado un
                margen individual. Modificar este valor aplicará a futuras ventas sin alterar el registro histórico.
              </p>
            </div>

            {/* VALOR ACTUAL DESTACADO */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:px-6">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                  Porcentaje Vigente
                </span>
                <span className="text-3xl md:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  {generalMargin}%
                </span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
              <button
                type="button"
                className="px-3 py-2 bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                Modificar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. SECCIÓN: MÁRGENES PARTICULARES POR SERVICIO                    */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Márgenes particulares por servicio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Haz clic en una tarjeta activa para desplegar y configurar a los estilistas.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {services.length} servicios en catálogo
            </span>
          </div>

          {/* LISTADO DE SERVICIOS */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando catálogo de servicios...</div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No hay servicios registrados en el sistema.</div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const isCustom = service.custom_margin_active;
                const isExpanded = Boolean(expandedServiceIds[service.id]);
                const configuredStylistsCount = service.stylists.filter(
                  (st) => st.has_custom_margin && st.is_active && isMarginDifferentFromGeneral(st.profit_margin_percent, generalMargin)
                ).length;

                return (
                  <div
                    key={service.id}
                    className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                      isCustom
                        ? isExpanded
                          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs'
                          : 'border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900/90 hover:border-indigo-300 dark:hover:border-indigo-700'
                        : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 opacity-90'
                    }`}
                  >
                    {/* CABECERA / TARJETA DEL SERVICIO (CLICKABLE SI ESTÁ ACTIVO) */}
                    <div
                      onClick={() => handleCardClick(service)}
                      className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition select-none ${
                        isCustom
                          ? 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                          : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition ${
                            isCustom
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {service.name[0]}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{service.name}</h4>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              • {formatCurrency(service.price)}
                            </span>
                            {service.category_name && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {service.category_name}
                              </span>
                            )}
                          </div>

                          {/* ESTADO VISUAL CLARO */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isCustom
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            >
                              {isCustom ? 'Configuración Particular: Activa' : 'Configuración Particular: Inactiva'}
                            </span>

                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {isCustom
                                ? `${configuredStylistsCount} de ${service.stylists.length} estilistas con porcentaje individual configurado`
                                : `Utiliza el margen general predeterminado (${generalMargin}%)`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CONTROLES: INTERRUPTOR Y FLECHA INDICADORA */}
                      <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                        {/* INTERRUPTOR (SWITCH DIRECTO) */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 select-none">
                            {isCustom ? 'Activado' : 'Desactivado'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleCustom(service, e)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isCustom ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            role="switch"
                            aria-checked={isCustom}
                            title={isCustom ? 'Desactivar configuración particular' : 'Activar configuración particular'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isCustom ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* FLECHA INDICADORA DE DESPLIEGUE (SOLO CUANDO ESTÁ ACTIVO) */}
                        {isCustom ? (
                          <div
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs font-semibold transition"
                            title={isExpanded ? 'Haga clic para ocultar estilistas' : 'Haga clic para ver estilistas'}
                          >
                            <span className="text-[11px] font-medium hidden sm:inline">
                              {isExpanded ? 'Ocultar' : 'Estilistas'}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        ) : (
                          <div className="w-6" />
                        )}
                      </div>
                    </div>

                    {/* ======================================================= */}
                    {/* LISTA DESPLEGABLE DE TODOS LOS ESTILISTAS ACTIVOS        */}
                    {/* ======================================================= */}
                    {isCustom && isExpanded && (
                      <div className="border-t border-indigo-100 dark:border-indigo-900/40 p-4 sm:p-5 bg-white/70 dark:bg-slate-900/70 rounded-b-2xl animate-in fade-in duration-200">
                        <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            Estilistas disponibles para «{service.name}»
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            Haz clic en cualquier estilista para definir o modificar su porcentaje
                          </span>
                        </div>

                        {/* GRID DE TODOS LOS ESTILISTAS ACTIVOS (SIN ASIGNACIONES AUTOMÁTICAS) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {service.stylists.map((st) => {
                            const hasIndividualConfig = Boolean(st.has_custom_margin && st.profit_margin_percent !== null);
                            const isDifferent = isMarginDifferentFromGeneral(st.profit_margin_percent, generalMargin);
                            const isIndividualActive = Boolean(hasIndividualConfig && st.is_active && isDifferent);
                            const appliedPercentage = isIndividualActive ? Number(st.profit_margin_percent) : generalMargin;
                            const stylistCommission = Math.max(0, 100 - appliedPercentage);

                            return (
                              <div
                                key={st.stylist_id}
                                onClick={(e) => handleOpenStylistModal(service, st, e)}
                                className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                                  isIndividualActive
                                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 hover:border-amber-400 hover:shadow-xs'
                                    : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'
                                }`}
                              >
                                <div>
                                  {/* ENCABEZADO DEL ESTILISTA */}
                                  <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center space-x-2.5">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                          isIndividualActive
                                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                            : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                        }`}
                                      >
                                        {st.stylist_name[0]}
                                      </div>
                                      <div>
                                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                          {st.stylist_name}
                                        </span>
                                      </div>
                                    </div>

                                    {/* INDICADOR: INDIVIDUAL O GENERAL + INTERRUPTOR RÁPIDO */}
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                          isIndividualActive
                                            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                            : 'bg-slate-200/70 text-slate-600 border-slate-300/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                        }`}
                                      >
                                        {isIndividualActive ? 'Individual' : 'Margen General'}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleStylistQuick(service, st, e)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                          isIndividualActive ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                        role="switch"
                                        aria-checked={isIndividualActive}
                                        title={
                                          isIndividualActive
                                            ? 'Desactivar configuración individual'
                                            : 'Activar configuración individual'
                                        }
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            isIndividualActive ? 'translate-x-4' : 'translate-x-0'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  {/* DETALLE DE PORCENTAJES */}
                                  <div className="space-y-1.5 my-2.5 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-500 dark:text-slate-400">Margen Salón:</span>
                                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        {appliedPercentage}%
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-500 dark:text-slate-400">Comisión Estilista:</span>
                                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                        {stylistCommission}%
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* ACCIÓN CLARA PARA ENTRAR A CONFIGURAR */}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                  <span>
                                    {isIndividualActive ? 'Modificar porcentaje' : 'Establecer porcentaje'}
                                  </span>
                                  <ArrowRight className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1.1 PRIMER MODAL: MODIFICAR EL PORCENTAJE (EXTREMADAMENTE SENCILLO) */}
      {/* ================================================================= */}
      {isFirstModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleConfirmFirstModal} className="space-y-5">
              {firstModalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{firstModalError}</span>
                </div>
              )}

              {/* CAMPO DE PORCENTAJE GIGANTE (REFERENCIA: CAMPO DE EFECTIVO DEL POS) */}
              <div className="relative flex items-center justify-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  autoFocus
                  required
                  placeholder="0"
                  value={tempGeneralMargin}
                  onChange={(e) => setTempGeneralMargin(e.target.value)}
                  className="w-full py-4 px-10 text-center text-3xl sm:text-4xl font-extrabold tracking-wide bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner transition"
                />
                <span className="absolute right-5 text-2xl font-bold text-slate-400 pointer-events-none select-none">
                  %
                </span>
              </div>

              {/* BOTONES EXCLUSIVOS DEL PRIMER MODAL */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFirstModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmar cambio
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 1.3 SEGUNDO MODAL: CONFIRMAR CON CONTRASEÑA                        */}
      {/* ================================================================= */}
      {isSecondModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-4 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Confirmar cambio
            </h3>

            <form onSubmit={handleConfirmSecondModal} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* CAMPO DE CONTRASEÑA CÓMODO Y VISUALMENTE COHERENTE */}
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3.5 px-6 text-center text-xl sm:text-2xl font-bold tracking-widest bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner transition"
                />
              </div>

              {/* BOTONES: CANCELAR Y CONFIRMAR */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingGeneral}
                  onClick={() => {
                    setIsSecondModalOpen(false);
                    setAdminPassword('');
                  }}
                  className="w-full py-2.5 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={savingGeneral}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. MODAL DE CONFIGURACIÓN INDIVIDUAL DE CADA ESTILISTA            */}
      {/* ================================================================= */}
      {isStylistModalOpen && selectedService && selectedStylist && (
        <Modal
          isOpen={isStylistModalOpen}
          onClose={() => setIsStylistModalOpen(false)}
          title={`Configuración de Porcentaje: ${selectedStylist.stylist_name}`}
          subtitle={`Servicio: ${selectedService.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveStylistConfig} className="space-y-4 pt-1">
            {stylistError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{stylistError}</span>
              </div>
            )}

            {/* INFORMACIÓN DEL ESTILISTA Y SERVICIO */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Servicio:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedService.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Estilista:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedStylist.stylist_name}
                </span>
              </div>
            </div>

            {/* INTERRUPTOR: ACTIVAR O DESACTIVAR PORCENTAJE INDIVIDUAL */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Estado de la configuración individual
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stylistIsActive
                    ? 'Porcentaje individual activo para este estilista.'
                    : `Desactivado: utilizará el margen general (${generalMargin}%).`}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleStylistSwitchInModal}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  stylistIsActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={stylistIsActive}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    stylistIsActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* CAMPO NUMÉRICO PARA EL PORCENTAJE (SIEMPRE EDITABLE Y CONSERVADO) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Porcentaje de Ganancia del Salón (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  autoFocus
                  value={stylistMarginInput}
                  onChange={(e) => handleStylistMarginInputChange(e.target.value)}
                  placeholder="Porcentaje de ganancia"
                  className={`w-full px-4 py-3 pr-8 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:border-indigo-500 transition ${
                    stylistIsActive
                      ? 'border-slate-300 dark:border-slate-800'
                      : 'border-slate-200 dark:border-slate-800/60 opacity-60'
                  }`}
                />
                <Percent className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <div className="mt-2 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <p>
                  Comisión resultante para el profesional:{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    {stylistIsActive
                      ? `${Math.max(0, 100 - Number(stylistMarginInput || 0))}%`
                      : `${Math.max(0, 100 - generalMargin)}% (Margen general)`}
                  </strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  Desactivar esta opción conserva el valor guardado para cuando se vuelva a activar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStylistModalOpen(false)}
                disabled={savingStylist}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={savingStylist} className="bg-indigo-600 hover:bg-indigo-700">
                Guardar cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================= */}
      {/* 4. MODAL INFORMATIVO: ACTIVACIÓN NO VÁLIDA (PORCENTAJE IGUAL AL GENERAL) */}
      {/* ================================================================= */}
      {isInvalidActivationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Porcentaje no válido para configuración individual
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              El porcentaje individual debe ser diferente del margen de ganancia general para activar esta configuración. Modificá el porcentaje antes de continuar.
            </p>
            <Button
              type="button"
              onClick={() => setIsInvalidActivationModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
