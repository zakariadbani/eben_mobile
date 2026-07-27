/**
 * PrestataireDashboard interfaces — ferrailleur/partner dashboard stats.
 *
 * Shown on the partner home screen: revenue, offer counts, and pending payout.
 *
 * Pricing note: the dashboard always works in priceFerrailleur (the partner's
 * own price). priceBc / priceClient are available on the Offer entity itself
 * but are NOT shown on this summary.
 */

import type { OfferStatus } from './Offer';

/** Small summary row for a recent offer shown in the dashboard feed. */
export interface RecentOfferSummary {
  offerId: number;
  offerReference: string;
  requestReference: string;
  /** The ferrailleur's own price (priceFerrailleur). */
  priceFerrailleur: number;
  status: OfferStatus;
  /** Part category label (French). */
  categoryTitle?: string;
  categoryTitleAr?: string;
  createdAt: string;
  /** ISO timestamp when this offer expires — used for the countdown chip. */
  expiresAt?: string;
  /** Category image resolved at mock-serve time via categoryImageFor(). */
  categoryImage?: ReturnType<typeof require> | string | null;
}

/**
 * PrestataireDashboardStats — aggregated KPIs for the partner dashboard.
 * Returned by GET /prestataire/dashboard.
 */
export interface PrestataireDashboardStats {
  /** Total revenue (sum of priceFerrailleur on accepted offers) in last 30 days — MAD. */
  revenue30d: number;
  /** All incoming requests visible to this prestataire (inbox). */
  offersReceivedCount: number;
  /** Offers this prestataire has submitted that are currently active/pending. */
  offersActiveCount: number;
  /** Offers this prestataire has submitted that have been accepted by a client. */
  offersAcceptedCount: number;
  /** Total offers sent (all statuses included). */
  offersSentCount: number;
  /** Wallet balance available for withdrawal — MAD. */
  pendingPayout: number;
  /** Latest N offers for the dashboard feed. Optional — may be absent on summary-only calls. */
  recentOffers?: RecentOfferSummary[];
}
