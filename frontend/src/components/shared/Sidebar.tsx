import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import {
  ShoppingBag,
  Receipt,
  Package,
  Users,
  Vault,
  TrendingUp,
  Settings,
  BarChart3,
  LogOut,
  Shield,
  UserCheck,
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingBag },
  { id: 'sales', label: 'Historial Tickets', icon: Receipt },
  { id: 'inventory', label: 'Servicios & Stock', icon: Package, adminOnly: true },
  { id: 'stylists', label: 'Estilistas & Pagos', icon: Users, adminOnly: true },
  { id: 'register', label: 'Control de Caja', icon: Vault },
  { id: 'margins', label: 'Márgenes de ganancia', icon: TrendingUp, adminOnly: true },
  { id: 'settings', label: 'Configuración', icon: Settings, adminOnly: true },
  { id: 'reports', label: 'Reportes & Métricas', icon: BarChart3, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, cart, logout, user, currentRegister } = useApp();

  const isCashier = user?.role === 'cashier';
  const visibleNavItems = allNavItems.filter((item) => !isCashier || !item.adminOnly);

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between p-4 shrink-0 transition-colors duration-200">
      <nav className="space-y-1.5">
        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>{isCashier ? 'Terminal de Cajero' : 'Módulos del Sistema'}</span>
          {isCashier ? (
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold lowercase">
              <UserCheck className="w-3 h-3" /> cajero
            </span>
          ) : (
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold lowercase">
              <Shield className="w-3 h-3" /> admin
            </span>
          )}
        </div>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'pos' && cart.length > 0 && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                  {cart.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        {/* Tarjeta de Caja (Referencia) */}
        <div
          onClick={() => setActiveTab('register')}
          className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#14151b] border border-slate-200 dark:border-[#1f2128] flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                currentRegister?.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {currentRegister?.name || (currentRegister?.id ? `Caja #${currentRegister.id.slice(-3)}` : 'Caja #001')}
              </p>
              <p className="text-[10px] text-slate-400">
                {currentRegister?.status === 'open' ? 'Turno abierto' : 'Turno cerrado'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
