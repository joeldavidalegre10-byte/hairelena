import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { firstAllowedTab } from '../../config/permissions';
import { PosPage } from '../pages/PosPage';
import { SalesPage } from '../pages/SalesPage';
import { InventoryPage } from '../pages/InventoryPage';
import { StylistsPage } from '../pages/StylistsPage';
import { CashRegisterPage } from '../pages/CashRegisterPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ProfitMarginsPage } from '../pages/ProfitMarginsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRouter: React.FC = () => {
  const { activeTab, user, hasPermission } = useApp();

  // Si la pestaña no está permitida se muestra la primera a la que sí tiene acceso
  const tab = hasPermission(activeTab) ? activeTab : firstAllowedTab(user);

  if (!tab) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-slate-50 dark:bg-slate-950">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Sin permisos asignados</h2>
        <p className="text-xs text-slate-500 max-w-md">
          Tu usuario todavía no tiene acceso a ningún módulo. Pídele a un administrador que te asigne permisos.
        </p>
      </div>
    );
  }

  switch (tab) {
    case 'pos':
      return <PosPage />;
    case 'sales':
      return <SalesPage />;
    case 'inventory':
      return <InventoryPage />;
    case 'stylists':
      return <StylistsPage />;
    case 'register':
      return <CashRegisterPage />;
    case 'margins':
      return <ProfitMarginsPage />;
    case 'settings':
      return <SettingsPage />;
    case 'reports':
      return <ReportsPage />;
    default:
      return <PosPage />;
  }
};
