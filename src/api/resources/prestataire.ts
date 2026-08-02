/**
 * Prestataire (ferrailleur/partner) API resource.
 *
 * All functions return the standard typed envelopes (ApiResponse / Paginated).
 * Prices exposed here use priceFerrailleur — the partner's own price.
 * Buyer/platform price snapshots are absent from Prestataire responses.
 */

import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type {
  DashboardPeriod,
  PrestataireDashboardSeries,
  PrestataireDashboardStats,
} from '@/interfaces/PrestataireDashboard';
import type { Request } from '@/interfaces/Request';
import type {
  OfferStatus,
  PrestataireOffer,
  PrestataireShipment,
} from '@/interfaces/Offer';
import type { PrestataireProfile } from '@/interfaces/User';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { PrestataireWallet, Withdrawal } from '@/interfaces/Wallet';
import type { Notification } from '@/interfaces/Notification';
import type { PrestataireOrder, PrestatairePurchaseOrder } from '@/interfaces/Order';
import { getAllPages } from './paginate';
import { assertPositiveId } from './validate';

/**
 * GET /prestataire/dashboard
 * Returns KPI stats for the partner home screen (revenue, offer counts, payout).
 */
export async function getPrestataireStats(): Promise<ApiResponse<PrestataireDashboardStats>> {
  return apiClient.get<PrestataireDashboardStats>(
    '/prestataire/dashboard',
  ) as Promise<ApiResponse<PrestataireDashboardStats>>;
}

/** GET /prestataire/dashboard/series — server-aggregated metrics for one period. */
export async function getPrestataireDashboardSeries(
  period: DashboardPeriod,
): Promise<ApiResponse<PrestataireDashboardSeries>> {
  return apiClient.get<PrestataireDashboardSeries>(
    `/prestataire/dashboard/series?period=${encodeURIComponent(period)}`,
  ) as Promise<ApiResponse<PrestataireDashboardSeries>>;
}

/**
 * GET /prestataire/incoming-requests
 * Returns paginated pending requests that this prestataire can respond to.
 * These are the items in the "Offers inbox" — requests with status 'pending'.
 */
export async function getPrestataireIncomingRequests(): Promise<Paginated<Request>> {
  return getAllPages<Request>('/prestataire/incoming-requests');
}

/**
 * GET /prestataire/offers[?status=...]
 * Returns the prestataire's own submitted offers, optionally filtered by status.
 *
 * @param status — one of 'active' | 'accepted' | 'sent' | 'shipped'
 *   'active'   → status IN ('validated')          — awaiting client selection
 *   'accepted' → status IN ('selected')            — client chose this offer
 *   'sent'     → status IN ('pending')             — awaiting admin validation
 *   'shipped'  → offers whose live shipment/order state is shipped
 *   undefined  → all offers regardless of status
 */
export async function getPrestataireOffers(
  status?: 'active' | 'accepted' | 'sent' | 'shipped',
): Promise<Paginated<PrestataireOffer>> {
  const path = status
    ? `/prestataire/offers?status=${status}`
    : '/prestataire/offers';
  return getAllPages<PrestataireOffer>(path);
}

/**
 * GET /prestataire/offers/:id
 * Returns a single offer belonging to the current prestataire.
 */
export async function getPrestataireOffer(offerId: number): Promise<ApiResponse<PrestataireOffer>> {
  assertPositiveId(offerId, 'offer id');
  return apiClient.get<PrestataireOffer>(
    `/prestataire/offers/${offerId}`,
  ) as Promise<ApiResponse<PrestataireOffer>>;
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
  assertPositiveId(requestId, 'request id');
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
  assertPositiveId(requestId, 'request id');
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
  assertPositiveId(offerId, 'offer id');
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
  assertPositiveId(offerId, 'offer id');
  return apiClient.post<ShipOfferResult>(
    `/prestataire/offers/${offerId}/ship`,
    payload,
  ) as Promise<ApiResponse<ShipOfferResult>>;
}

export async function getOfferShipment(
  offerId: number,
): Promise<ApiResponse<PrestataireShipment | null>> {
  assertPositiveId(offerId, 'offer id');
  return apiClient.get<PrestataireShipment | null>(
    `/prestataire/offers/${offerId}/shipment`,
  ) as Promise<ApiResponse<PrestataireShipment | null>>;
}

// ── P4: partner orders ────────────────────────────────────────────────────────

/**
 * GET /prestataire/orders[?status=...]
 * Returns orders that contain at least one item from this prestataire.
 * Status filters use only the current partner's purchase-order lines.
 *
 * @param status — 'accepted' | 'shipped' | 'delivered' | undefined (all)
 */
export async function getPrestataireOrders(
  status?: 'accepted' | 'shipped' | 'delivered',
): Promise<Paginated<PrestataireOrder>> {
  const path = status
    ? `/prestataire/orders?status=${status}`
    : '/prestataire/orders';
  return getAllPages<PrestataireOrder>(path);
}

