import { useApp } from '../context/AppContext';

export const useNotifications = () => {
  const { notifications, notify, dismissNotification } = useApp();

  return {
    notifications,
    notify,
    dismissNotification,
  };
};
