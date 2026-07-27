/**
 * Prestataire (ferrailleur/partner) API resource.
 *
 * All functions return the standard typed envelopes (ApiResponse / Paginated).
 * Prices exposed here use priceFerrailleur — the partner's own price.
 * priceClient and priceBc are present on the Offer entity but the dashboard
 * and offers screens should render priceFerrailleur.
 */

import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { PrestataireDashboardStats } from '@/interfaces/PrestataireDashboard';
import type { Request } from '@/interfaces/Request';
import type { Offer, OfferStatus } from '@/interfaces/Offer';
import type { PrestataireProfile } from '@/interfaces/User';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { PrestataireWallet, Withdrawal } from '@/interfaces/Wallet';
import type { Notification } from '@/interfaces/Notification';
import type { Order } from '@/interfaces/Order';
import type { MockShipment } from '../mock/goldenStore';

/**
 * GET /prestataire/dashboard
 * Returns KPI stats for the partner home screen (revenue, offer counts, payout).
 */
export async function getPrestataireStats(): Promise<ApiResponse<PrestataireDashboardStats>> {
  return apiClient.get<PrestataireDashboardStats>(
    '/prestataire/dashboard',
  ) as Promise<ApiResponse<PrestataireDashboardStats>>;
}

/**
 * GET /prestataire/incoming-requests
 * Returns paginated pending requests that this prestataire can respond to.
 * These are the items in the "Offers inbox" — requests with status 'pending'.
 */
export async function getPrestataireIncomingRequests(): Promise<Paginated<Request>> {
  return apiClient.get<Request>(
    '/prestataire/incoming-requests',
  ) as Promise<Paginated<Request>>;
}

/**
 * GET /prestataire/offers[?status=...]
 * Returns the prestataire's own submitted offers, optionally filtered by status.
 *
 * @param status — one of 'active' | 'accepted' | 'sent' | 'shipped'
 *   'active'   → status IN ('validated')          — awaiting client selection
 *   'accepted' → status IN ('selected')            — client chose this offer
 *   'sent'     → status IN ('pending')             — awaiting admin validation
 *   'shipped'  → offers whose linked order is shipped (uses adminNotes field in mock)
 *   undefined  → all offers regardless of status
 */
export async function getPrestataireOffers(
  status?: 'active' | 'accepted' | 'sent' | 'shipped',
): Promise<Paginated<Offer>> {
  const path = status
    ? `/prestataire/offers?status=${status}`
    : '/prestataire/offers';
  return apiClient.get<Offer>(path) as Promise<Paginated<Offer>>;
}

/**
 * GET /prestataire/offers/:id
 * Returns a single offer belonging to the current prestataire.
 */
export async function getPrestataireOffer(offerId: number): Promise<ApiResponse<Offer>> {
  return apiClient.get<Offer>(
    `/prestataire/offers/${offerId}`,
  ) as Promise<ApiResponse<Offer>>;
}

// ── P3 sub-flow A: offer fill / decline / resend ─────────────────────────────

/**
 * Payload sent when a prestataire submits their offer for a request.
 * One entry per request item — the server derives priceClient and priceBc
 * from priceFerrailleur.
 */
export interface SubmitOfferLinePayload {
  requestItemId: number;
  /** The ferrailleur's net price (partner-facing). */
  priceFerrailleur: number;
  condition: 'en_stock' | 'occasion';
  description: string | null;
  images: string[];
}

export interface SubmitOfferPayload {
  lines: SubmitOfferLinePayload[];
}

export interface SubmitOfferResult {
  success: boolean;
  offerId: number;
}

export interface DeclineRequestResult {
  success: boolean;
  requestId: number;
}

export interface ResendOfferResult {
  success: boolean;
  offerId: number;
}

/**
 * POST /prestataire/requests/:requestId/offers
 * Submits a new multi-line offer for an incoming request.
 */
export async function submitOffer(
  requestId: number,
  payload: SubmitOfferPayload,
): Promise<ApiResponse<SubmitOfferResult>> {
  return apiClient.post<SubmitOfferResult>(
    `/prestataire/requests/${requestId}/offers`,
    payload,
  ) as Promise<ApiResponse<SubmitOfferResult>>;
}

