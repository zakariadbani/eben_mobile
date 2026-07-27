import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Order, PaymentMethodType } from '@/interfaces/Order';
import type { PaymentMethod } from '@/interfaces/Payment';

/** Paginated list of the current user's orders. */
export async function getOrders(): Promise<Paginated<Order>> {
  return apiClient.get<Order>('/orders') as Promise<Paginated<Order>>;
}

/** Single order with items eagerly loaded. */
export async function getOrder(id: number): Promise<ApiResponse<Order>> {
  return apiClient.get<Order>(`/orders/${id}`) as Promise<ApiResponse<Order>>;
}

/** Payload for placing a new order from the basket. */
export interface PlaceOrderPayload {
  addressId: number;
  paymentMethod: PaymentMethodType;
  notes?: string | null;
}

/** Place a new order — converts the active basket into a confirmed order. */
export async function placeOrder(
  payload: PlaceOrderPayload,
): Promise<ApiResponse<Order>> {
  return apiClient.post<Order>('/orders', payload);
}

/** Available payment methods for the current user. */
export async function getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
  return apiClient.get<PaymentMethod[]>('/payment-methods') as Promise<
    ApiResponse<PaymentMethod[]>
  >;
}
