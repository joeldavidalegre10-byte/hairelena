import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CashRegister, CartItem, ServiceItem, ProductItem, SystemTheme, VisualStyle, ThemeMode } from '../types';
import { authService } from '../services/auth.service';
import { cashRegisterService } from '../services/cash-register.service';
import { getToken } from '../services/api';

export type ActiveTab = 'pos' | 'sales' | 'inventory' | 'stylists' | 'register' | 'margins' | 'settings' | 'reports';
export type { SystemTheme, VisualStyle, ThemeMode };

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AppContextType {
  // Temas del Sistema y Modo de Color
  systemTheme: SystemTheme;
  setSystemTheme: (theme: SystemTheme) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  visualStyle: VisualStyle;
  setVisualStyle: (style: VisualStyle) => void;

  // Sesión y Autenticación Real
  user: User | null;
  isLoadingUser: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  setUser: (user: User | null) => void;
  loginUser: (username: string, password?: string) => Promise<void>;
  logout: () => void;

  // Estado de Caja Activa
  currentRegister: CashRegister | null;
  refreshRegister: () => Promise<void>;

  // Carrito de Ventas
  cart: CartItem[];
  addToCart: (
    item: ServiceItem | ProductItem,
    type: 'service' | 'product',
    stylistId?: string,
    stylistName?: string,
    variantId?: string,
    variantName?: string,
    customPrice?: number
  ) => void;
  updateCartItemQty: (id: string, delta: number) => void;
  removeCartItem: (id: string) => void;
  assignCartStylist: (id: string, stylistId: string, stylistName: string) => void;
  clearCart: () => void;
  discount: number;
  setDiscount: (discount: number) => void;
  cartSubtotal: number;
  cartTotal: number;

  // Notificaciones Toast
  notifications: ToastNotification[];
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tema claro / oscuro persistente con inicio predeterminado en modo claro si no hay preferencia guardada
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('elite_theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('elite_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      localStorage.setItem('elite_theme', next);
      return next;
    });
  };

  // Tema del Sistema: 'elite-pos' (Tema único y exclusivo del sistema)
  const [systemTheme, setSystemTheme] = useState<SystemTheme>('elite-pos');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'elite-pos');
    localStorage.setItem('elite_system_theme', 'elite-pos');
  }, [systemTheme]);

  // Estilo visual persistente ('actual' | 'modern' | 'compact')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(() => {
    const saved = localStorage.getItem('elite_visual_style') as VisualStyle | null;
    if (saved === 'actual' || saved === 'modern' || saved === 'compact') return saved;
    return 'actual';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-style', visualStyle);
    localStorage.setItem('elite_visual_style', visualStyle);
  }, [visualStyle]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissNotification(id);
    }, 4000);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const refreshRegister = async () => {
    try {
      const reg = await cashRegisterService.getCurrent();
      setCurrentRegister(reg);
    } catch {
      setCurrentRegister(null);
    }
  };

  // Comprobar sesión al arrancar
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setIsLoadingUser(false);
        return;
      }
      try {
        const profile = await authService.getCurrentUser();
        if (profile) {
          setUser(profile);
          setActiveTab('pos');
          refreshRegister();
        } else {
          setUser(null);
          setActiveTab('pos');
        }
      } catch {
        authService.logout();
        setUser(null);
        setActiveTab('pos');
      } finally {
        setIsLoadingUser(false);
      }
    };

    checkAuth();
  }, []);

  const loginUser = async (username: string, password?: string) => {
    const data = await authService.login(username, password);
    setUser(data.user);
    setActiveTab('pos');
    refreshRegister();
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setActiveTab('pos');
    setCart([]);
    // Notificación de cierre de sesión eliminada según requerimientos
  };

  const addToCart = (
    item: ServiceItem | ProductItem,
    type: 'service' | 'product',
    stylistId?: string,
    stylistName?: string,
    variantId?: string,
    variantName?: string,
    customPrice?: number
  ) => {
    const price = customPrice !== undefined
      ? customPrice
      : (type === 'service' ? (item as ServiceItem).price : (item as ProductItem).sale_price);

    const displayName = variantName ? `${item.name} (${variantName})` : item.name;

    setCart((prev) => {
      // Para productos, si ya existe en carrito, incrementa la cantidad
      // Para servicios, si existe la misma combinación de servicio + estilista + variante, incrementa
      const existing = prev.find(
        (c) =>
          c.original_id === item.id &&
          (type === 'product' || (c.stylist_id === stylistId && c.variant_id === variantId))
      );
      if (existing) {
        return prev.map((c) =>
          c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          original_id: item.id,
          item_type: type,
          name: displayName,
          price,
          quantity: 1,
          stylist_id: stylistId,
          stylist_name: stylistName,
          variant_id: variantId,
          variant_name: variantName,
        },
      ];
    });
  };

  const updateCartItemQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const assignCartStylist = (id: string, stylistId: string, stylistName: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stylist_id: stylistId, stylist_name: stylistName } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const cartSubtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  return (
    <AppContext.Provider
      value={{
        systemTheme,
        setSystemTheme,
        theme,
        setTheme,
        toggleTheme,
        visualStyle,
        setVisualStyle,
        user,
        isLoadingUser,
        activeTab,
        setActiveTab,
        setUser,
        loginUser,
        logout,
        currentRegister,
        refreshRegister,
        cart,
        addToCart,
        updateCartItemQty,
        removeCartItem,
        assignCartStylist,
        clearCart,
        discount,
        setDiscount,
        cartSubtotal,
        cartTotal,
        notifications,
        notify,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