/**
 * POST /prestataire/requests/:requestId/decline
 * Declines an incoming request — partner will not respond to it.
 */
export async function declineRequest(
  requestId: number,
  payload?: { reason?: string; comment?: string },
): Promise<ApiResponse<DeclineRequestResult>> {
  return apiClient.post<DeclineRequestResult>(
    `/prestataire/requests/${requestId}/decline`,
    payload ?? {},
  ) as Promise<ApiResponse<DeclineRequestResult>>;
}

/**
 * POST /prestataire/offers/:offerId/resend
 * Resends an existing offer as-is (same price, condition, photos).
 */
export async function resendOffer(
  offerId: number,
): Promise<ApiResponse<ResendOfferResult>> {
  return apiClient.post<ResendOfferResult>(
    `/prestataire/offers/${offerId}/resend`,
    {},
  ) as Promise<ApiResponse<ResendOfferResult>>;
}

// ── P3 sub-flow B: ship offer ─────────────────────────────────────────────────

/**
 * Payload sent when the ferrailleur marks an accepted offer as shipped.
 */
export interface ShipOfferPayload {
  /** Carrier tracking / waybill number. */
  trackingNumber: string;
  /** Carrier name (e.g. "Amana", "CTM"). Optional. */
  carrier?: string;
  /** Free-text shipping notes. Optional. */
  notes?: string;
}

export interface ShipOfferResult {
  offerId: number;
  shipped: boolean;
}

/**
 * POST /prestataire/offers/:offerId/ship
 * Mark an accepted offer as shipped — submit tracking/delivery details.
 */
export async function shipOffer(
  offerId: number,
  payload: ShipOfferPayload,
): Promise<ApiResponse<ShipOfferResult>> {
  return apiClient.post<ShipOfferResult>(
    `/prestataire/offers/${offerId}/ship`,
    payload,
  ) as Promise<ApiResponse<ShipOfferResult>>;
}

export async function getOfferShipment(
  offerId: number,
): Promise<ApiResponse<MockShipment | null>> {
  return apiClient.get<MockShipment | null>(
    `/prestataire/offers/${offerId}/shipment`,
  ) as Promise<ApiResponse<MockShipment | null>>;
}

// ── P4: partner orders ────────────────────────────────────────────────────────

/**
 * GET /prestataire/orders[?status=...]
 * Returns orders that contain at least one item from this prestataire.
 * On the partner side, "accepted" means offer.status='selected' and the order
 * exists; "shipped" = order.status='shipped'; "delivered" = order.status='delivered'.
 *
 * @param status — 'accepted' | 'shipped' | 'delivered' | undefined (all)
 */
export async function getPrestataireOrders(
  status?: 'accepted' | 'shipped' | 'delivered',
): Promise<Paginated<Order>> {
  const path = status
    ? `/prestataire/orders?status=${status}`
    : '/prestataire/orders';
  return apiClient.get<Order>(path) as Promise<Paginated<Order>>;
}

/**
 * GET /prestataire/orders/:orderId
 * Returns a single order (with items) relevant to this prestataire.
 */
export async function getPrestataireOrder(orderId: number): Promise<ApiResponse<Order>> {
  return apiClient.get<Order>(
    `/prestataire/orders/${orderId}`,
  ) as Promise<ApiResponse<Order>>;
}

// ── P5: profile / company / wallet / history / notifications ─────────────────

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UpdatePrestataireProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  avatar?: string | null;
}

/**
 * GET /prestataire/profile
 * Returns the current prestataire's profile (name, phone, email, avatar,
 * ferrailleur rating, status).
 */
export async function getPrestataireProfile(): Promise<ApiResponse<PrestataireProfile>> {
  return apiClient.get<PrestataireProfile>(
    '/prestataire/profile',
  ) as Promise<ApiResponse<PrestataireProfile>>;
}

/**
 * PUT /prestataire/profile
 * Updates the prestataire's personal profile fields.
 */
