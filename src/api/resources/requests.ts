import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Request, RequestSummary, PartCondition } from '@/interfaces/Request';
import type { ClientOffer } from '@/interfaces/Offer';
import type { Basket } from '@/interfaces/Basket';

/** Paginated list of the current user's request summaries. */
export async function getRequests(): Promise<Paginated<RequestSummary>> {
  return apiClient.get<RequestSummary>('/requests') as Promise<Paginated<RequestSummary>>;
}

/** Single request with items and images eagerly loaded. */
export async function getRequest(id: number): Promise<ApiResponse<Request>> {
  return apiClient.get<Request>(`/requests/${id}`) as Promise<ApiResponse<Request>>;
}

/** All validated offers for a given request (CONFIRMED A-9: per request item). */
export async function getOffers(requestId: number): Promise<Paginated<ClientOffer>> {
  return apiClient.get<ClientOffer>(`/requests/${requestId}/offers`) as Promise<Paginated<ClientOffer>>;
}

/** Single offer by id. */
export async function getOffer(id: number): Promise<ApiResponse<ClientOffer>> {
  return apiClient.get<ClientOffer>(`/offers/${id}`) as Promise<ApiResponse<ClientOffer>>;
}

export async function acceptOffer(id: number): Promise<ApiResponse<Basket>> {
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
    categoryTitle?: string;
    categoryTitleAr?: string;
  }[];
  notes?: string | null;
  images?: string[];
}

export interface CreateRequestResult {
  id: number;
  reference: string;
}

/** Create a new request draft with its line items. Mock-resolves synchronously. */
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

/** Transition a draft request to "pending" (sends it to ferrailleurs). Mock-resolves. */
export async function sendRequest(
  id: number,
): Promise<ApiResponse<SendRequestResult>> {
  return apiClient.post<SendRequestResult>(`/requests/${id}/send`, {}) as Promise<
    ApiResponse<SendRequestResult>
  >;
}
