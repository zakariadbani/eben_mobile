/**
 * Product interface — a part listing available for direct purchase (en-stock / occasion).
 *
 * Maps to the `products` (or `listings`) table on the backend — distinct from
 * the request-flow `offers` table (which is a B2B quote from a ferrailleur).
 *
 * Bilingual convention (CONFIRMED A-16):
 *   French is the primary field (`title`), Arabic is the `Ar` suffix (`titleAr`)
 *   matching the DB in-row `_ar` column convention.
 */

export type ProductCondition = 'en_stock' | 'occasion';

export type ProductReportReason =
  | 'wrong_description'
  | 'wrong_price'
  | 'fake_product'
  | 'inappropriate'
  | 'other';

/**
 * Product — a part listing available for direct purchase.
 *
 * Results screen (results.tsx) inline `MockProduct` fields are a subset;
 * this interface is the authoritative superset.
 */
export interface Product {
  id: number;

  // ── Core identification ─────────────────────────────────────────────────────
  /** French title — primary display field. */
  title: string;
  /** Arabic title — shown when i18n language is "ar". */
  titleAr: string;
  /** Condition: new-in-stock or used/occasion. */
  condition: ProductCondition;
  /** Manufacturer article / part number shown below the title. */
  articleNumber: string;

  // ── Pricing ─────────────────────────────────────────────────────────────────
  /** Client price returned by the public API and shown to the buyer. */
  price: number;
  /**
   * Promotional/discounted client price.
   * When set, `price` is the original crossed-out price and `promoPrice` is the
   * green sale price shown with the Promo badge.
   */
  promoPrice?: number | null;

  // ── Media ───────────────────────────────────────────────────────────────────
  /**
   * Ordered list of image URLs (first element is the hero image).
   * May be empty for listings without photos.
   */
  images: string[];

  // ── Description ─────────────────────────────────────────────────────────────
  /** Long French description. */
  description: string;
  /** Long Arabic description. */
  descriptionAr: string;

  // ── Category & classification ───────────────────────────────────────────────
  /** Leaf (level-3) category id — matches Category.id with level === 3. */
  categoryId: number;
  /** Eagerly-loaded French category label for display. */
  categoryName: string;
  /** Eagerly-loaded Arabic category label for display. */
  categoryNameAr: string;

  // ── Seller / brand info ─────────────────────────────────────────────────────
  /** Part / manufacturer brand name (e.g. "Bosch", "Brembo"). */
  brand?: string | null;
  /** Display name of the seller / ferrailleur who listed the part. */
  sellerName?: string | null;
  /** Seller's user id — used for navigation to seller profile. */
  sellerId?: number | null;

  // ── Ratings ─────────────────────────────────────────────────────────────────
  /** Aggregate star rating (0–5, float). Absent until at least 1 review. */
  rating?: number;
  /** Total number of reviews. */
  reviewsCount: number;

  // ── Inventory / logistics ───────────────────────────────────────────────────
  /** Available stock quantity. */
  stock: number;
  /** Warranty period as a localised human-readable string (e.g. "6 mois"). */
  warranty?: string | null;
  /** Arabic warranty text. */
  warrantyAr?: string | null;

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}

/**
 * ProductSummary — lightweight shape used in list/results screens.
 * Corresponds to the inline `MockProduct` type in results.tsx (superset-compatible).
 */
export interface ProductSummary {
  id: number;
  title: string;
  titleAr: string;
  condition: ProductCondition;
  articleNumber: string;
  price: number;
  promoPrice?: number;
  images: string[];
  categoryName: string;
  categoryNameAr: string;
  brand?: string;
  rating?: number;
  reviewsCount?: number;
}
