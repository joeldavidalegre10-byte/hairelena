import React from 'react';
import { AppProvider } from '../../context/AppContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppProvider>{children}</AppProvider>;
};
