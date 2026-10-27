import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { notifications, dismissNotification } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border text-xs shadow-xl backdrop-blur transition-all animate-in slide-in-from-bottom-2 ${
            n.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : n.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {n.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {n.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span className="font-medium">{n.message}</span>
          </div>
          <button
            onClick={() => dismissNotification(n.id)}
            className="p-1 hover:bg-white/10 rounded ml-2 cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      ))}
    </div>
  );
};
