/**
 * Basket interfaces — client's active cart before checkout.
 * Maps to `baskets` and `basket_items` tables.
 *
 * One basket per user (unique constraint on user_id — see assumption A-10).
 */

/**
 * BasketItem — one selected offer line in the basket.
 *
 * `unitPrice` is a snapshot of offer.priceClient at the time the item was added.
 * `categoryId` is denormalised from the offer's request item for display (A-5).
 */
export interface BasketItem {
  id: number;
  basketId: number;
  offerId: number;
  /** Leaf (level-3) category — denormalised for display. CONFIRMED A-5. */
  categoryId: number;
  quantity: number;
  /** Snapshot of priceClient at basket-addition time. */
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded display data. */
  categoryTitle?: string;
  categoryTitleAr?: string;
  categoryImage?: ReturnType<typeof require> | string | null;
}

/** Basket — the active cart for a user. */
export interface Basket {
  id: number;
  userId: number;
  /** Source request the basket was built from; null for a standalone basket. */
  requestId: number | null;
  /** Server-owned item subtotal. Never recompute on-device. */
  subtotal: number;
  /** Server-owned voucher discount. Never recompute on-device. */
  discountAmount: number;
  /** Server-owned delivery charge. Never recompute on-device. */
  shippingFee: number;
  /** Server-owned tax snapshot. Never recompute on-device. */
  taxAmount: number;
  /** Server-owned payable total. Never recompute on-device. */
  total: number;
  createdAt: string;
  updatedAt: string;
  items?: BasketItem[];
}
