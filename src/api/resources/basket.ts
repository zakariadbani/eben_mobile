/**
 * Basket resource — the authenticated user's active cart.
 *
 * One basket per user (unique constraint on user_id — assumption A-10).
 *
 * MOCK MODE (current): resolves from mockBasket via the registry.
 * SWAP POINT: replace mock entries in registry.ts with real fetch targets
 *   when the backend `/basket` endpoint is live.
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type { Basket } from '@/interfaces/Basket';

/**
 * Fetch the current user's basket (with items eager-loaded).
 */
export async function getBasket(): Promise<ApiResponse<Basket>> {
  return apiClient.get<Basket>('/basket') as Promise<ApiResponse<Basket>>;
}

/**
 * Add a product to the basket (or increment quantity if already present).
 * Mock mode always resolves with the updated basket.
 *
 * @param productId - The product's numeric id.
 * @param quantity  - Number of units to add (default 1).
 */
export async function addToBasket(
  productId: number,
  quantity: number = 1,
): Promise<ApiResponse<Basket>> {
  return apiClient.post<Basket>('/basket/items', { productId, quantity });
}

/**
 * Apply a coupon/promo code to the basket.
 * Returns the updated basket with the discount reflected.
 *
 * @param code - The coupon code string entered by the user.
 */
export interface CouponResult {
  valid: boolean;
  discountAmount: number;
  code: string;
}

export async function applyCoupon(
  code: string,
): Promise<ApiResponse<CouponResult>> {
  return apiClient.post<CouponResult>('/basket/coupon', { code });
}

/**
 * Update the quantity of a basket item.
 * Passing qty = 0 removes the item from the basket.
 *
 * @param itemId   - The BasketItem id to update.
 * @param quantity - New desired quantity (>= 1).
 */
export async function updateBasketItem(
  itemId: number,
  quantity: number,
): Promise<ApiResponse<Basket>> {
  return apiClient.put<Basket>(`/basket/items/${itemId}`, { quantity });
}

/**
 * Remove a single item from the basket entirely.
 *
 * @param itemId - The BasketItem id to delete.
 */
export async function removeBasketItem(
  itemId: number,
): Promise<ApiResponse<Basket>> {
  return apiClient.del<Basket>(`/basket/items/${itemId}`);
}
