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
}

export interface CashMovement {
  id: string;
  register_id: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  created_by?: string;
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

export interface StylistPerformance {
  stylist_id: string;
  stylist_name: string;
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
  service_price: number;
  amount_to_pay: number;
  profit_margin_percent: number | null;
  commission_rate: number | null;
  invoice_number: string;
}

export interface StylistPendingSummary {
  stylist_id: string;
  stylist_name: string;
  stylist_email: string | null;
  pending_services_count: number;
  total_pending_amount: number;
  services: PendingServiceItem[];
}

export interface PayoutServiceItem {
  id: string;
  payout_id: string;
  commission_id: string | null;
  sale_item_id: string | null;
  service_name: string;
  customer_name: string;
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
  status: string;
  notes: string | null;
  created_at: string;
  services: PayoutServiceItem[];
}



