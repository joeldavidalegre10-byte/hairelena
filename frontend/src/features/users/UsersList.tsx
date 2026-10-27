import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { UserCheck, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useApp();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: User[] }>('/users');
      setUsers(res.data || []);
    } catch (err: any) {
      notify('Error al cargar usuarios: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Usuarios del Sistema</h3>
      <div className="space-y-2">
        {loading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Cargando...</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-200 block">{u.full_name}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</span>
              </div>
              <span className="flex items-center gap-1 capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {u.role === 'admin' ? (
                  <ShieldCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <UserCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                )}
                {u.role}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
