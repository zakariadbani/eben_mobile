import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Order } from '@/interfaces/Order';
import type { PaymentMethod } from '@/interfaces/Payment';
import { getAllPages } from './paginate';

/** Paginated list of the current user's orders. */
export async function getOrders(): Promise<Paginated<Order>> {
  return getAllPages<Order>('/orders');
}

/** Single order with items eagerly loaded. */
export async function getOrder(id: number): Promise<ApiResponse<Order>> {
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('order id must be a positive integer');
  return apiClient.get<Order>(`/orders/${id}`) as Promise<ApiResponse<Order>>;
}

/** Cancel an owned pending order and return the canonical transitioned record. */
export async function cancelOrder(id: number): Promise<ApiResponse<Order>> {
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('order id must be a positive integer');
  return apiClient.post<Order>(`/orders/${id}/cancel`, {});
}

/** Payload for placing a new order from the basket. */
export interface PlaceOrderPayload {
  addressId: number;
  paymentMethod: 'cod';
  notes?: string | null;
}

/** Place a new order — converts the active basket into a confirmed order. */
export async function placeOrder(
  payload: PlaceOrderPayload,
): Promise<ApiResponse<Order>> {
  if (!Number.isSafeInteger(payload.addressId) || payload.addressId < 1) {
    throw new TypeError('addressId must be a positive integer');
  }
  if (payload.paymentMethod !== 'cod') {
    throw new TypeError('Only cash on delivery is currently supported');
  }
  return apiClient.post<Order>('/orders', payload);
}

/** Available payment methods for the current user. */
export async function getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
  return apiClient.get<PaymentMethod[]>('/payment-methods') as Promise<
    ApiResponse<PaymentMethod[]>
  >;
}
