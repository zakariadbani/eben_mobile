/**
 * Reviews resource — product/offer ratings and comments.
 *
 * MOCK MODE (current): resolves from mockReviews via the registry.
 * SWAP POINT: replace mock entries in registry.ts with real fetch targets
 *   when the backend `/products/:id/reviews` endpoint is live.
 */

import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Review } from '@/interfaces/Review';

/**
 * Fetch paginated reviews for a product.
 *
 * @param productId - The product's numeric id.
 */
export async function getReviews(productId: number): Promise<Paginated<Review>> {
  return apiClient.get<Review>(`/products/${productId}/reviews`) as Promise<Paginated<Review>>;
}

/**
 * Post a new review for a product.
 * Mock mode always resolves with success.
 *
 * @param productId - The product's numeric id.
 * @param payload   - Rating (1-5) and optional comment.
 */
export async function postReview(
  productId: number,
  payload: { rating: 1 | 2 | 3 | 4 | 5; comment?: string },
): Promise<ApiResponse<Review>> {
  return apiClient.post<Review>(
    `/products/${productId}/reviews`,
    payload,
  );
}
