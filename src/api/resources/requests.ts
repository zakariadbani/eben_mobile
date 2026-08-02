import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Request, RequestSummary, PartCondition } from '@/interfaces/Request';
import type { ClientOfferItem } from '@/interfaces/Offer';
import type { Basket } from '@/interfaces/Basket';
import { getAllPages } from './paginate';
import { assertPositiveId } from './validate';

/** Paginated list of the current user's request summaries. */
export async function getRequests(): Promise<Paginated<RequestSummary>> {
  return getAllPages<RequestSummary>('/requests');
}

/** Single request with items and images eagerly loaded. */
export async function getRequest(id: number): Promise<ApiResponse<Request>> {
  assertPositiveId(id, 'requestId');
  return apiClient.get<Request>(`/requests/${id}`) as Promise<ApiResponse<Request>>;
}

/** All validated offers for a given request (CONFIRMED A-9: per request item). */
export async function getOffers(requestId: number): Promise<Paginated<ClientOfferItem>> {
  assertPositiveId(requestId, 'requestId');
  return getAllPages<ClientOfferItem>(`/requests/${requestId}/offers`);
}

/** Single offer by id. */
export async function getOffer(id: number): Promise<ApiResponse<ClientOfferItem>> {
  assertPositiveId(id, 'offerId');
  return apiClient.get<ClientOfferItem>(`/offers/${id}`) as Promise<ApiResponse<ClientOfferItem>>;
}

export async function acceptOffer(id: number): Promise<ApiResponse<Basket>> {
  assertPositiveId(id, 'offerId');
  return apiClient.post<Basket>(`/offers/${id}/accept`, {});
}

// ── Request builder (create + send) ──────────────────────────────────────────

export interface CreateRequestPayload {
  vehicleId: number;
  items: {
    categoryId: number;
    quantity: number;
    condition: PartCondition;
    notes?: string | null;
    /** Mock-only display enrichment; production callers should send categoryId only. */
    categoryTitle?: string;
    /** Mock-only display enrichment; production callers should send categoryId only. */
    categoryTitleAr?: string;
  }[];
  notes?: string | null;
  images?: string[];
}

export interface CreateRequestResult {
  id: number;
  reference: string;
}

/** Create a new request draft with its line items. */
export async function createRequest(
  payload: CreateRequestPayload,
): Promise<ApiResponse<CreateRequestResult>> {
  return apiClient.post<CreateRequestResult>('/requests', payload) as Promise<
    ApiResponse<CreateRequestResult>
  >;
}

export interface SendRequestResult {
  id: number;
  reference: string;
  status: 'pending';
}

/** Transition a draft request to "pending" (sends it to ferrailleurs). */
export async function sendRequest(
  id: number,
): Promise<ApiResponse<SendRequestResult>> {
  assertPositiveId(id, 'requestId');
  return apiClient.post<SendRequestResult>(`/requests/${id}/send`, {}) as Promise<
    ApiResponse<SendRequestResult>
  >;
}
