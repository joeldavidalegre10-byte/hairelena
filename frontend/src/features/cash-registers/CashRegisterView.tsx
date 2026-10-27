import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { cashRegisterService } from '../../services/cash-register.service';
import { CashMovement } from '../../types';
import { formatCurrency, formatDate, formatParaguayThousands, parseParaguayNumber } from '../../utils/formatters';
import {
  Vault,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Lock,
  Unlock,
  Clock,
  X,
  Trash2,
} from 'lucide-react';

export const CashRegisterView: React.FC = () => {
  const { currentRegister, refreshRegister, notify, user } = useApp();
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const isCashier = user?.role === 'cashier';

  // Modales
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Modal de Eliminación de Movimiento con contraseña de administrador
  const [selectedMovementToDelete, setSelectedMovementToDelete] = useState<CashMovement | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingMovement, setIsDeletingMovement] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [openAmount, setOpenAmount] = useState<number>(100000);
  const [openNotes, setOpenNotes] = useState('');

  const [closeAmount, setCloseAmount] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  const [movementType, setMovementType] = useState<'in' | 'out'>('out');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState('');

  useEffect(() => {
    if (currentRegister) {
      loadMovements(currentRegister.id);
    }
  }, [currentRegister]);

  const loadMovements = async (regId: string) => {
    try {
      setLoading(true);
      const data = await cashRegisterService.listMovements(regId);
      setMovements(data || []);
    } catch (err: any) {
      notify('Error al cargar movimientos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cashRegisterService.open(Number(openAmount), openNotes);
      notify('Caja abierta exitosamente', 'success');
      setShowOpenModal(false);
      refreshRegister();
    } catch (err: any) {
      notify('Error al abrir caja: ' + err.message, 'error');
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRegister) return;
    try {
      const result = await cashRegisterService.close(currentRegister.id, Number(closeAmount), closeNotes);
      notify(`Corte completado. Diferencia: ${formatCurrency(result.difference)}`, 'success');
      setShowCloseModal(false);
      refreshRegister();
    } catch (err: any) {
      notify('Error al cerrar caja: ' + err.message, 'error');
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRegister) return;
    try {
      await cashRegisterService.addMovement(
        currentRegister.id,
        movementType,
        Number(movementAmount),
        movementReason
      );
      notify('Movimiento registrado en caja', 'success');
      setShowMovementModal(false);
      setMovementAmount(0);
      setMovementReason('');
      refreshRegister();
      loadMovements(currentRegister.id);
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  const handleRequestDeleteMovement = (mov: CashMovement) => {
    setSelectedMovementToDelete(mov);
    setAdminPassword('');
    setDeleteReason('');
    setPasswordError('');
  };

  const handleConfirmDeleteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementToDelete) return;

    if (!adminPassword.trim()) {
      setPasswordError('Debe ingresar la contraseña de administrador.');
      return;
    }

    try {
      setIsDeletingMovement(true);
      setPasswordError('');
      await cashRegisterService.deleteMovement(
        selectedMovementToDelete.id,
        adminPassword,
        deleteReason
      );
      notify('Movimiento de caja eliminado exitosamente', 'success');
      setSelectedMovementToDelete(null);
      setAdminPassword('');
      setDeleteReason('');
      refreshRegister();
      if (currentRegister) {
        loadMovements(currentRegister.id);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Contraseña de administrador incorrecta. Verifique sus credenciales.');
    } finally {
      setIsDeletingMovement(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Vault className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Control de Caja Registradora
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestiona apertura de turno, arqueo, entradas y salidas de efectivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRegister?.status === 'open' ? (
            <>
              <button
                onClick={() => setShowMovementModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Registrar Movimiento
              </button>
              <button
                onClick={() => {
                  setCloseAmount(currentRegister.expected_amount);
                  setShowCloseModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Cerrar Turno (Arqueo)
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Unlock className="w-4 h-4" />
              Abrir Caja Registradora
            </button>
          )}
        </div>
      </div>

      {/* ESTADO ACTUAL DE CAJA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Estado del Turno</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                currentRegister?.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {currentRegister?.status === 'open' ? 'Caja Abierta (Operando)' : 'Caja Cerrada'}
            </span>
          </div>
          {currentRegister?.opened_at && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-2">
              <Clock className="w-3 h-3" /> Abierta el {formatDate(currentRegister.opened_at)}
            </span>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Monto Inicial de Apertura</span>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {isCashier ? '••••••••' : formatCurrency(currentRegister?.initial_amount || 0)}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {isCashier ? 'Información reservada para administración' : 'Fondo de cambio asignado'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Efectivo Esperado en Gaveta</span>
          <span className={`text-2xl font-extrabold ${isCashier ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isCashier ? '••••••••' : formatCurrency(currentRegister?.expected_amount || 0)}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {isCashier ? 'Información reservada para administración' : 'Ventas en efectivo + ingresos - egresos'}
          </p>
        </div>
      </div>

      {/* HISTORIAL DE MOVIMIENTOS DE LA CAJA */}
      <div className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Movimientos de Efectivo de la Sesión</h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {movements.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
              No hay movimientos de dinero extraordinarios registrados en este turno.
            </p>
          ) : (
            movements.map((mov) => (
              <div
                key={mov.id}
                className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      mov.type === 'in'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {mov.type === 'in' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block">
                      {mov.reason}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatDate(mov.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold ${
                      mov.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {mov.type === 'in' ? '+' : '-'} {formatCurrency(mov.amount)}
                  </span>
                  {currentRegister?.status === 'open' && (
                    <button
                      onClick={() => handleRequestDeleteMovement(mov)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                      title="Eliminar movimiento (requiere clave de administrador)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL ABRIR CAJA */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleOpenRegister} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Apertura de Turno</h3>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Fondo de Cambio Inicial (₲)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ej. 100.000"
                  value={formatParaguayThousands(openAmount)}
                  onChange={(e) => setOpenAmount(parseParaguayNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Turno mañana / Cajero"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Confirmar Apertura
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CERRAR CAJA / CORTE */}
      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCloseRegister} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cierre de Caja y Arqueo</h3>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Ingresa el dinero físico contado en gaveta para calcular diferencias.
            </p>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Efectivo calculado por sistema:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(currentRegister.expected_amount)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Monto Físico Contado (₲)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ej. 1.500.000"
                  value={formatParaguayThousands(closeAmount)}
                  onChange={(e) => setCloseAmount(parseParaguayNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500 dark:text-slate-400">Diferencia proyectada:</span>
                <span className={`font-bold ${
                  closeAmount - currentRegister.expected_amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {formatCurrency(closeAmount - currentRegister.expected_amount)}
                </span>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1">Observaciones de Cierre</label>
                <input
                  type="text"
                  placeholder="Detalle de turno"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Finalizar Corte de Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL MOVIMIENTO (INGRESO/EGRESO) */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddMovement} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Entrada / Salida</h3>
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType('in')}
                  className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    movementType === 'in'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Entrada (+Dinero)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('out')}
                  className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    movementType === 'out'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Salida (-Dinero)
                </button>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Monto (₲)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ej. 50.000"
                  value={formatParaguayThousands(movementAmount)}
                  onChange={(e) => setMovementAmount(parseParaguayNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1">Motivo / Justificación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra de café, adelanto, reposición cambio"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Guardar Movimiento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ELIMINAR MOVIMIENTO CON CONTRASEÑA DE ADMINISTRADOR */}
      {selectedMovementToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDeleteMovement}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Eliminar Movimiento de Caja
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingMovement) {
                    setSelectedMovementToDelete(null);
                    setPasswordError('');
                    setAdminPassword('');
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Esta acción revertirá el saldo correspondiente en la caja registradora abierta. Se requiere autorización del administrador para confirmar la corrección.
            </p>

            {/* Identificación clara del movimiento */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tipo de Movimiento:</span>
                <span
                  className={`font-bold ${
                    selectedMovementToDelete.type === 'in'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selectedMovementToDelete.type === 'in' ? 'Entrada (+Ingreso)' : 'Salida (-Egreso)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Importe:</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {formatCurrency(selectedMovementToDelete.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Motivo:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {selectedMovementToDelete.reason}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Fecha:</span>
                <span>{formatDate(selectedMovementToDelete.created_at)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  Motivo de la Corrección (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Monto digitado por error"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  disabled={isDeletingMovement}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
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
                  placeholder="Introduce la contraseña de administrador"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  disabled={isDeletingMovement}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                />
                {passwordError && (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> {passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedMovementToDelete(null);
                  setPasswordError('');
                  setAdminPassword('');
                }}
                disabled={isDeletingMovement}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeletingMovement || !adminPassword.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingMovement ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirmar Eliminación
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
