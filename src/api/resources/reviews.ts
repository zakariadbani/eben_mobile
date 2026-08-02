/** Reviews resource — product ratings and comments. */

import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Review } from '@/interfaces/Review';
import { getAllPages } from './paginate';
import { assertPositiveId } from './validate';

/**
 * Fetch paginated reviews for a product.
 *
 * @param productId - The product's numeric id.
 */
export async function getReviews(productId: number): Promise<Paginated<Review>> {
  assertPositiveId(productId, 'productId');
  return getAllPages<Review>(`/products/${productId}/reviews`);
}

/**
 * Post a new review for a product.
 * @param productId - The product's numeric id.
 * @param payload   - Rating (1-5) and optional comment.
 */
export async function postReview(
  productId: number,
  payload: { rating: 1 | 2 | 3 | 4 | 5; title: string; comment?: string },
): Promise<ApiResponse<Review>> {
  assertPositiveId(productId, 'productId');
  if (!Number.isSafeInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
    throw new TypeError('rating must be an integer from 1 to 5');
  }
  if (payload.title.trim().length === 0) {
    throw new TypeError('title must not be blank');
  }
  return apiClient.post<Review>(
    `/products/${productId}/reviews`,
    payload,
  );
}
