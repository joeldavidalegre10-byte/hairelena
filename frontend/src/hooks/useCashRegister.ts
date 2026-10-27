import { useApp } from '../context/AppContext';

export const useCashRegister = () => {
  const { currentRegister, refreshRegister } = useApp();

  return {
    currentRegister,
    refreshRegister,
    isOpen: currentRegister?.status === 'open',
    expectedAmount: currentRegister?.expected_amount || 0,
  };
};
