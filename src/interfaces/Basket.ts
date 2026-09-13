/**
 * Basket interfaces — client's active cart before checkout.
 * Maps to `baskets` and `basket_items` tables.
 *
 * One basket per user (unique constraint on user_id — see assumption A-10).
 */

/**
 * BasketItem — one line in the basket: a selected offer or a stock product.
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
  /**
   * Offer lines: the request item (part) the offer answers; null for product lines.
   * Optional only for servers that predate the field — treat undefined as unknown.
   */
  requestItemId?: number | null;
  /** Offer lines: part brand of the request item (e.g. "Bosch"); null when none / product lines. */
  brandName?: string | null;
  brandNameAr?: string | null;
  /** Offer lines: offer reference (e.g. "OFF-TNWJWHLB"); null for product lines. */
  offerReference?: string | null;
  /** Offer lines: ISO deadline of the source request; null for product lines. */
  expiresAt?: string | null;
}

/** Basket — the active cart for a user. */
export interface Basket {
  id: number;
  userId: number;
  /** Source request the basket was built from; null for a standalone basket. */
  requestId: number | null;
  premium: boolean;
  /** Server-owned Premium fee; zero when Premium is disabled. */
  premiumFee: number;
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
