import React from 'react';
import { useApp } from '../../context/AppContext';
import { DollarSign, UserCheck, ShieldCheck, Sun, Moon } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const Navbar: React.FC = () => {
  const { user, currentRegister, setActiveTab, theme, toggleTheme } = useApp();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d0e12] px-6 flex items-center justify-between sticky top-0 z-40 shrink-0 transition-colors duration-200">
      {/* LOGO EXACTO DE LA REFERENCIA ÉLITE STUDIO POS */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-[#5b63f6] flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
          É
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Élite Studio
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148]">
              POS
            </span>
          </h1>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500">
            SALÓN & SPA
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* STATUS DE CAJA (VERDE DE REFERENCIA) */}
        <button
          onClick={() => setActiveTab('register')}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-300/80 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition text-xs font-semibold cursor-pointer shadow-xs"
        >
          <div className="flex items-center space-x-1.5">
            <span
              className={`status-dot w-2 h-2 rounded-full animate-pulse ${
                currentRegister?.status === 'open' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>{currentRegister?.status === 'open' ? 'Caja abierta' : 'Caja cerrada'}</span>
          </div>

          {currentRegister?.status === 'open' && (
            <div className="flex items-center pl-2 border-l border-emerald-300/60 dark:border-emerald-600/40 text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{formatCurrency(currentRegister.expected_amount)}</span>
            </div>
          )}
        </button>

        {/* CONTROL DE MODO CLARO / MODO OSCURO (SOL / LUNA) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121318] text-slate-600 dark:text-slate-300 hover:text-[#5b63f6] dark:hover:text-[#5b63f6] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] transition cursor-pointer shadow-2xs"
          title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          aria-label="Alternar modo claro y oscuro"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#5b63f6]" />
          )}
        </button>

        {/* PERFIL DE USUARIO */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="avatar w-9 h-9 rounded-full bg-[#5b63f6]/10 dark:bg-[#5b63f6]/20 border border-[#5b63f6]/30 flex items-center justify-center text-[#5b63f6] font-bold text-sm">
            {user?.full_name ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.full_name || 'Valeria Ayala'}
            </p>
            <div className="flex items-center gap-1 text-slate-400 capitalize text-[10px]">
              {user?.role === 'admin' ? (
                <ShieldCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <UserCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{user?.role === 'admin' ? 'Administrador' : user?.role || 'cajero'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
