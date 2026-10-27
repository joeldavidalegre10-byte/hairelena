import React from 'react';
import { useApp } from '../../context/AppContext';
import { PosPage } from '../pages/PosPage';
import { SalesPage } from '../pages/SalesPage';
import { InventoryPage } from '../pages/InventoryPage';
import { StylistsPage } from '../pages/StylistsPage';
import { CashRegisterPage } from '../pages/CashRegisterPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ProfitMarginsPage } from '../pages/ProfitMarginsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRouter: React.FC = () => {
  const { activeTab, user } = useApp();

  // El cajero solo puede acceder a POS y a su historial de ventas
  if (user?.role === 'cashier') {
    if (activeTab === 'sales') {
      return <SalesPage />;
    }
    return <PosPage />;
  }

  // Rutas completas para Administrador
  switch (activeTab) {
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
