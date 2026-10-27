import React, { useState, useEffect } from 'react';
import { stylistsService } from '../../services/stylists.service';
import { api } from '../../services/api';
import { Stylist, Commission } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Users, Plus, Percent, DollarSign, X, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StylistPaymentsView } from './StylistPaymentsView';

export const StylistsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payments' | 'staff'>('payments');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(40);
  const [specialtyList, setSpecialtyList] = useState<string[]>(['']);
  const { notify } = useApp();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stys, commsRes] = await Promise.all([
        stylistsService.list(),
        api.get<{ success: boolean; data: Commission[] }>('/commissions'),
      ]);
      setStylists(stys || []);
      setCommissions(commsRes.data || []);
    } catch (err: any) {
      notify('Error al cargar estilistas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecialty = () => {
    setSpecialtyList([...specialtyList, '']);
  };

  const handleUpdateSpecialty = (index: number, value: string) => {
    const updated = [...specialtyList];
    updated[index] = value;
    setSpecialtyList(updated);
  };

  const handleRemoveSpecialty = (index: number) => {
    if (specialtyList.length <= 1) {
      setSpecialtyList(['']);
      return;
    }
    setSpecialtyList(specialtyList.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const validSpecialties = specialtyList.map((s) => s.trim()).filter(Boolean);
      await stylistsService.create({
        full_name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        commission_rate: Number(commissionRate),
        specialties: validSpecialties,
      });
      notify('Estilista registrado exitosamente', 'success');
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setSpecialtyList(['']);
      loadData();
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-200">
      {/* CABECERA Y SUB-NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Módulo de Pagos a Estilistas & Comisiones
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Liquidación de servicios pendientes y consulta detallada del historial de pagos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SELECTOR DE PESTAÑAS */}
          <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Pagos & Liquidaciones
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Equipo de Estilistas
            </button>
          </div>

          {activeTab === 'staff' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Registrar Estilista
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {activeTab === 'payments' ? (
        <StylistPaymentsView />
      ) : (
        /* PESTAÑA DE GESTIÓN DE EQUIPO */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Plantel de Profesionales ({stylists.length})
            </h3>
            <span className="text-xs text-slate-400">
              Configuración de porcentajes base y estados
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Cargando estilistas...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stylists.map((st) => {
                const stComms = commissions.filter((c) => c.stylist_id === st.id && c.status === 'pending');
                const pendingSum = stComms.reduce((acc, c) => acc + c.amount, 0);

                return (
                  <div
                    key={st.id}
                    className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl flex flex-col justify-between shadow-xs transition-all ${
                      st.is_active ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200/60 dark:border-slate-800/40 opacity-70 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm ${
                            st.is_active
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}>
                            {st.full_name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{st.full_name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                st.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}>
                                {st.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Tel: {st.phone || 'Sin número'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 dark:border-indigo-500/30">
                          <Percent className="w-3 h-3" /> {st.commission_rate}% base
                        </span>
                      </div>

                      {st.specialties && st.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 my-2">
                          {st.specialties.map((spec, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] border border-slate-200 dark:border-slate-700"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs mt-3">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Comisión Pendiente:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(pendingSum)}</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await stylistsService.update(st.id, { is_active: !st.is_active });
                            notify(st.is_active ? 'Estilista pausado' : 'Estilista activado', 'info');
                            loadData();
                          } catch (err: any) {
                            notify('Error: ' + err.message, 'error');
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer ${
                          st.is_active
                            ? 'border-slate-200 hover:border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {st.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR ESTILISTA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Estilista / Barbero</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lucas Barber"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="0981 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-400 block mb-1">% de Comisión Base</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                    Especialidad
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar opción
                  </button>
                </div>
                <div className="space-y-2">
                  {specialtyList.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={
                          idx === 0
                            ? 'Ej. Corte y Barba'
                            : idx === 1
                            ? 'Ej. Peinados y Brushing'
                            : idx === 2
                            ? 'Ej. Colorimetría / Mechas'
                            : 'Ej. Tratamientos Capilares'
                        }
                        value={spec}
                        onChange={(e) => handleUpdateSpecialty(idx, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                      {specialtyList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecialty(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Eliminar opción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Empieza con una especialidad. Si necesitas registrar más, presiona "+ Agregar opción".
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
