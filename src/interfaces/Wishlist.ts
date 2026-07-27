/**
 * WishlistItem interface.
 * Maps to `wishlist_items` table.
 *
 * Figma: "Profile / Ma liste de souhaits" screen.
 *
 * Exactly ONE of (categoryId, pneumaticId) must be non-null.
 * `categoryId` should target a leaf (level-3) category (A-5).
 * TODO A-15: confirm whether the user wishes a leaf category type, a specific offer,
 * or an in-stock listing.
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
}