export async function updatePrestataireProfile(
  payload: UpdatePrestataireProfilePayload,
): Promise<ApiResponse<PrestataireProfile>> {
  return apiClient.put<PrestataireProfile>(
    '/prestataire/profile',
    payload,
  ) as Promise<ApiResponse<PrestataireProfile>>;
}

// ── Company ───────────────────────────────────────────────────────────────────

export type UpdatePrestataireCompanyPayload = Partial<
  Omit<PrestataireCompany, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>
>;

/**
 * GET /prestataire/company
 * Returns the current prestataire's company (legal name, ICE/RC/tax id, address).
 */
export async function getPrestataireCompany(): Promise<ApiResponse<PrestataireCompany>> {
  return apiClient.get<PrestataireCompany>(
    '/prestataire/company',
  ) as Promise<ApiResponse<PrestataireCompany>>;
}

/**
 * PUT /prestataire/company
 * Updates the prestataire's company information.
 * The `status` field can only be changed by an admin — it is excluded from the payload.
 */
export async function updatePrestataireCompany(
  payload: UpdatePrestataireCompanyPayload,
): Promise<ApiResponse<PrestataireCompany>> {
  return apiClient.put<PrestataireCompany>(
    '/prestataire/company',
    payload,
  ) as Promise<ApiResponse<PrestataireCompany>>;
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export interface RequestWithdrawalPayload {
  amount: number;
  /** Payment method. Defaults to 'virement' if omitted. */
  method?: 'virement' | 'cheque' | 'cash';
}

export interface RequestWithdrawalResult {
  withdrawal: Withdrawal;
  /** True when an additional verification step (OTP / admin review) is needed. */
  requiresVerification: boolean;
}

/**
 * GET /prestataire/wallet
 * Returns the prestataire's wallet: current balance, pending payout, and full
 * transaction history (most-recent first).
 */
export async function getPrestataireWallet(): Promise<ApiResponse<PrestataireWallet>> {
  return apiClient.get<PrestataireWallet>(
    '/prestataire/wallet',
  ) as Promise<ApiResponse<PrestataireWallet>>;
}

/**
 * POST /prestataire/wallet/withdraw
 * Requests a withdrawal of `amount` MAD via the given method.
 * The mock always triggers a verification step.
 */
export async function requestWithdrawal(
  amount: number,
  method?: 'virement' | 'cheque' | 'cash',
): Promise<ApiResponse<RequestWithdrawalResult>> {
  const payload: RequestWithdrawalPayload = { amount, ...(method ? { method } : {}) };
  return apiClient.post<RequestWithdrawalResult>(
    '/prestataire/wallet/withdraw',
    payload,
  ) as Promise<ApiResponse<RequestWithdrawalResult>>;
}

/**
 * GET /prestataire/wallet/withdrawals
 * Returns all withdrawal requests made by the current prestataire.
 */
export async function getWithdrawals(): Promise<Paginated<Withdrawal>> {
  return apiClient.get<Withdrawal>(
    '/prestataire/wallet/withdrawals',
  ) as Promise<Paginated<Withdrawal>>;
}

// ── Offers history ────────────────────────────────────────────────────────────

/**
 * GET /prestataire/offers/history
 * Returns the prestataire's full offer history (all statuses, all time).
 * For order history use `getPrestataireOrders`.
 */
export async function getPrestataireOffersHistory(): Promise<Paginated<Offer>> {
  return apiClient.get<Offer>(
    '/prestataire/offers/history',
  ) as Promise<Paginated<Offer>>;
}

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * GET /prestataire/notifications
 * Returns the prestataire's notification list (most-recent first).
 */
export async function getPrestataireNotifications(): Promise<Paginated<Notification>> {
  return apiClient.get<Notification>(
    '/prestataire/notifications',
  ) as Promise<Paginated<Notification>>;
}

/**
 * POST /prestataire/notifications/:id/read
 * Marks a single notification as read for the current prestataire.
 */
export async function markPrestataireNotificationRead(
  id: number,
): Promise<ApiResponse<Notification>> {
  return apiClient.post<Notification>(
    `/prestataire/notifications/${id}/read`,
    {},
  ) as Promise<ApiResponse<Notification>>;
}

// Re-export the status type for convenience so callers can import from '@/api'
export type { OfferStatus };
