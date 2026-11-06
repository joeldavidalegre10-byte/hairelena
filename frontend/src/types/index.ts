import type { PermissionKey } from '../config/permissions';

export type { PermissionKey };
export type UserRole = 'admin' | 'cashier' | 'stylist';
export type SystemTheme = 'elite-pos';
export type VisualStyle = 'actual' | 'modern' | 'compact';
export type ThemeMode = 'dark' | 'light';

export interface User {
  id: string;
  username?: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  permissions?: PermissionKey[];
  created_at?: string;
}

export interface Stylist {
  id: string;
  user_id?: string | null;
  full_name: string;
  email?: string;
  phone?: string;
  commission_rate: number;
  specialties: string[];
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'service' | 'product';
  description?: string;
}

export interface ServiceVariant {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_minutes?: number;
  is_active?: boolean;
}

export interface ServiceItem {
  id: string;
  category_id?: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  cost?: number;
  profit_margin_percent?: number | null;
  is_active: boolean;
  variants?: ServiceVariant[];
}

export interface ProductItem {
  id: string;
  category_id?: string;
  name: string;
  barcode?: string;
  sku?: string;
  description?: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';

export interface CartItem {
  id: string; // unique item id in cart
  original_id: string; // id from service or product
  item_type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
  stylist_id?: string; // assigned stylist for this item
  stylist_name?: string;
  variant_id?: string;
  variant_name?: string;
  helper_stylist_id?: string; // estilista auxiliar (opcional)
  helper_stylist_name?: string;
  utility_amount?: number; // monto informativo; el servidor lo recalcula
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_type: 'service' | 'product';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  stylist_id?: string;
  stylist_name?: string;
  commission_rate?: number;
  commission_amount?: number;
  profit_margin_percent?: number;
  profit_amount?: number;
  helper_stylist_id?: string | null;
  helper_stylist_name?: string | null;
  utility_amount?: number | null;
  utility_status?: 'pending' | 'paid' | 'cancelled' | null;
}

export interface Sale {
  id: string;
  invoice_number: string;
  register_id?: string;
  cashier_id?: string;
  cashier_name?: string;
  customer_name: string;
  customer_phone?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_details?: any;
  status: 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface CashRegister {
  id: string;
  name: string;
  status: 'open' | 'closed';
  opened_at?: string;
  closed_at?: string;
  opened_by?: string;
  closed_by?: string;
  initial_amount: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  notes?: string;
  // Solo vienen en el listado / detalle que ve el administrador
  opened_by_name?: string;
  closed_by_name?: string;
  sales_total?: number;
  sales_count?: number;
  movements_in?: number;
  movements_out?: number;
}

export interface EligibleCashUser {
  id: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'stylist';
  has_open_register: boolean;
}

export interface CashMovement {
  id: string;
  register_id: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface Commission {
  id: string;
  stylist_id: string;
  stylists?: { full_name: string };
  sale_id: string;
  sale_item_id: string;
  item_name?: string;
  amount: number;
  status: 'pending' | 'paid';
  paid_at?: string;
  notes?: string;
  created_at: string;
}

/** Un servicio de un estilista en el reporte: una sola fila con cantidad, precio unitario y total. */
export interface StylistServiceBreakdown {
  service_name: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  total_commission: number;
  total_profit: number;
}

export interface StylistPerformance {
  stylist_id: string;
  stylist_name: string;
  services?: StylistServiceBreakdown[];
  services_count: number;
  total_service_revenue: number;
  total_commissions: number;
  total_profit: number;
}

export interface SystemSettings {
  default_profit_margin_percent: number;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  barcode: string | null;
  sku: string | null;
  category_name: string;
  units_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  current_stock: number;
}

export interface PaymentMethodSummary {
  payment_method: string;
  count: number;
  total: number;
}

export interface DashboardMetrics {
  period?: string;
  totalRevenue: number;
  totalSalesCount: number;
  averageTicket: number;
  currentCashInRegister: number;
  lowStockCount: number;
  lowStockProducts: ProductItem[];
  stylistPerformances?: StylistPerformance[];
  productPerformances?: ProductPerformance[];
  paymentMethods?: PaymentMethodSummary[];
}

export interface StylistMarginStatus {
  stylist_id: string;
  stylist_name: string;
  base_commission_rate: number;
  has_custom_margin: boolean;
  profit_margin_percent: number | null;
  is_active: boolean;
  is_hidden: boolean;
}

export interface ServiceWithMargins {
  id: string;
  name: string;
  price: number;
  category_name?: string;
  custom_margin_active: boolean;
  stylist_margins: Array<{
    service_id: string;
    stylist_id: string;
    profit_margin_percent: number;
    stylist_name: string;
  }>;
  stylists: StylistMarginStatus[];
}

export interface PendingServiceItem {
  commission_id: string;
  sale_id: string;
  sale_item_id: string;
  service_name: string;
  customer_name: string;
  service_date: string;
  /** Cantidad de servicios de esta línea (ej. 3 cortes). */
  quantity?: number;
  unit_price?: number;
  service_price: number;
  amount_to_pay: number;
  profit_margin_percent: number | null;
  commission_rate: number | null;
  invoice_number: string;
}

export interface PendingUtilityItem {
  utility_id: string;
  sale_id: string;
  sale_item_id: string;
  service_name: string;
  customer_name: string;
  service_date: string;
  main_stylist_name: string | null;
  quantity: number;
  amount_to_pay: number;
  invoice_number: string;
}

export interface StylistPendingSummary {
  stylist_id: string;
  stylist_name: string;
  stylist_email: string | null;
  pending_services_count: number;
  /** Total a pagar = comisiones + utilidades */
  total_pending_amount: number;
  total_pending_commissions: number;
  pending_utilities_count: number;
  total_pending_utilities: number;
  services: PendingServiceItem[];
  utilities: PendingUtilityItem[];
}

export interface PayoutUtilityItem {
  id: string;
  payout_id: string;
  utility_id: string | null;
  service_name: string;
  customer_name: string | null;
  main_stylist_name: string | null;
  invoice_number: string | null;
  service_date: string | null;
  amount_paid: number;
  created_at: string;
}

export type UtilityMode = 'general' | 'custom' | 'disabled';

export interface UtilityServiceConfig {
  id: string;
  name: string;
  price: number;
  category_name: string | null;
  mode: UtilityMode;
  specific_amount: number | null;
  effective_amount: number;
  eligible: boolean;
  source: 'service' | 'general' | null;
  reason: string | null;
}

export interface UtilityStylistConfig {
  id: string;
  full_name: string;
  is_active: boolean;
  can_receive_utility: boolean;
}

export interface UtilitySummary {
  pending_count: number;
  pending_total: number;
  paid_count: number;
  paid_total: number;
  cancelled_count: number;
  cancelled_total: number;
}

export interface UtilityConfig {
  general: { amount: number; enabled: boolean };
  services: UtilityServiceConfig[];
  stylists: UtilityStylistConfig[];
  summary: UtilitySummary;
}

export interface UtilityRecord {
  id: string;
  sale_id: string;
  invoice_number: string | null;
  service_name: string;
  customer_name: string | null;
  main_stylist_name: string | null;
  helper_stylist_id: string;
  helper_stylist_name: string | null;
  amount: number;
  source: 'service' | 'general';
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  created_at: string;
  sale_date: string | null;
}

export interface PosUtilityConfig {
  services: Record<string, { eligible: boolean; amount: number; source: 'service' | 'general' | null }>;
  helpers: Array<{ id: string; full_name: string }>;
}

export interface PayoutServiceItem {
  id: string;
  payout_id: string;
  commission_id: string | null;
  sale_item_id: string | null;
  service_name: string;
  customer_name: string;
  quantity?: number;
  unit_price?: number;
  service_price: number;
  amount_paid: number;
  profit_margin_percent: number | null;
  commission_rate: number | null;
  service_date: string;
  created_at: string;
}

export interface StylistPayoutRecord {
  id: string;
  stylist_id: string;
  stylist_name: string;
  total_amount: number;
  services_count: number;
  commissions_total: number;
  utilities_total: number;
  utilities_count: number;
  status: string;
  notes: string | null;
  created_at: string;
  services: PayoutServiceItem[];
  utilities: PayoutUtilityItem[];
}



