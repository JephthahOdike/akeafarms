/**
 * Database type for Supabase. Hand-rolled for now; replace with
 * `supabase gen types typescript` once the project grows.
 *
 * Shape must match the PostgrestVersion of @supabase/supabase-js v2:
 *   Row         — selected shape (all NOT NULL + nullable)
 *   Insert      — accepted by .insert(); default: same as Row
 *   Update      — accepted by .update(); default: Partial<Row>
 *   Relationships — [] (empty tuple) — unused but required
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

export type UserRole = 'buyer' | 'seller' | 'admin' | 'employee';
export type EmployeePermission =
  | 'orders.view'
  | 'orders.manage'
  | 'products.view'
  | 'products.moderate'
  | 'sellers.view'
  | 'sellers.approve'
  | 'sellers.suspend'
  | 'payments.view'
  | 'settlements.view'
  | 'support.view'
  | 'support.respond'
  | 'users.view'
  | 'analytics.view';
export type SellerStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type ProductStatus = 'draft' | 'active' | 'out_of_stock' | 'archived';
export type OrderStatus =
  | 'created'
  | 'paid'
  | 'seller_accepted'
  | 'packed'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type TrackingColor = 'blue' | 'green' | 'red' | 'gray';
export type WalletTxnType =
  | 'buyer_payment'
  | 'paystack_fee'
  | 'platform_commission'
  | 'seller_earning'
  | 'seller_settlement'
  | 'refund'
  | 'manual_adjustment';
export type SettlementStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'on_hold';
export type QualityGrade = 'A' | 'B' | 'C' | 'premium' | 'standard';
export type UnitOfMeasure =
  | 'kg'
  | 'g'
  | 'tonne'
  | 'litre'
  | 'ml'
  | 'crate'
  | 'bag'
  | 'piece'
  | 'bunch';
export type NotificationType =
  | 'order'
  | 'payment'
  | 'shipment'
  | 'settlement'
  | 'promotion'
  | 'announcement'
  | 'system'
  | 'message';

/* ===== Row types ===================================================== */

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface BuyerProfile {
  id: string;
  user_id: string;
  default_address: Json | null;
  preferences: Json;
  created_at: string;
  updated_at: string;
}
export interface SellerProfile {
  id: string;
  user_id: string;
  status: SellerStatus;
  business_name: string;
  business_type: string | null;
  cac_number: string | null;
  tin: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  paystack_recipient_code: string | null;
  bio: string | null;
  story: string | null;
  years_of_experience: number | null;
  approved_at: string | null;
  approved_by: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
}
export interface Store {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  farm_name: string | null;
  farm_location: string | null;
  farm_state: string | null;
  farm_lga: string | null;
  farm_latitude: number | null;
  farm_longitude: number | null;
  organic_certified: boolean;
  verification_status: SellerStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  unit: UnitOfMeasure;
  weight_kg: number | null;
  packaging_info: string | null;
  quality_grade: QualityGrade;
  organic: boolean;
  organic_certification_url: string | null;
  harvest_date: string | null;
  available_from: string | null;
  available_to: string | null;
  status: ProductStatus;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}
export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}
export interface Inventory {
  product_id: string;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  updated_at: string;
}
export interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  shipping_address_id: string | null;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  currency: string;
  coupon_id: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  store_id: string;
  seller_id: string;
  product_name_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  status: OrderStatus;
  tracking_code: string | null;
  created_at: string;
  updated_at: string;
}
export interface TrackingEvent {
  id: string;
  order_item_id: string;
  status: OrderStatus;
  color: TrackingColor;
  message: string;
  location: string | null;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
}
export interface Payment {
  id: string;
  order_id: string;
  provider: 'paystack';
  provider_reference: string;
  amount: number;
  currency: string;
  provider_fee: number | null;
  status: PaymentStatus;
  channel: string | null;
  paid_at: string | null;
  raw_payload: Json;
  created_at: string;
  updated_at: string;
}
export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  buyer_id: string;
  pdf_url: string | null;
  email_sent_at: string | null;
  total_amount: number;
  created_at: string;
}
export interface SellerWallet {
  id: string;
  seller_id: string;
  pending_balance: number;
  available_balance: number;
  settled_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}
export interface WalletTransaction {
  id: string;
  wallet_id: string;
  seller_id: string;
  type: WalletTxnType;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}
export interface Settlement {
  id: string;
  settlement_number: string;
  seller_id: string;
  amount: number;
  status: SettlementStatus;
  scheduled_for: string | null;
  processed_at: string | null;
  processed_by: string | null;
  paystack_transfer_code: string | null;
  paystack_reference: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  metadata: Json;
  created_at: string;
}
export interface ShippingAddress {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price_snapshot: number;
  created_at: string;
  updated_at: string;
}
export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}
export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}
export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_to: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  related_order: string | null;
  created_at: string;
  updated_at: string;
}
export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  against: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved_buyer' | 'resolved_seller' | 'closed';
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
}

/* ===== Table wrapper helper ==========================================
 * Supabase's PostgrestQueryBuilder expects:
 *   Relationships: []   (empty tuple)
 *   Insert:           accepts the Insert type (we use Partial<Row> for ergonomics)
 *   Update:           accepts Partial<Row>
 *   Row:              the row shape
 * ===================================================================== */

type TableOf<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type InventoryMovement = {
  id: string;
  product_id: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
};
type CommissionRate = {
  id: string;
  seller_id: string | null;
  category_id: string | null;
  percentage: number;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
};
type SettlementOrder = {
  id: string;
  settlement_id: string;
  order_id: string;
  amount: number;
  created_at: string;
};
type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
};
type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  order_id: string | null;
  last_message_at: string;
  created_at: string;
};
type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

/* ===== Database ====================================================== */

export type Database = {
  public: {
    Tables: {
      profiles: TableOf<Profile>;
      buyer_profiles: TableOf<BuyerProfile>;
      seller_profiles: TableOf<SellerProfile>;
      stores: TableOf<Store>;
      categories: TableOf<Category>;
      products: TableOf<Product>;
      product_images: TableOf<ProductImage>;
      inventory: TableOf<Inventory>;
      inventory_movements: TableOf<InventoryMovement>;
      commission_rates: TableOf<CommissionRate>;
      shipping_addresses: TableOf<ShippingAddress>;
      carts: TableOf<Cart>;
      cart_items: TableOf<CartItem>;
      wishlists: TableOf<Wishlist>;
      coupons: TableOf<Coupon>;
      orders: TableOf<Order>;
      order_items: TableOf<OrderItem>;
      tracking_events: TableOf<TrackingEvent>;
      payments: TableOf<Payment>;
      invoices: TableOf<Invoice>;
      seller_wallets: TableOf<SellerWallet>;
      wallet_transactions: TableOf<WalletTransaction>;
      settlements: TableOf<Settlement>;
      settlement_orders: TableOf<SettlementOrder>;
      reviews: TableOf<Review>;
      notifications: TableOf<Notification>;
      support_tickets: TableOf<SupportTicket>;
      ticket_messages: TableOf<TicketMessage>;
      conversations: TableOf<Conversation>;
      conversation_messages: TableOf<ConversationMessage>;
      disputes: TableOf<Dispute>;
      audit_logs: TableOf<AuditLog>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      seller_status: SellerStatus;
      product_status: ProductStatus;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      tracking_status_color: TrackingColor;
      wallet_txn_type: WalletTxnType;
      settlement_status: SettlementStatus;
      quality_grade: QualityGrade;
      unit_of_measure: UnitOfMeasure;
      notification_type: NotificationType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
