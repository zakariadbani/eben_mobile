/**
 * Offer interfaces — ferrailleur response to a request item.
 *
 * CONFIRMED A-9: offer granularity is PER REQUEST ITEM.
 * `requestItemId` is always set (NOT NULL).
 *
 * MARGIN-CRITICAL — three price columns (must all be stored at offer creation time):
 *
 *   priceFerrailleur   — raw price quoted by the ferrailleur
 *   priceClient        — priceFerrailleur × 1.06  (shown to buyer)
 *   priceBc            — priceFerrailleur × 0.94  (on the BC / bon de commande sent to ferrailleur)
 *
 * Platform spread = 12% total (6% from each side).
 * The mobile submits only priceFerrailleur. Laravel derives and stores priceClient
 * and priceBc so the device never computes margin-bearing values.
 *
 * ws.ts `dataOffer` fields: id, ref, comment, price, audio, images[].
 */

export type OfferStatus = 'pending' | 'validated' | 'rejected' | 'selected' | 'expired';
export type OfferAvailability = 'available' | 'not_available';

/**
 * Offer — one ferrailleur's price proposal for a single request item.
 * Maps to `offers` table.
 */
export interface Offer {
  id: number;
  /** ws.ts field: `ref`. e.g. "34852". */
  reference: string;
  requestId: number;
  ferrailleurId: number;
  /** CONFIRMED A-9: NOT NULL. One offer row per part line. */
  requestItemId: number;

  /**
   * MARGIN-CRITICAL server-returned price columns — always stored together.
   *
   * priceClient = priceFerrailleur × 1.06  (shown to buyer)
   * priceBc     = priceFerrailleur × 0.94  (on the BC sent to ferrailleur)
   *
   * priceBc maps to DB column `price_purchase_order`.
   */
  priceFerrailleur: number;
  priceClient: number;
  /** Maps to DB `price_purchase_order`. priceBc = priceFerrailleur × 0.94 */
  priceBc: number;

  /** ws.ts field: `comment`. */
  description: string | null;
  /** ws.ts field: `audio`. Voice note URL from ferrailleur. */
  audioUrl: string | null;
  availability: OfferAvailability;
  status: OfferStatus;
  adminNotes: string | null;
  validatedBy: number | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** ws.ts field: `images`. Array of photo URLs attached to the offer. */
  images?: string[];
}

export type ClientOffer = Omit<Offer, 'priceFerrailleur' | 'priceBc'>;

export interface ClientOfferItem extends ClientOffer {
  categoryTitle?: string;
  categoryTitleAr?: string;
  categoryImage?: string | null;
  ferrailleurName?: string;
}

/**
 * OfferItem — a resolved offer line in the context of a basket or order display.
 * Not a separate DB table; this is a view/aggregation type for the mobile app.
 */
export interface OfferItem extends Offer {
  /** Eagerly-loaded for display — derived from the linked request item's category. */
  categoryTitle?: string;
  categoryTitleAr?: string;
  categoryImage?: string | null;
  ferrailleurName?: string;
}

/** Redacted offer shape returned in the Prestataire namespace. */
export interface PrestataireOffer
  extends Omit<Offer, 'ferrailleurId' | 'priceClient' | 'priceBc' | 'validatedBy'> {
  /** Canonical values from the linked request item. */
  condition: import('./Request').PartCondition;
  quantity: number;
  images: string[];
  categoryTitle: string | null;
  categoryTitleAr: string | null;
  categoryImage: string | null;
  ferrailleurName: string | null;
  /** Canonical backend decision: an unshipped purchase order currently accepts shipment. */
  shippingEligible: boolean;
}

/** Shipment read-back returned for a Prestataire-owned offer. */
export interface PrestataireShipment {
  offerId: number;
  trackingNumber: string;
  carrier: string | null;
  notes: string | null;
  shippedAt: string | null;
}
