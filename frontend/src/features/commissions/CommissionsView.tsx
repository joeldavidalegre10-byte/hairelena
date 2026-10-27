import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Commission } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DollarSign, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CommissionsView: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useApp();

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Commission[] }>('/commissions');
      setCommissions(res.data || []);
    } catch (err: any) {
      notify('Error al cargar comisiones: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    try {
      await api.post('/commissions/pay', { ids: [id] });
      notify('Comisión liquidada y pagada', 'success');
      loadCommissions();
    } catch (err: any) {
      notify('Error al liquidar: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Comisiones por Estilista
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{commissions.length} registros</span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-96">
        {loading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Cargando comisiones...</p>
        ) : commissions.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Sin comisiones registradas.</p>
        ) : (
          commissions.map((comm) => (
            <div
              key={comm.id}
              className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 block">
                  {comm.item_name || 'Servicio'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {formatDate(comm.created_at)} · {comm.status === 'paid' ? 'Pagada' : 'Pendiente'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${comm.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatCurrency(comm.amount)}
                </span>
                {comm.status === 'pending' && (
                  <button
                    onClick={() => handlePay(comm.id)}
                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition cursor-pointer"
                    title="Liquidar"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
