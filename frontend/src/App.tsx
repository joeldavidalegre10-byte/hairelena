import React from 'react';
import { useApp } from './context/AppContext';
import { MainLayout } from './app/layouts/MainLayout';
import { AppRouter } from './app/routes/AppRouter';
import { LoginPage } from './features/auth/LoginPage';
import { ToastContainer } from './app/components/ToastContainer';

export default function App() {
  const { user, isLoadingUser } = useApp();

  if (isLoadingUser) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-500">Cargando Elite Studio POS...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <MainLayout>
      <AppRouter />
    </MainLayout>
  );
}
