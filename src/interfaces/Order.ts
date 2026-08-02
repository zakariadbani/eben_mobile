/**
 * Order interfaces — confirmed purchases.
 * Maps to `orders`, `order_items`, and `purchase_orders` tables.
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/**
 * Order-item lifecycle is DISTINCT from the order-header status.
 * Source: knowledge-pack database-diagram.md order_items.status.
 * Notable difference: has `preparing` but NOT `processing` or `refunded`.
 */
export type OrderItemStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** payment_method canonical values per knowledge-pack 010. `visa` not `card`. */
export type PaymentMethodType = 'cod' | 'visa' | 'virement' | 'cache_plus' | 'balance';

/**
 * payment_status canonical values per knowledge-pack 010.
 * `completed` is authoritative — NOT `paid` (database-diagram.md diverges here).
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * OrderItem — one line per selected offer in an order.
 * Maps to `order_items` table.
 *
 * `unitPrice` is a snapshot of `priceClient` at order time (immutable).
 * `categoryId` is denormalised for display — targets a leaf (level-3) category (A-5).
 */
export interface OrderItem {
  id: number;
  orderId: number;
  offerId: number;
  /** Leaf (level-3) category — denormalised for display. CONFIRMED A-5. */
  categoryId: number;
  quantity: number;
  /** Snapshot of offer.priceClient at order time. */
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded display data. */
  categoryTitle?: string;
  categoryTitleAr?: string;
}

/**
 * Order — confirmed purchase.
 * Maps to `orders` table.
 */
export interface Order {
  id: number;
  reference: string;
  userId: number;
  addressId: number;
  /** Applied voucher/coupon id; null if no coupon used. */
  couponId: number | null;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  /** Server-calculated tax snapshot. */
  taxAmount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  notes: string | null;
  confirmedBy: number | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded when fetching order details. */
  items?: OrderItem[];
}

/** Summary shape for list screens (Figma: "Profile / My orders"). */
export interface OrderSummary {
  id: number;
  reference: string;
  status: OrderStatus;
  total: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

/**
 * PurchaseOrder — Bon de Commande (BC) sent to ferrailleur.
 * MARGIN-CRITICAL: `amount` is the immutable server-owned net line total.
 */
export type PurchaseOrderStatus =
  | 'sent'
  | 'acknowledged'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'received'
  | 'cancelled';

export interface PurchaseOrder {
  id: number;
  reference: string;
  ferrailleurId: number;
  orderItemId: number;
  /** MARGIN-CRITICAL: stored line total; never recompute on-device. */
  amount: number;
  trackingNumber: string | null;
  status: PurchaseOrderStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Redacted purchase-order state exposed only to its owning Prestataire. */
export interface PrestatairePurchaseOrder {
  id: number;
  reference: string;
  orderItemId: number;
  /** Immutable server snapshot from purchase_orders.amount. */
  amount: number;
  trackingNumber: string | null;
  carrier: string | null;
  shippingNotes: string | null;
  status: PurchaseOrderStatus;
  sentAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Prestataire order line; buyer-facing price snapshots are deliberately absent. */
export interface PrestataireOrderItem {
  id: number;
  orderId: number;
  offerId: number | null;
  productId: number | null;
  categoryId: number;
  quantity: number;
  netAmount: number;
  status: OrderItemStatus;
  createdAt: string;
  updatedAt: string;
  categoryTitle?: string;
  categoryTitleAr?: string;
  purchaseOrder: PrestatairePurchaseOrder;
}

/** Redacted order containing only the authenticated Prestataire's owned lines. */
export interface PrestataireOrder {
  id: number;
  reference: string;
  netTotal: number;
  status: OrderStatus;
  /** Aggregate state of only this Prestataire's purchase-order lines. */
  fulfillmentStatus: PurchaseOrderStatus;
  notes: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PrestataireOrderItem[];
}
