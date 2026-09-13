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

/** Canonical Laravel dashboard aggregation periods. */
export type DashboardPeriod = '1j' | '7j' | '1m' | '6m' | '1a' | 'max';
export type DashboardComparisonPeriod = '7d' | '30d' | '90d';

export interface DashboardComparison {
  period: DashboardComparisonPeriod;
  sales: number;
  salesPrev: number;
  requestsReceived: number;
  requestsReceivedPrev: number;
  offersSent: number;
  offersSentPrev: number;
  accepted: number;
  acceptedPrev: number;
}

/** One server-aggregated point in a Prestataire dashboard series. */
export interface PrestataireDashboardSeriesBucket {
  label: string;
  revenue: number;
  offersReceived: number;
  offersActive: number;
  offersAccepted: number;
  offersSent: number;
  pendingPayout: number;
}

export interface PrestataireTopProduct {
  title: string;
  titleAr: string;
  image: string | null;
  soldCount: number;
}

/** Returned by GET /prestataire/dashboard/series. */
export interface PrestataireDashboardSeries {
  period: DashboardPeriod;
  buckets: PrestataireDashboardSeriesBucket[];
  topProducts: PrestataireTopProduct[];
}

/** Small summary row for a recent offer shown in the dashboard feed. */
export interface RecentOfferSummary {
  offerId: number;
  /** Item id within the request — used to deep-link the fill screen to this exact line. */
  itemId?: number | null;
  offerReference: string;
  requestReference: string;
  /** The ferrailleur's own price (priceFerrailleur). */
  priceFerrailleur: number;
  quantity: number;
  status: OfferStatus;
  /** Part category label (French). */
  categoryTitle: string | null;
  categoryTitleAr: string | null;
  createdAt: string;
  /** ISO timestamp when this offer expires — used for the countdown chip. */
  expiresAt: string | null;
  /** Category image URL returned by Laravel. */
  categoryImage: string | null;
  brandName?: string | null;
  brandNameAr?: string | null;
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
  missedRequestsCount: number;
  /** Wallet balance available for withdrawal — MAD. */
  pendingPayout: number;
  comparison: DashboardComparison;
  /** Latest N offers for the dashboard feed. Optional — may be absent on summary-only calls. */
  recentOffers?: RecentOfferSummary[];
}