/**
 * GET /prestataire/orders/:orderId
 * Returns a single order (with items) relevant to this prestataire.
 */
export async function getPrestataireOrder(orderId: number): Promise<ApiResponse<PrestataireOrder>> {
  assertPositiveId(orderId, 'order id');
  return apiClient.get<PrestataireOrder>(
    `/prestataire/orders/${orderId}`,
  ) as Promise<ApiResponse<PrestataireOrder>>;
}

export async function acknowledgePurchaseOrder(
  purchaseOrderId: number,
): Promise<ApiResponse<PrestatairePurchaseOrder>> {
  assertPositiveId(purchaseOrderId, 'purchase order id');
  return apiClient.post<PrestatairePurchaseOrder>(
    `/prestataire/purchase-orders/${purchaseOrderId}/acknowledge`,
    {},
  ) as Promise<ApiResponse<PrestatairePurchaseOrder>>;
}

export async function preparePurchaseOrder(
  purchaseOrderId: number,
): Promise<ApiResponse<PrestatairePurchaseOrder>> {
  assertPositiveId(purchaseOrderId, 'purchase order id');
  return apiClient.post<PrestatairePurchaseOrder>(
    `/prestataire/purchase-orders/${purchaseOrderId}/prepare`,
    {},
  ) as Promise<ApiResponse<PrestatairePurchaseOrder>>;
}

/** Ships an owned purchase order for either an offer-backed or product-backed line. */
export async function shipPurchaseOrder(
  purchaseOrderId: number,
  payload: ShipOfferPayload,
): Promise<ApiResponse<PrestatairePurchaseOrder>> {
  assertPositiveId(purchaseOrderId, 'purchase order id');
  return apiClient.post<PrestatairePurchaseOrder>(
    `/prestataire/purchase-orders/${purchaseOrderId}/ship`,
    payload,
  ) as Promise<ApiResponse<PrestatairePurchaseOrder>>;
}

// ── P5: profile / company / wallet / history / notifications ─────────────────

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UpdatePrestataireProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  /** Owned temporary path returned by POST /uploads/images, or null to clear. */
  avatar?: string | null;
  /** Required by Laravel when phone or email changes. */
  currentPassword?: string;
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
  const textPayload: UpdatePrestataireProfilePayload = {
    ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
    ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.avatar !== undefined ? { avatar: payload.avatar } : {}),
    ...(payload.currentPassword !== undefined
      ? { currentPassword: payload.currentPassword }
      : {}),
  };
  return apiClient.put<PrestataireProfile>(
    '/prestataire/profile',
    textPayload,
  ) as Promise<ApiResponse<PrestataireProfile>>;
}

// ── Company ───────────────────────────────────────────────────────────────────

export type UpdatePrestataireCompanyPayload = Partial<
  Omit<PrestataireCompany, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>
> & {
  /** Write-only bank fields; Laravel never returns them in PrestataireCompany. */
  bankRib?: string | null;
  bankName?: string | null;
};

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

export interface ConfirmWithdrawalPayload {
  code: string;
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

/** POST /prestataire/wallet/withdrawals/:id/confirm */
export async function confirmWithdrawal(
  withdrawalId: number,
  code: string,
): Promise<ApiResponse<Withdrawal>> {
  const payload: ConfirmWithdrawalPayload = { code };
  return apiClient.post<Withdrawal>(
    `/prestataire/wallet/withdrawals/${withdrawalId}/confirm`,
    payload,
  ) as Promise<ApiResponse<Withdrawal>>;
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
export async function getPrestataireOffersHistory(): Promise<Paginated<PrestataireOffer>> {
  return getAllPages<PrestataireOffer>('/prestataire/offers/history');
}

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * GET /prestataire/notifications
 * Returns the prestataire's notification list (most-recent first).
 */
export async function getPrestataireNotifications(): Promise<Paginated<Notification>> {
  return getAllPages<Notification>('/prestataire/notifications');
}

/**
 * POST /prestataire/notifications/:id/read
 * Marks a single notification as read for the current prestataire.
 */
export async function markPrestataireNotificationRead(
  id: number,
): Promise<ApiResponse<Notification>> {
  assertPositiveId(id, 'notification id');
  return apiClient.post<Notification>(
    `/prestataire/notifications/${id}/read`,
    {},
  ) as Promise<ApiResponse<Notification>>;
}

export interface MarkAllPrestataireNotificationsReadResult {
  updated: number;
}

/** POST /prestataire/notifications/read-all */
export async function markAllPrestataireNotificationsRead(): Promise<
  ApiResponse<MarkAllPrestataireNotificationsReadResult>
> {
  return apiClient.post<MarkAllPrestataireNotificationsReadResult>(
    '/prestataire/notifications/read-all',
    {},
  ) as Promise<ApiResponse<MarkAllPrestataireNotificationsReadResult>>;
}

// Re-export the status type for convenience so callers can import from '@/api'
export type { DashboardPeriod, OfferStatus };
