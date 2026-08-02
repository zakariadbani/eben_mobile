/**
 * Wishlist resource — the authenticated user's saved items.
 *
 * MOCK MODE (current): resolves from mockWishlistItems via the registry.
 * SWAP POINT: replace mock entries in registry.ts with real fetch targets
 *   when the backend `/wishlist` endpoint is live.
 */

import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { WishlistItem } from '@/interfaces/Wishlist';
import { getAllPages } from './paginate';

/**
 * Fetch the current user's wishlist.
 */
export async function getWishlist(): Promise<Paginated<WishlistItem>> {
  return getAllPages<WishlistItem>('/wishlist');
}

/**
 * Add a product (by its leaf categoryId) to the wishlist.
 * Mock mode always resolves with success.
 *
 * @param productId - The product's numeric id.
 *                    The backend resolves the leaf categoryId from the product.
 */
export async function addToWishlist(productId: number): Promise<ApiResponse<WishlistItem>> {
  if (!Number.isSafeInteger(productId) || productId < 1) {
    throw new TypeError('productId must be a positive integer');
  }
  return apiClient.post<WishlistItem>('/wishlist/items', { productId });
}

/**
 * Remove a wishlist item by its id.
 * Mock mode: always resolves with success (returns the removed item shell).
 *
 * @param wishlistItemId - The WishlistItem.id to remove.
 */
export async function removeWishlistItem(wishlistItemId: number): Promise<ApiResponse<{ id: number }>> {
  if (!Number.isSafeInteger(wishlistItemId) || wishlistItemId < 1) {
    throw new TypeError('wishlistItemId must be a positive integer');
  }
  return apiClient.del<{ id: number }>(`/wishlist/items/${wishlistItemId}`);
}
