/**
 * WishlistItem interface.
 * Maps to `wishlist_items` table.
 *
 * Figma: "Profile / Ma liste de souhaits" screen.
 *
 * Exactly ONE of (categoryId, pneumaticId) must be non-null.
 * Parts items are keyed by `productId` (`categoryId` is still populated with
 * the product's leaf level-3 category); tyre items are keyed by `pneumaticId`.
 */
export interface WishlistItem {
  id: number;
  userId: number;
  /**
   * Leaf (level-3) category being wishlisted.
   * Null when `pneumaticId` is set (tyre wishlist item).
   */
  categoryId: number | null;
  /**
   * Pneumatic/tyre id being wishlisted.
   * Null when `categoryId` is set (parts wishlist item).
   */
  pneumaticId: number | null;
  createdAt: string;
  /** Eagerly-loaded category display data. */
  categoryTitle?: string;
  categoryTitleAr?: string;
  categoryImage?: ReturnType<typeof require> | string | null;
  /** Product-level fields (populated when the wishlist item is product-keyed). */
  price?: number;
  articleNumber?: string;
  condition?: string;
  /** Product id — set for product-keyed items; null/absent for tyre items. */
  productId?: number | null;
  /** Product title (French) — set for product-keyed items; absent for tyre items. */
  productTitle?: string;
  /** Product title (Arabic) — set for product-keyed items; absent for tyre items. */
  productTitleAr?: string;
  /** Product image URL — set for product-keyed items; absent for tyre items. */
  productImage?: string | null;
  /** Discounted price — set when the product has an active promo; absent otherwise. */
  promoPrice?: number | null;
}
